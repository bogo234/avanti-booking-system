import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAdminDb, getUserRole } from '../../../../../lib/firebase-admin';
import { FCMUtils } from '../../../../../lib/firebase-messaging';
import { z } from 'zod';

// Validation schema
const RegisterFCMTokenSchema = z.object({
  fcmToken: z.string().min(1, 'FCM token is required'),
  deviceType: z.enum(['web', 'android', 'ios']).default('web'),
  userAgent: z.string().optional(),
  deviceId: z.string().optional(),
  appVersion: z.string().optional()
});

// Rate limiting för FCM token registration
const fcmRegistrationAttempts = new Map<string, { count: number; resetTime: number }>();
const FCM_REGISTRATION_WINDOW = 60 * 1000; // 1 minute
const MAX_FCM_REGISTRATION_PER_MINUTE = 5;

function checkFCMRegistrationRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = fcmRegistrationAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    fcmRegistrationAttempts.set(uid, { 
      count: 1, 
      resetTime: now + FCM_REGISTRATION_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_FCM_REGISTRATION_PER_MINUTE) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// POST - Register FCM token
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    // Rate limiting
    const rateLimit = checkFCMRegistrationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many FCM registration attempts',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = RegisterFCMTokenSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { fcmToken, deviceType, userAgent, deviceId, appVersion } = validationResult.data;

    // Validera FCM token format
    if (!FCMUtils.isValidFCMToken(fcmToken)) {
      return NextResponse.json(
        { error: 'Invalid FCM token format' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const now = new Date();
    const userRole = await getUserRole(decodedToken.uid);

    // Kontrollera om token redan finns
    const existingTokenQuery = await db.collection('fcm_tokens')
      .where('token', '==', fcmToken)
      .limit(1)
      .get();

    if (!existingTokenQuery.empty) {
      const existingToken = existingTokenQuery.docs[0];
      const existingData = existingToken.data();

      // Om samma användare, uppdatera bara lastUsed
      if (existingData.userId === decodedToken.uid) {
        await existingToken.ref.update({
          lastUsed: now,
          isActive: true,
          userAgent: userAgent || existingData.userAgent,
          appVersion: appVersion || existingData.appVersion,
          updatedAt: now
        });

        return NextResponse.json({
          success: true,
          message: 'FCM token updated',
          tokenId: existingToken.id,
          isNew: false
        });
      } else {
        // Token används av annan användare - inaktivera den gamla
        await existingToken.ref.update({
          isActive: false,
          deactivatedAt: now,
          deactivationReason: 'token_reassigned'
        });
      }
    }

    // Skapa ny token-registrering
    const tokenData = {
      token: fcmToken,
      userId: decodedToken.uid,
      userRole: userRole || 'customer',
      deviceType,
      deviceId: deviceId || null,
      userAgent: userAgent || null,
      appVersion: appVersion || null,
      isActive: true,
      createdAt: now,
      lastUsed: now,
      updatedAt: now,
      metadata: {
        registeredFrom: request.headers.get('x-forwarded-for') || 'unknown',
        registrationMethod: 'api'
      }
    };

    const tokenRef = await db.collection('fcm_tokens').add(tokenData);

    // Inaktivera andra aktiva tokens för samma användare och deviceType
    const userTokensQuery = await db.collection('fcm_tokens')
      .where('userId', '==', decodedToken.uid)
      .where('deviceType', '==', deviceType)
      .where('isActive', '==', true)
      .get();

    const batch = db.batch();
    userTokensQuery.docs.forEach(doc => {
      if (doc.id !== tokenRef.id) {
        batch.update(doc.ref, {
          isActive: false,
          deactivatedAt: now,
          deactivationReason: 'new_token_registered'
        });
      }
    });

    if (!userTokensQuery.empty) {
      await batch.commit();
    }

    // Uppdatera användarens profil med FCM-info
    const userRef = db.collection('users').doc(decodedToken.uid);
    await userRef.update({
      'fcmTokens.current': fcmToken,
      'fcmTokens.lastRegistered': now,
      'fcmTokens.deviceType': deviceType,
      'metadata.fcmTokenRegisteredAt': now,
      'metadata.updatedAt': now
    });

    // Automatisk prenumeration på relevanta topics
    const topicsToSubscribe = ['all-users'];
    
    if (userRole === 'customer') {
      topicsToSubscribe.push('customers', 'booking-updates');
    } else if (userRole === 'driver') {
      topicsToSubscribe.push('drivers', 'booking-updates');
    } else if (userRole === 'admin') {
      topicsToSubscribe.push('admins', 'system-alerts');
    }

    // Spara topic-prenumerationer
    const subscriptionPromises = topicsToSubscribe.map(topic => 
      db.collection('fcm_subscriptions').add({
        userId: decodedToken.uid,
        fcmToken,
        topic,
        subscribed: true,
        createdAt: now
      })
    );

    await Promise.all(subscriptionPromises);

    // Skicka välkomstnotifikation
    try {
      await db.collection('notifications').add({
        userId: decodedToken.uid,
        type: 'system',
        title: 'Push-notifikationer aktiverade',
        message: 'Du kommer nu att få viktiga uppdateringar direkt till din enhet',
        data: {
          type: 'fcm_registration',
          deviceType
        },
        priority: 'low',
        read: false,
        createdAt: now,
        source: 'fcm_system'
      });
    } catch (notificationError) {
      console.error('Failed to send welcome notification:', notificationError);
      // Don't fail the whole operation
    }

    console.log(`FCM token registered for user ${decodedToken.uid} (${deviceType})`);

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      tokenId: tokenRef.id,
      isNew: true,
      subscribedTopics: topicsToSubscribe
    });

  } catch (error: any) {
    console.error('FCM token registration error:', {
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
      { error: 'Failed to register FCM token' },
      { status: 500 }
    );
  }
}

// DELETE - Unregister FCM token
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);

    const { searchParams } = new URL(request.url);
    const fcmToken = searchParams.get('token');

    if (!fcmToken) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const now = new Date();

    // Hitta token
    const tokenQuery = await db.collection('fcm_tokens')
      .where('token', '==', fcmToken)
      .where('userId', '==', decodedToken.uid)
      .limit(1)
      .get();

    if (tokenQuery.empty) {
      return NextResponse.json(
        { error: 'FCM token not found' },
        { status: 404 }
      );
    }

    const tokenDoc = tokenQuery.docs[0];

    // Inaktivera token
    await tokenDoc.ref.update({
      isActive: false,
      deactivatedAt: now,
      deactivationReason: 'user_unregistered'
    });

    // Ta bort topic-prenumerationer
    const subscriptionsQuery = await db.collection('fcm_subscriptions')
      .where('fcmToken', '==', fcmToken)
      .where('userId', '==', decodedToken.uid)
      .get();

    const batch = db.batch();
    subscriptionsQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        subscribed: false,
        unsubscribedAt: now
      });
    });

    if (!subscriptionsQuery.empty) {
      await batch.commit();
    }

    // Uppdatera användarens profil
    const userRef = db.collection('users').doc(decodedToken.uid);
    await userRef.update({
      'fcmTokens.current': null,
      'fcmTokens.lastUnregistered': now,
      'metadata.fcmTokenUnregisteredAt': now,
      'metadata.updatedAt': now
    });

    console.log(`FCM token unregistered for user ${decodedToken.uid}`);

    return NextResponse.json({
      success: true,
      message: 'FCM token unregistered successfully',
      tokenId: tokenDoc.id
    });

  } catch (error: any) {
    console.error('FCM token unregistration error:', {
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
      { error: 'Failed to unregister FCM token' },
      { status: 500 }
    );
  }
}
