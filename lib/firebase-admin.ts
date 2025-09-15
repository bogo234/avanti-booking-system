import admin from 'firebase-admin';

let app: admin.app.App | null = null;

function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) throw new Error('FIREBASE_PRIVATE_KEY is missing');
  // Support escaped \n in env
  return key.replace(/\\n/g, '\n');
}

export function getAdminApp(): admin.app.App {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is missing');
  }

  if (!clientEmail) {
    throw new Error('FIREBASE_CLIENT_EMAIL is missing. Please set up Firebase Admin SDK credentials.');
  }

  if (admin.apps.length === 0) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: getPrivateKey(),
      }),
    });
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
    return data?.role || 'customer'; // Default to customer if no role is set
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Helper function to check if Firebase Admin is properly configured
export function isFirebaseAdminConfigured(): boolean {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    return !!(projectId && clientEmail && privateKey);
  } catch {
    return false;
  }
}