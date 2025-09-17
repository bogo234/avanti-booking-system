import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const debug = {
      environment: process.env.NODE_ENV,
      hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      firebasePrivateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      firebasePrivateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50) || 'NOT_SET',
      firebasePrivateKeyEnd: process.env.FIREBASE_PRIVATE_KEY?.substring(-50) || 'NOT_SET',
      allEnvVars: Object.keys(process.env).filter(key => key.includes('FIREBASE')),
    };

    return NextResponse.json({
      success: true,
      debug,
      message: 'Firebase environment variables debug info'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        environment: process.env.NODE_ENV,
        hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      }
    }, { status: 500 });
  }
}
