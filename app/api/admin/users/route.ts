import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth, verifyAuthToken, getUserRole } from '../../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const UserUpdateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  updates: z.object({
    role: z.enum(['customer', 'driver', 'admin']).optional(),
    status: z.enum(['active', 'suspended', 'banned']).optional(),
    profile: z.object({
      name: z.string().min(1).max(100).optional(),
      phone: z.string().optional(),
      address: z.string().max(200).optional()
    }).optional(),
    driverData: z.object({
      car: z.string().max(50).optional(),
      licensePlate: z.string().max(20).optional(),
      licenseNumber: z.string().max(50).optional(),
      verified: z.boolean().optional()
    }).optional()
  })
});

const UserSearchSchema = z.object({
  query: z.string().optional(),
  role: z.enum(['customer', 'driver', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

// Rate limiting för admin actions
const adminActionAttempts = new Map<string, { count: number; resetTime: number }>();
const ADMIN_ACTION_WINDOW = 60 * 1000; // 1 minute
const MAX_ADMIN_ACTIONS_PER_MINUTE = 50; // Higher limit for admin operations

function checkAdminActionRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = adminActionAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    adminActionAttempts.set(uid, { 
      count: 1, 
      resetTime: now + ADMIN_ACTION_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_ADMIN_ACTIONS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// GET - Hämta användare med sökning och filtrering
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är admin
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkAdminActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many admin actions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      query: searchParams.get('query') || undefined,
      role: searchParams.get('role') as 'customer' | 'driver' | 'admin' | undefined,
      status: searchParams.get('status') as 'active' | 'suspended' | 'banned' | undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    };

    // Validera query parameters
    const validationResult = UserSearchSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { query, role, status, page, limit } = validationResult.data;
    const offset = (page - 1) * limit;

    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    // Bygg Firestore query
    let usersQuery = db.collection('users');

    // Filtrera på roll
    if (role) {
      usersQuery = usersQuery.where('role', '==', role);
    }

    // Filtrera på status
    if (status) {
      usersQuery = usersQuery.where('status', '==', status);
    }

    // Ordna och begränsa
    usersQuery = usersQuery.orderBy('metadata.createdAt', 'desc');

    // Hämta data
    const snapshot = await usersQuery.get();
    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Textfiltrering (görs efter Firestore query för flexibilitet)
    if (query) {
      const searchTerm = query.toLowerCase();
      users = users.filter(user => 
        (user.profile?.name?.toLowerCase().includes(searchTerm)) ||
        (user.email?.toLowerCase().includes(searchTerm)) ||
        (user.profile?.phone?.includes(searchTerm)) ||
        (user.id.toLowerCase().includes(searchTerm))
      );
    }

    // Paginering (görs efter filtrering)
    const totalUsers = users.length;
    const paginatedUsers = users.slice(offset, offset + limit);

    // Hämta ytterligare Firebase Auth data för varje användare
    const enrichedUsers = await Promise.all(
      paginatedUsers.map(async (user) => {
        try {
          const authUser = await adminAuth.getUser(user.id);
          return {
            ...user,
            emailVerified: authUser.emailVerified,
            disabled: authUser.disabled,
            lastSignIn: authUser.metadata.lastSignInTime,
            creationTime: authUser.metadata.creationTime,
            providerData: authUser.providerData.map(p => ({
              providerId: p.providerId,
              uid: p.uid
            }))
          };
        } catch (error) {
          // Om användaren inte finns i Auth, returnera bara Firestore data
          return {
            ...user,
            authError: 'User not found in Firebase Auth'
          };
        }
      })
    );

    // Hämta statistik
    const statsQuery = await db.collection('users').get();
    const allUsers = statsQuery.docs.map(doc => doc.data());
    
    const statistics = {
      total: allUsers.length,
      customers: allUsers.filter(u => u.role === 'customer').length,
      drivers: allUsers.filter(u => u.role === 'driver').length,
      admins: allUsers.filter(u => u.role === 'admin').length,
      active: allUsers.filter(u => u.status === 'active' || !u.status).length,
      suspended: allUsers.filter(u => u.status === 'suspended').length,
      banned: allUsers.filter(u => u.status === 'banned').length
    };

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        hasMore: offset + limit < totalUsers
      },
      statistics,
      filters: {
        query: query || null,
        role: role || null,
        status: status || null
      }
    });

  } catch (error: any) {
    console.error('Admin users GET error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera användare
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är admin
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkAdminActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many admin actions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = UserUpdateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { userId, updates } = validationResult.data;
    
    // Förhindra att admin ändrar sin egen roll eller status
    if (userId === decodedToken.uid && (updates.role || updates.status)) {
      return NextResponse.json(
        { error: 'Cannot modify your own role or status' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const adminAuth = getAdminAuth();
    const now = new Date();

    // Kontrollera att användaren existerar
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentUserData = userDoc.data()!;

    // Bygg uppdateringsdata
    const updateData: any = {
      'metadata.updatedAt': now,
      'metadata.updatedBy': decodedToken.uid
    };

    // Uppdatera roll
    if (updates.role && updates.role !== currentUserData.role) {
      updateData.role = updates.role;
      updateData['metadata.roleChangedAt'] = now;
      updateData['metadata.roleChangedBy'] = decodedToken.uid;
      updateData['metadata.previousRole'] = currentUserData.role;
    }

    // Uppdatera status
    if (updates.status && updates.status !== currentUserData.status) {
      updateData.status = updates.status;
      updateData['metadata.statusChangedAt'] = now;
      updateData['metadata.statusChangedBy'] = decodedToken.uid;
      updateData['metadata.previousStatus'] = currentUserData.status;

      // Om användaren bannlyses eller suspenderas, inaktivera i Firebase Auth
      if (updates.status === 'banned' || updates.status === 'suspended') {
        try {
          await adminAuth.updateUser(userId, { disabled: true });
        } catch (authError) {
          console.warn(`Failed to disable user ${userId} in Firebase Auth:`, authError);
        }
      } else if (updates.status === 'active') {
        try {
          await adminAuth.updateUser(userId, { disabled: false });
        } catch (authError) {
          console.warn(`Failed to enable user ${userId} in Firebase Auth:`, authError);
        }
      }
    }

    // Uppdatera profil
    if (updates.profile) {
      Object.keys(updates.profile).forEach(key => {
        if (updates.profile![key as keyof typeof updates.profile] !== undefined) {
          updateData[`profile.${key}`] = updates.profile![key as keyof typeof updates.profile];
        }
      });
    }

    // Uppdatera förardata (endast för förare)
    if (updates.driverData && (currentUserData.role === 'driver' || updates.role === 'driver')) {
      Object.keys(updates.driverData).forEach(key => {
        if (updates.driverData![key as keyof typeof updates.driverData] !== undefined) {
          updateData[`driverData.${key}`] = updates.driverData![key as keyof typeof updates.driverData];
        }
      });
    }

    // Uppdatera i Firestore
    await db.collection('users').doc(userId).update(updateData);

    // Skapa audit log
    await db.collection('admin_audit_logs').add({
      adminId: decodedToken.uid,
      action: 'user_update',
      targetUserId: userId,
      changes: updates,
      timestamp: now,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Hämta uppdaterad användardata
    const updatedUserDoc = await db.collection('users').doc(userId).get();
    const updatedUser = { id: updatedUserDoc.id, ...updatedUserDoc.data() };

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
      changes: Object.keys(updateData).filter(key => !key.startsWith('metadata'))
    });

  } catch (error: any) {
    console.error('Admin user update error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Ta bort användare (GDPR-compliant)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Kontrollera att användaren är admin
    const userRole = await getUserRole(decodedToken.uid);
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkAdminActionRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many admin actions',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Förhindra att admin tar bort sig själv
    if (userId === decodedToken.uid) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const adminAuth = getAdminAuth();
    const now = new Date();

    // Kontrollera att användaren existerar
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;

    // GDPR-compliant anonymization istället för total borttagning
    const anonymizedData = {
      email: `deleted-${userId}@anonymized.local`,
      profile: {
        name: 'Deleted User',
        phone: null,
        address: null
      },
      status: 'deleted',
      role: userData.role, // Behåll för statistik
      metadata: {
        ...userData.metadata,
        deletedAt: now,
        deletedBy: decodedToken.uid,
        originalEmail: userData.email // För audit trail
      }
    };

    // Anonymisera i Firestore
    await db.collection('users').doc(userId).update(anonymizedData);

    // Ta bort från Firebase Auth
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError) {
      console.warn(`Failed to delete user ${userId} from Firebase Auth:`, authError);
      // Fortsätt ändå, anonymiseringen i Firestore är viktigast
    }

    // Anonymisera relaterade bokningar
    const bookingsQuery = await db.collection('bookings')
      .where('customerId', '==', userId)
      .get();

    const batch = db.batch();
    bookingsQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        'customer.name': 'Deleted User',
        'customer.email': null,
        'customer.phone': null,
        'metadata.customerDeleted': true,
        'metadata.customerDeletedAt': now
      });
    });

    if (!bookingsQuery.empty) {
      await batch.commit();
    }

    // Skapa audit log
    await db.collection('admin_audit_logs').add({
      adminId: decodedToken.uid,
      action: 'user_delete',
      targetUserId: userId,
      originalData: {
        email: userData.email,
        role: userData.role,
        name: userData.profile?.name
      },
      timestamp: now,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted and data anonymized successfully',
      deletedUserId: userId
    });

  } catch (error: any) {
    console.error('Admin user delete error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}