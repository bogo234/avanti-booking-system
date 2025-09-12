import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    };

    const missingKeys = Object.entries(config)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    return NextResponse.json({
      success: true,
      config: {
        apiKey: config.apiKey ? '✅ Set' : '❌ Missing',
        authDomain: config.authDomain ? '✅ Set' : '❌ Missing',
        projectId: config.projectId ? '✅ Set' : '❌ Missing',
        appId: config.appId ? '✅ Set' : '❌ Missing',
        recaptchaSiteKey: config.recaptchaSiteKey ? '✅ Set' : '❌ Missing'
      },
      missingKeys,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
