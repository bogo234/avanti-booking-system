import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT_SET',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT_SET', 
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT_SET',
    FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    ALL_FIREBASE_VARS: Object.keys(process.env).filter(key => key.includes('FIREBASE')),
  };

  return NextResponse.json({
    message: 'Environment variables check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
}
