import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken } from '../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schemas
const NotificationQuerySchema = z.object({
  unreadOnly: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  type: z.enum(['booking', 'system', 'payment', 'driver', 'admin']).optional()
});

const NotificationUpdateSchema = z.object({
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID required'),
  action: z.enum(['read', 'unread', 'delete'])
});

const SendNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['booking', 'system', 'payment', 'driver', 'admin']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  data: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
});

// Rate limiting för notification requests
const notificationRequestAttempts = new Map<string, { count: number; resetTime: number }>();
const NOTIFICATION_REQUEST_WINDOW = 60 * 1000; // 1 minute
const MAX_NOTIFICATION_REQUESTS_PER_MINUTE = 30;

function checkNotificationRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = notificationRequestAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    notificationRequestAttempts.set(uid, { 
      count: 1, 
      resetTime: now + NOTIFICATION_REQUEST_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_NOTIFICATION_REQUESTS_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// GET - Hämta användarens notifikationer
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkNotificationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many notification requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      type: searchParams.get('type') as any
    };

    // Validera query parameters
    const validationResult = NotificationQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { unreadOnly, limit, offset, type } = validationResult.data;

    const db = getAdminDb();

    // Bygg Firestore query
    let notificationsQuery = db.collection('notifications')
      .where('userId', '==', decodedToken.uid);

    // Filtrera på typ
    if (type) {
      notificationsQuery = notificationsQuery.where('type', '==', type);
    }

    // Filtrera på lässtatus
    if (unreadOnly) {
      notificationsQuery = notificationsQuery.where('read', '==', false);
    }

    // Ordna efter skapelsedatum (nyast först)
    notificationsQuery = notificationsQuery.orderBy('createdAt', 'desc');

    // Begränsa resultat
    if (offset > 0) {
      const offsetSnapshot = await notificationsQuery.limit(offset).get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        notificationsQuery = notificationsQuery.startAfter(lastDoc);
      }
    }

    notificationsQuery = notificationsQuery.limit(limit);

    // Hämta notifikationer
    const snapshot = await notificationsQuery.get();
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));

    // Räkna totalt antal och olästa
    const totalQuery = await db.collection('notifications')
      .where('userId', '==', decodedToken.uid)
      .get();

    const unreadQuery = await db.collection('notifications')
      .where('userId', '==', decodedToken.uid)
      .where('read', '==', false)
      .get();

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        offset,
        limit,
        hasMore: notifications.length === limit
      },
      counts: {
        total: totalQuery.size,
        unread: unreadQuery.size
      }
    });

  } catch (error: any) {
    console.error('Notifications GET error:', {
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
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera notifikationer (markera som läst/oläst/ta bort)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkNotificationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many notification requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = NotificationUpdateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { notificationIds, action } = validationResult.data;

    const db = getAdminDb();
    const now = new Date();

    // Kontrollera att alla notifikationer tillhör användaren
    const notificationPromises = notificationIds.map(id => 
      db.collection('notifications').doc(id).get()
    );
    
    const notificationDocs = await Promise.all(notificationPromises);
    
    for (const doc of notificationDocs) {
      if (!doc.exists) {
        return NextResponse.json(
          { error: 'One or more notifications not found' },
          { status: 404 }
        );
      }
      
      if (doc.data()!.userId !== decodedToken.uid) {
        return NextResponse.json(
          { error: 'Access denied to one or more notifications' },
          { status: 403 }
        );
      }
    }

    // Utför åtgärden
    const batch = db.batch();
    let updatedCount = 0;

    if (action === 'delete') {
      // Ta bort notifikationer
      notificationDocs.forEach(doc => {
        batch.delete(doc.ref);
        updatedCount++;
      });
    } else {
      // Uppdatera lässtatus
      const readStatus = action === 'read';
      
      notificationDocs.forEach(doc => {
        batch.update(doc.ref, {
          read: readStatus,
          updatedAt: now,
          ...(readStatus && { readAt: now })
        });
        updatedCount++;
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${updatedCount} notifications ${action === 'delete' ? 'deleted' : `marked as ${action}`}`,
      updatedCount,
      action
    });

  } catch (error: any) {
    console.error('Notifications PUT error:', {
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
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// POST - Skicka notifikation (endast för admin eller systemfunktioner)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Kontrollera behörighet för att skicka notifikationer
    // Antingen admin eller systemfunktioner (API-nycklar kan läggas till senare)
    const userDoc = await getAdminDb().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required to send notifications.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimit = checkNotificationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many notification requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = SendNotificationSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { userId, type, title, message, data, priority } = validationResult.data;

    // Kontrollera att mottagaren existerar
    const recipientDoc = await getAdminDb().collection('users').doc(userId).get();
    if (!recipientDoc.exists) {
      return NextResponse.json(
        { error: 'Recipient user not found' },
        { status: 404 }
      );
    }

    const db = getAdminDb();
    const now = new Date();

    // Skapa notifikation
    const notification = {
      userId,
      type,
      title,
      message,
      data: data || {},
      priority,
      read: false,
      createdAt: now,
      sentBy: decodedToken.uid,
      source: 'admin'
    };

    const notificationRef = await db.collection('notifications').add(notification);

    // TODO: Implementera push notifications via Firebase Cloud Messaging
    // Detta kan utökas för att skicka push notifications till mobila enheter

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      notificationId: notificationRef.id,
      recipient: userId,
      type,
      title
    });

  } catch (error: any) {
    console.error('Notifications POST error:', {
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
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

// DELETE - Ta bort alla notifikationer för användaren
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkNotificationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many notification requests',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const readOnly = searchParams.get('readOnly') === 'true';

    const db = getAdminDb();

    // Bygg query
    let deleteQuery = db.collection('notifications')
      .where('userId', '==', decodedToken.uid);

    if (readOnly) {
      deleteQuery = deleteQuery.where('read', '==', true);
    }

    // Hämta notifikationer att ta bort
    const snapshot = await deleteQuery.get();
    
    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No notifications to delete',
        deletedCount: 0
      });
    }

    // Ta bort i batches (Firestore batch limit är 500)
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} notifications deleted`,
      deletedCount,
      type: readOnly ? 'read notifications only' : 'all notifications'
    });

  } catch (error: any) {
    console.error('Notifications DELETE error:', {
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
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
