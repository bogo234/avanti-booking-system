import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, verifyAuthToken } from '../../../../lib/firebase-admin';
import { z } from 'zod';

// Validation schema för email-verifiering
const EmailVerificationRequestSchema = z.object({
  email: z.string().email('Invalid email address').optional()
});

// Rate limiting för email-verifiering
const emailVerificationAttempts = new Map<string, { count: number; resetTime: number; lastSent: number }>();
const EMAIL_VERIFICATION_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_EMAIL_VERIFICATIONS_PER_HOUR = 5;
const MIN_INTERVAL_BETWEEN_EMAILS = 2 * 60 * 1000; // 2 minutes mellan emails

function checkEmailVerificationRateLimit(uid: string): { allowed: boolean; resetTime?: number; nextAllowedTime?: number; reason?: string } {
  const now = Date.now();
  const userAttempts = emailVerificationAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    emailVerificationAttempts.set(uid, { 
      count: 1, 
      resetTime: now + EMAIL_VERIFICATION_WINDOW,
      lastSent: now
    });
    return { allowed: true };
  }
  
  // Kontrollera minimum interval mellan emails
  const timeSinceLastEmail = now - userAttempts.lastSent;
  if (timeSinceLastEmail < MIN_INTERVAL_BETWEEN_EMAILS) {
    const nextAllowedTime = userAttempts.lastSent + MIN_INTERVAL_BETWEEN_EMAILS;
    return { 
      allowed: false, 
      nextAllowedTime,
      reason: `Please wait ${Math.ceil((nextAllowedTime - now) / 1000)} seconds before requesting another email`
    };
  }
  
  // Kontrollera max antal per timme
  if (userAttempts.count >= MAX_EMAIL_VERIFICATIONS_PER_HOUR) {
    return { 
      allowed: false, 
      resetTime: userAttempts.resetTime,
      reason: 'Too many verification emails sent. Try again later.'
    };
  }
  
  userAttempts.count++;
  userAttempts.lastSent = now;
  return { allowed: true };
}

// Cleanup gamla rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [uid, attempts] of emailVerificationAttempts.entries()) {
    if (now > attempts.resetTime) {
      emailVerificationAttempts.delete(uid);
    }
  }
}, 10 * 60 * 1000); // Cleanup varje 10 minuter

// POST - Skicka verifieringsmail
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Rate limiting
    const rateLimit = checkEmailVerificationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const waitTime = rateLimit.nextAllowedTime 
        ? Math.ceil((rateLimit.nextAllowedTime - Date.now()) / 1000)
        : rateLimit.resetTime 
        ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        : 0;
        
      return NextResponse.json(
        { 
          error: rateLimit.reason || 'Too many requests',
          waitTime: waitTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': waitTime.toString()
          }
        }
      );
    }

    const requestData = await request.json().catch(() => ({}));
    
    // Validera input (email är optional eftersom vi kan använda token)
    const validationResult = EmailVerificationRequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    
    // Hämta användarinformation
    const user = await adminAuth.getUser(decodedToken.uid);
    
    if (user.emailVerified) {
      return NextResponse.json(
        { 
          error: 'Email is already verified',
          verified: true
        },
        { status: 400 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'User has no email address' },
        { status: 400 }
      );
    }

    // Generera säker verifieringslänk
    const verificationLink = await adminAuth.generateEmailVerificationLink(
      user.email,
      {
        url: `${process.env.NEXTAUTH_URL}/auth?verified=true&uid=${decodedToken.uid}`,
        handleCodeInApp: true
      }
    );

    // Uppdatera metadata i Firestore
    await db.collection('users').doc(decodedToken.uid).update({
      'metadata.emailVerificationSentAt': new Date(),
      'metadata.emailVerificationAttempts': db.collection('users').doc(decodedToken.uid).get().then(doc => {
        const data = doc.data();
        return (data?.metadata?.emailVerificationAttempts || 0) + 1;
      }),
      'metadata.updatedAt': new Date()
    });

    // I produktion skulle du skicka email via en professionell email-service här
    // Som SendGrid, AWS SES, eller liknande
    console.log(`Email verification sent to: ${user.email} for user: ${decodedToken.uid}`, {
      timestamp: new Date().toISOString(),
      verificationLink: verificationLink, // I produktion, logga INTE länken
      userAgent: request.headers.get('user-agent')
    });

    // Simulera email-skickning för development
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n📧 EMAIL VERIFICATION LINK (Development Only):\n${verificationLink}\n`);
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Maskerad email för säkerhet
      expiresIn: '24 hours'
    });

  } catch (error: any) {
    console.error('Email verification send error:', {
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

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}

// PUT - Kontrollera och uppdatera email-verifieringsstatus
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    
    // Hämta uppdaterad användarinformation från Firebase Auth
    const user = await adminAuth.getUser(decodedToken.uid);
    
    // Hämta nuvarande användardata från Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const wasVerified = userData.emailVerified === true;
    const isNowVerified = user.emailVerified;

    // Om status har ändrats från inte verifierad till verifierad
    if (!wasVerified && isNowVerified) {
      // Uppdatera status i Firestore
      const updateData: any = {
        emailVerified: true,
        'metadata.emailVerifiedAt': new Date(),
        'metadata.updatedAt': new Date()
      };

      // Om användaren var i pending_verification status, aktivera kontot
      if (userData.status === 'pending_verification') {
        updateData.status = 'active';
        updateData['metadata.accountActivatedAt'] = new Date();
      }

      await db.collection('users').doc(decodedToken.uid).update(updateData);

      // Audit log
      console.log(`Email verified for user: ${decodedToken.uid}`, {
        email: user.email,
        previousStatus: userData.status,
        newStatus: updateData.status || userData.status,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Email verified successfully',
        statusChanged: userData.status === 'pending_verification',
        newStatus: updateData.status || userData.status
      });
    }

    // Om redan verifierad
    if (isNowVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Email is already verified',
        verifiedAt: userData.metadata?.emailVerifiedAt
      });
    }

    // Om inte verifierad än
    return NextResponse.json({
      success: true,
      verified: false,
      message: 'Email not yet verified',
      emailSentAt: userData.metadata?.emailVerificationSentAt,
      canResendAt: userData.metadata?.emailVerificationSentAt ? 
        new Date(userData.metadata.emailVerificationSentAt.toDate().getTime() + MIN_INTERVAL_BETWEEN_EMAILS) : 
        new Date()
    });

  } catch (error: any) {
    console.error('Email verification check error:', {
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
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}

// GET - Hämta email-verifieringsstatus och statistik
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    
    // Hämta användarinformation
    const user = await adminAuth.getUser(decodedToken.uid);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Kontrollera rate limiting status
    const rateLimit = checkEmailVerificationRateLimit(decodedToken.uid);
    
    const response = {
      success: true,
      emailVerified: user.emailVerified,
      email: user.email ? user.email.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
      status: userData.status,
      metadata: {
        emailVerificationSentAt: userData.metadata?.emailVerificationSentAt,
        emailVerifiedAt: userData.metadata?.emailVerifiedAt,
        emailVerificationAttempts: userData.metadata?.emailVerificationAttempts || 0
      },
      rateLimiting: {
        canSendNow: rateLimit.allowed,
        nextAllowedTime: rateLimit.nextAllowedTime,
        resetTime: rateLimit.resetTime,
        attemptsRemaining: rateLimit.allowed ? 
          MAX_EMAIL_VERIFICATIONS_PER_HOUR - (emailVerificationAttempts.get(decodedToken.uid)?.count || 0) : 
          0
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Email verification status error:', {
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
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
