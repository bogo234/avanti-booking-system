import admin from 'firebase-admin';

let app: admin.app.App | null = null;

// Robust environment variable handling
function getEnvironmentVariable(key: string): string | undefined {
  // Try multiple sources for environment variables
  const value = process.env[key] || 
                process.env[`NEXT_PUBLIC_${key}`] ||
                process.env[key.toUpperCase()] ||
                process.env[key.toLowerCase()];
  
  console.log(`Environment variable ${key}:`, value ? 'SET' : 'NOT_SET');
  return value;
}

function getPrivateKey(): string {
  const key = getEnvironmentVariable('FIREBASE_PRIVATE_KEY');
  if (!key) {
    console.error('FIREBASE_PRIVATE_KEY is missing from all sources');
    throw new Error('FIREBASE_PRIVATE_KEY is missing');
  }
  
  // Support both escaped \n and actual newlines
  const processedKey = key.replace(/\\n/g, '\n');
  console.log('Private key processed, length:', processedKey.length);
  return processedKey;
}

export function getAdminApp(): admin.app.App {
  if (app) return app;

  console.log('Initializing Firebase Admin SDK...');
  
  const projectId = getEnvironmentVariable('FIREBASE_PROJECT_ID');
  const clientEmail = getEnvironmentVariable('FIREBASE_CLIENT_EMAIL');

  if (!projectId) {
    console.error('FIREBASE_PROJECT_ID is missing');
    throw new Error('FIREBASE_PROJECT_ID is missing');
  }

  if (!clientEmail) {
    console.error('FIREBASE_CLIENT_EMAIL is missing');
    throw new Error('FIREBASE_CLIENT_EMAIL is missing');
  }

  console.log('Firebase Admin SDK credentials found:', {
    projectId,
    clientEmail,
    privateKeyLength: getEnvironmentVariable('FIREBASE_PRIVATE_KEY')?.length || 0
  });

  if (admin.apps.length === 0) {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: getPrivateKey(),
        }),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  } else {
    app = admin.app();
  }
  return app!;
}

export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

export function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

export interface DecodedTokenWithRole extends admin.auth.DecodedIdToken {
  role?: 'customer' | 'driver' | 'admin';
}

export async function verifyAuthToken(authorizationHeader: string | null): Promise<DecodedTokenWithRole> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const idToken = authorizationHeader.slice('Bearer '.length);
  const decoded = await getAdminAuth().verifyIdToken(idToken, true);
  return decoded as DecodedTokenWithRole;
}

export async function getUserRole(uid: string): Promise<'customer' | 'driver' | 'admin' | null> {
  try {
    const db = getAdminDb();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data() as { role?: 'customer' | 'driver' | 'admin' } | undefined;
    return data?.role || 'customer';
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Enhanced configuration check with detailed logging
export function isFirebaseAdminConfigured(): boolean {
  try {
    console.log('Checking Firebase Admin SDK configuration...');
    
    const projectId = getEnvironmentVariable('FIREBASE_PROJECT_ID');
    const clientEmail = getEnvironmentVariable('FIREBASE_CLIENT_EMAIL');
    const privateKey = getEnvironmentVariable('FIREBASE_PRIVATE_KEY');
    
    const isConfigured = !!(projectId && clientEmail && privateKey);
    
    console.log('Firebase Admin SDK configuration status:', {
      isConfigured,
      projectId: projectId ? 'SET' : 'NOT_SET',
      clientEmail: clientEmail ? 'SET' : 'NOT_SET',
      privateKey: privateKey ? 'SET' : 'NOT_SET',
      privateKeyLength: privateKey?.length || 0,
      allFirebaseEnvKeys: Object.keys(process.env).filter(key => key.includes('FIREBASE'))
    });
    
    return isConfigured;
  } catch (error) {
    console.error('Firebase Admin SDK configuration check failed:', error);
    return false;
  }
}

// Test function to verify Firebase Admin SDK works
export async function testFirebaseAdminSDK(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Testing Firebase Admin SDK...');
    
    if (!isFirebaseAdminConfigured()) {
      return { success: false, error: 'Firebase Admin SDK not configured' };
    }
    
    const adminApp = getAdminApp();
    console.log('Firebase Admin SDK test successful, project ID:', adminApp.options.projectId);
    
    return { success: true };
  } catch (error) {
    console.error('Firebase Admin SDK test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
