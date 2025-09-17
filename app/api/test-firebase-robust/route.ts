import { NextResponse } from 'next/server';
import { testFirebaseAdminSDK, isFirebaseAdminConfigured } from '../../../lib/firebase-admin-robust';

export async function GET() {
  try {
    console.log('=== FIREBASE ADMIN SDK ROBUST TEST ===');
    
    // Check configuration
    const isConfigured = isFirebaseAdminConfigured();
    console.log('Configuration check result:', isConfigured);
    
    // Test Firebase Admin SDK
    const testResult = await testFirebaseAdminSDK();
    console.log('Test result:', testResult);
    
    // Get environment variables info
    const envInfo = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT_SET',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT_SET',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT_SET',
      FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT_SET',
      ALL_FIREBASE_KEYS: Object.keys(process.env).filter(key => key.includes('FIREBASE')),
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    };
    
    console.log('Environment info:', envInfo);
    
    return NextResponse.json({
      success: testResult.success,
      isConfigured,
      testResult,
      envInfo,
      timestamp: new Date().toISOString(),
      message: testResult.success ? 'Firebase Admin SDK is working!' : 'Firebase Admin SDK has issues'
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
