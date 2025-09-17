import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, verifyAuthToken } from '../../../../lib/firebase-admin';
import { authRateLimit } from '../../../../lib/rate-limit';
import { z } from 'zod';

// Validation schema för session-operationer
const SessionValidationSchema = z.object({
  action: z.enum(['refresh', 'revoke', 'revoke_all']),
  deviceInfo: z.object({
    userAgent: z.string().optional(),
    platform: z.string().optional(),
    location: z.string().optional()
  }).optional()
});

// Session metadata för tracking
interface SessionMetadata {
  uid: string;
  email: string;
  role: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    ip?: string;
    location?: string;
  };
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

// In-memory session store (I produktion: Redis eller databas)
const activeSessions = new Map<string, SessionMetadata>();
const userSessions = new Map<string, Set<string>>(); // uid -> Set<sessionId>

// Rate limiting för session-operationer
const sessionOperationAttempts = new Map<string, { count: number; resetTime: number }>();
const SESSION_OPERATION_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_SESSION_OPERATIONS_PER_WINDOW = 20;

function checkSessionOperationRateLimit(uid: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const userAttempts = sessionOperationAttempts.get(uid);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    sessionOperationAttempts.set(uid, { 
      count: 1, 
      resetTime: now + SESSION_OPERATION_WINDOW 
    });
    return { allowed: true };
  }
  
  if (userAttempts.count >= MAX_SESSION_OPERATIONS_PER_WINDOW) {
    return { allowed: false, resetTime: userAttempts.resetTime };
  }
  
  userAttempts.count++;
  return { allowed: true };
}

// Cleanup expired sessions
function cleanupExpiredSessions() {
  const now = new Date();
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      // Ta bort från aktivsessions
      activeSessions.delete(sessionId);
      
      // Ta bort från användarsessions
      const userSessionSet = userSessions.get(session.uid);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          userSessions.delete(session.uid);
        }
      }
    }
  }
}

// Kör cleanup varje 10 minuter
setInterval(cleanupExpiredSessions, 10 * 60 * 1000);

// Generera session ID
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

// Extrahera device info från request
function extractDeviceInfo(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
  
  // Enkel platform detection
  let platform = 'unknown';
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    platform = 'mobile';
  } else if (userAgent.includes('iPad') || userAgent.includes('iPhone')) {
    platform = 'ios';
  } else if (userAgent.includes('Windows')) {
    platform = 'windows';
  } else if (userAgent.includes('Mac')) {
    platform = 'mac';
  } else if (userAgent.includes('Linux')) {
    platform = 'linux';
  }

  return {
    userAgent: userAgent.substring(0, 200), // Begränsa längd
    platform,
    ip: ip.substring(0, 45) // IPv6 max length
  };
}

// POST - Skapa eller uppdatera session
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Rate limiting
    const rateLimit = checkSessionOperationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      const resetTimeSeconds = rateLimit.resetTime ? Math.ceil((rateLimit.resetTime - Date.now()) / 1000) : 0;
      return NextResponse.json(
        { 
          error: 'Too many session operations',
          resetIn: resetTimeSeconds
        },
        { status: 429 }
      );
    }

    const requestData = await request.json().catch(() => ({}));
    const deviceInfo = extractDeviceInfo(request);
    
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

    // Skapa ny session
    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 timmar

    const sessionMetadata: SessionMetadata = {
      uid: decodedToken.uid,
      email: user.email || '',
      role: userData.role || 'customer',
      deviceInfo,
      createdAt: now,
      lastActivity: now,
      expiresAt
    };

    // Lagra session
    activeSessions.set(sessionId, sessionMetadata);
    
    // Uppdatera användarsessions
    if (!userSessions.has(decodedToken.uid)) {
      userSessions.set(decodedToken.uid, new Set());
    }
    userSessions.get(decodedToken.uid)!.add(sessionId);

    // Begränsa antal samtidiga sessioner per användare (max 5)
    const userSessionSet = userSessions.get(decodedToken.uid)!;
    if (userSessionSet.size > 5) {
      // Ta bort äldsta sessionen
      let oldestSessionId = '';
      let oldestTime = new Date();
      
      for (const sId of userSessionSet) {
        const session = activeSessions.get(sId);
        if (session && session.createdAt < oldestTime) {
          oldestTime = session.createdAt;
          oldestSessionId = sId;
        }
      }
      
      if (oldestSessionId) {
        activeSessions.delete(oldestSessionId);
        userSessionSet.delete(oldestSessionId);
      }
    }

    // Uppdatera användarens sista aktivitet i Firestore
    await db.collection('users').doc(decodedToken.uid).update({
      'metadata.lastActivity': now,
      'metadata.lastLoginDevice': deviceInfo.platform,
      'metadata.updatedAt': now
    });

    // Audit log
    console.log(`Session created for user: ${decodedToken.uid}`, {
      sessionId,
      deviceInfo: deviceInfo.platform,
      timestamp: now.toISOString()
    });

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        expiresAt: expiresAt.toISOString(),
        deviceInfo: {
          platform: deviceInfo.platform
        }
      },
      user: {
        uid: decodedToken.uid,
        email: user.email,
        role: userData.role,
        emailVerified: user.emailVerified,
        status: userData.status
      }
    });

  } catch (error: any) {
    console.error('Session creation error:', {
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
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// GET - Hämta session-information och aktiva sessioner
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Cleanup expired sessions först
    cleanupExpiredSessions();
    
    if (action === 'list') {
      // Lista alla aktiva sessioner för användaren
      const userSessionSet = userSessions.get(decodedToken.uid) || new Set();
      const sessions = Array.from(userSessionSet)
        .map(sessionId => activeSessions.get(sessionId))
        .filter(session => session !== undefined)
        .map(session => ({
          id: session!.uid, // Använd uid som public ID för säkerhet
          deviceInfo: {
            platform: session!.deviceInfo?.platform,
            userAgent: session!.deviceInfo?.userAgent?.substring(0, 50) + '...'
          },
          createdAt: session!.createdAt.toISOString(),
          lastActivity: session!.lastActivity.toISOString(),
          expiresAt: session!.expiresAt.toISOString(),
          isCurrent: true // Alla sessioner från samma token är "current"
        }));

      return NextResponse.json({
        success: true,
        sessions,
        totalActiveSessions: sessions.length
      });
    }

    // Default: returnera nuvarande session info
    const deviceInfo = extractDeviceInfo(request);
    
    return NextResponse.json({
      success: true,
      currentSession: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        iat: new Date(decodedToken.iat * 1000).toISOString(),
        exp: new Date(decodedToken.exp * 1000).toISOString(),
        deviceInfo: {
          platform: deviceInfo.platform
        }
      }
    });

  } catch (error: any) {
    console.error('Session GET error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get session information' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke sessioner
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    // Rate limiting
    const rateLimit = checkSessionOperationRateLimit(decodedToken.uid);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many session operations' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'current';
    const sessionId = searchParams.get('sessionId');
    
    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    
    let revokedCount = 0;
    
    if (action === 'all') {
      // Revoke alla sessioner för användaren
      const userSessionSet = userSessions.get(decodedToken.uid);
      if (userSessionSet) {
        revokedCount = userSessionSet.size;
        
        // Ta bort alla sessioner
        for (const sId of userSessionSet) {
          activeSessions.delete(sId);
        }
        userSessions.delete(decodedToken.uid);
      }
      
      // Revoke alla Firebase tokens för användaren
      await adminAuth.revokeRefreshTokens(decodedToken.uid);
      
    } else if (sessionId && action === 'specific') {
      // Revoke specifik session
      const session = activeSessions.get(sessionId);
      if (session && session.uid === decodedToken.uid) {
        activeSessions.delete(sessionId);
        const userSessionSet = userSessions.get(decodedToken.uid);
        if (userSessionSet) {
          userSessionSet.delete(sessionId);
          if (userSessionSet.size === 0) {
            userSessions.delete(decodedToken.uid);
          }
        }
        revokedCount = 1;
      }
    } else {
      // Default: revoke current session (alla tokens)
      await adminAuth.revokeRefreshTokens(decodedToken.uid);
      
      // Ta bort alla sessioner för säkerhets skull
      const userSessionSet = userSessions.get(decodedToken.uid);
      if (userSessionSet) {
        revokedCount = userSessionSet.size;
        for (const sId of userSessionSet) {
          activeSessions.delete(sId);
        }
        userSessions.delete(decodedToken.uid);
      }
    }

    // Uppdatera metadata
    await db.collection('users').doc(decodedToken.uid).update({
      'metadata.lastTokenRevocation': new Date(),
      'metadata.updatedAt': new Date()
    });

    // Audit log
    console.log(`Sessions revoked for user: ${decodedToken.uid}`, {
      action,
      revokedCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Successfully revoked ${revokedCount} session(s)`,
      revokedCount,
      action
    });

  } catch (error: any) {
    console.error('Session DELETE error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === 'Missing Authorization header') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera session aktivitet
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const decodedToken = await verifyAuthToken(authHeader);
    
    const deviceInfo = extractDeviceInfo(request);
    const now = new Date();
    
    // Uppdatera alla aktiva sessioner för användaren
    const userSessionSet = userSessions.get(decodedToken.uid);
    if (userSessionSet) {
      for (const sessionId of userSessionSet) {
        const session = activeSessions.get(sessionId);
        if (session) {
          session.lastActivity = now;
          // Förläng session med 24 timmar från nu
          session.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    }

    // Uppdatera användarens sista aktivitet
    const db = getAdminDb();
    await db.collection('users').doc(decodedToken.uid).update({
      'metadata.lastActivity': now,
      'metadata.updatedAt': now
    });

    return NextResponse.json({
      success: true,
      message: 'Session activity updated',
      lastActivity: now.toISOString()
    });

  } catch (error: any) {
    console.error('Session PUT error:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Icke-kritiskt fel, returnera success ändå
    return NextResponse.json({
      success: true,
      message: 'Session activity update attempted'
    });
  }
}
