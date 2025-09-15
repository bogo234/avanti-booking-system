import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb, getUserRole } from '../../../../lib/firebase-admin';

type BookingStatus = 'waiting' | 'accepted' | 'on_way' | 'arrived' | 'completed' | 'cancelled';

interface UpdateRequestBody {
  bookingId: string;
  newStatus: BookingStatus;
}

/**
 * Allowed status transitions with role checks:
 * - waiting -> accepted: driver (self) or admin. On driver: assign self and set driver busy.
 * - waiting -> cancelled: owner (customer) or driver (reject) or admin.
 * - accepted -> on_way: assigned driver or admin.
 * - on_way -> arrived: assigned driver or admin.
 * - arrived -> completed: assigned driver or admin. On complete: set driver available.
 * - accepted -> waiting: admin only (unassign). On unassign: clear driver and set driver available.
 */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateRequestBody;
    const { bookingId, newStatus } = body;

    if (!bookingId || !newStatus) {
      return NextResponse.json({ error: 'bookingId and newStatus are required' }, { status: 400 });
    }

    const decoded = await verifyAuthToken(request.headers.get('authorization'));
    const role = await getUserRole(decoded.uid);
    if (!role) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 });
    }

    const db = getAdminDb();
    const bookingRef = db.collection('bookings').doc(bookingId);

    const result = await db.runTransaction(async (tx) => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) {
        throw new Error('Booking not found');
      }
      const booking = bookingSnap.data() as any;

      const currentStatus: BookingStatus = booking.status as BookingStatus;
      const isOwner = booking.customerId === decoded.uid;
      const isAssignedDriver = booking?.driver?.id === decoded.uid;
      const isAdmin = role === 'admin';

      function ensure(cond: boolean, msg: string) {
        if (!cond) throw new Error(msg);
      }

      // Validate transition and permissions
      switch (`${currentStatus}->${newStatus}`) {
        case 'waiting->accepted': {
          ensure(isAssignedDriver || isAdmin || role === 'driver', 'Not allowed to accept');
          // Assign driver when a driver accepts
          if (!isAdmin) {
            // driver is accepting: must attach self
            const driverRef = db.collection('drivers').doc(decoded.uid);
            const driverSnap = await tx.get(driverRef);
            ensure(driverSnap.exists, 'Driver not found');
            const driverData = driverSnap.data() as any;
            ensure(driverData.status === 'available', 'Driver not available');
            tx.update(driverRef, { status: 'busy', updatedAt: new Date() });
            tx.update(bookingRef, {
              status: 'accepted',
              driver: {
                id: decoded.uid,
                name: driverData.name,
                phone: driverData.phone,
                car: driverData.car,
                licensePlate: driverData.licensePlate,
                location: driverData.location || null,
              },
              updatedAt: new Date(),
            });
          } else {
            // Admin can accept only if driver already set by other means
            if (!booking?.driver?.id) {
              throw new Error('Admin accept requires pre-assigned driver');
            }
            const driverRef = db.collection('drivers').doc(booking.driver.id);
            tx.update(driverRef, { status: 'busy', updatedAt: new Date() });
            tx.update(bookingRef, { status: 'accepted', updatedAt: new Date() });
          }
          break;
        }
        case 'waiting->cancelled': {
          ensure(isOwner || isAdmin || role === 'driver', 'Not allowed to cancel');
          tx.update(bookingRef, { status: 'cancelled', updatedAt: new Date() });
          break;
        }
        case 'accepted->on_way':
        case 'on_way->arrived':
        case 'arrived->completed': {
          ensure(isAssignedDriver || isAdmin, 'Not allowed to update status');
          tx.update(bookingRef, { status: newStatus, updatedAt: new Date() });
          if (newStatus === 'completed' && booking?.driver?.id) {
            const driverRef = db.collection('drivers').doc(booking.driver.id);
            tx.update(driverRef, { status: 'available', updatedAt: new Date() });
          }
          break;
        }
        case 'accepted->waiting': {
          ensure(isAdmin, 'Only admin can unassign');
          // set driver available and clear driver from booking
          if (booking?.driver?.id) {
            const driverRef = db.collection('drivers').doc(booking.driver.id);
            tx.update(driverRef, { status: 'available', updatedAt: new Date() });
          }
          tx.update(bookingRef, {
            status: 'waiting',
            driver: null,
            updatedAt: new Date(),
          });
          break;
        }
        default:
          throw new Error('Invalid status transition');
      }

      return { ok: true };
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to update booking status';
    console.error('Booking status update error:', error);
    const status = message === 'Booking not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}


