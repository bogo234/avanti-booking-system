import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyAuthToken, getUserRole } from '../../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schema för profiluppdateringar
const ProfileUpdateSchema = z.object({
  profile: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional(),
    phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number format').optional(),
    preferences: z.object({
      defaultAddresses: z.object({
        home: z.object({
          address: z.string().max(200, 'Address too long'),
          coordinates: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180)
          }).optional()
        }).optional(),
        work: z.object({
          address: z.string().max(200, 'Address too long'),
          coordinates: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180)
          }).optional()
        }).optional()
      }).optional(),
      notifications: z.object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean()
      }).optional(),
      language: z.enum(['sv', 'en']).optional()
    }).optional()
  }).optional()
});

// Rate limiting map - I produktion skulle detta vara Redis eller liknande
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(uid);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(uid, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true };
}

// Cleanup gamla rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [uid, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(uid);
    }
  }
}, 5 * 60 * 1000); // Cleanup varje 5 minuter

// GET - Hämta användarprofil
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Rate limiting
    const rateLimit = checkRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many requests. Try again later.',
          resetIn: resetTimeSeconds
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTimeSeconds.toString()
          }
        }
      );
    }

    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    
    // Filtrera bort känslig information
    const safeUserData = {
      uid: userData?.uid,
      email: userData?.email,
      emailVerified: userData?.emailVerified,
      displayName: userData?.displayName,
      role: userData?.role,
      profile: userData?.profile,
      status: userData?.status,
      metadata: {
        createdAt: userData?.metadata?.createdAt,
        updatedAt: userData?.metadata?.updatedAt,
        lastLogin: userData?.metadata?.lastLogin,
        emailVerifiedAt: userData?.metadata?.emailVerifiedAt
      }
    };

    return NextResponse.json({
      success: true,
      user: safeUserData
    });

  } catch (error: any) {
    console.error('Profile GET error:', {
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

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Token expired. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera användarprofil
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Rate limiting
    const rateLimit = checkRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many requests. Try again later.',
          resetIn: resetTimeSeconds
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTimeSeconds.toString()
          }
        }
      );
    }

    const requestData = await request.json();
    
    // Validera input
    const validationResult = ProfileUpdateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { profile } = validationResult.data;
    
    const db = getAdminDb();
    const userRef = db.collection('users').doc(decodedToken.uid);
    
    // Kontrollera att användaren existerar
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Bygg uppdateringsdata
    const updateData: any = {
      'metadata.updatedAt': new Date()
    };

    if (profile) {
      // Djup merge av nested objekt
      if (profile.name !== undefined) {
        updateData['profile.name'] = profile.name;
      }
      
      if (profile.phone !== undefined) {
        updateData['profile.phone'] = profile.phone;
      }
      
      if (profile.preferences) {
        const prefs = profile.preferences;
        
        if (prefs.defaultAddresses) {
          if (prefs.defaultAddresses.home !== undefined) {
            updateData['profile.preferences.defaultAddresses.home'] = prefs.defaultAddresses.home;
          }
          if (prefs.defaultAddresses.work !== undefined) {
            updateData['profile.preferences.defaultAddresses.work'] = prefs.defaultAddresses.work;
          }
        }
        
        if (prefs.notifications) {
          Object.keys(prefs.notifications).forEach(key => {
            updateData[`profile.preferences.notifications.${key}`] = prefs.notifications![key as keyof typeof prefs.notifications];
          });
        }
        
        if (prefs.language !== undefined) {
          updateData['profile.preferences.language'] = prefs.language;
        }
      }
    }

    await userRef.update(updateData);

    // Audit log för säkerhet
    console.log(`Profile updated for user: ${decodedToken.uid}`, {
      updatedFields: Object.keys(updateData).filter(key => key !== 'metadata.updatedAt'),
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Profile PUT error:', {
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

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Token expired. Please log in again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// DELETE - Ta bort användarkonto (GDPR-compliance)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Rate limiting för account deletion (striktare)
    const deleteRateLimit = checkRateLimit(`delete_${decodedToken.uid}`);
    if (!deleteRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many deletion attempts. Contact support.' },
        { status: 429 }
      );
    }

    const { confirmDelete } = await request.json();
    
    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { error: 'Account deletion requires explicit confirmation' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    
    // Anonymisera användardata istället för att ta bort helt (GDPR Article 17)
    const userRef = db.collection('users').doc(decodedToken.uid);
    const userData = await userRef.get();
    
    if (!userData.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Spara original data för audit trail
    const originalData = userData.data();
    
    await userRef.update({
      email: '[DELETED]',
      displayName: '[DELETED]',
      'profile.name': '[DELETED]',
      'profile.phone': '[DELETED]',
      'profile.preferences.defaultAddresses': {},
      status: 'deleted',
      'metadata.deletedAt': new Date(),
      'metadata.updatedAt': new Date(),
      'metadata.originalEmail': originalData?.email, // För audit trail
      'metadata.deletionReason': 'user_request'
    });

    // Anonymisera relaterade bokningar
    const bookingsQuery = db.collection('bookings').where('customerId', '==', decodedToken.uid);
    const bookingsSnapshot = await bookingsQuery.get();
    
    if (!bookingsSnapshot.empty) {
      const batch = db.batch();
      bookingsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          'customer.email': '[DELETED]',
          'customer.name': '[DELETED]',
          'customer.phone': '[DELETED]',
          'metadata.customerDeleted': new Date()
        });
      });
      await batch.commit();
    }

    // Audit log för GDPR compliance
    console.log(`Account deleted for user: ${decodedToken.uid}`, {
      originalEmail: originalData?.email,
      bookingsAnonymized: bookingsSnapshot.size,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      reason: 'user_request'
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
      details: {
        bookingsAnonymized: bookingsSnapshot.size,
        dataRetention: 'Personal data anonymized in compliance with GDPR'
      }
    });

  } catch (error: any) {
    console.error('Profile DELETE error:', {
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
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
