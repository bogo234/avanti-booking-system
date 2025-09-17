import { NextRequest, NextResponse } from 'next/server';
import { isFirebaseAdminConfigured, getAdminApp } from '../../../lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // Check if Firebase Admin is configured
    const isConfigured = isFirebaseAdminConfigured();
    
    if (!isConfigured) {
      const missingVars = [];
      if (!process.env.FIREBASE_PROJECT_ID) missingVars.push('FIREBASE_PROJECT_ID');
      if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL');
      if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY');
      
      return NextResponse.json({
        success: false,
        error: 'Firebase Admin SDK not configured',
        missingVars,
        details: `Missing environment variables: ${missingVars.join(', ')}`
      }, { status: 500 });
    }

    // Try to initialize Firebase Admin
    try {
      const app = getAdminApp();
      return NextResponse.json({
        success: true,
        message: 'Firebase Admin SDK is properly configured',
        projectId: app.options.projectId
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Firebase Admin',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
