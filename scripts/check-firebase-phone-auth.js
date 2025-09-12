const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function checkPhoneAuth() {
  console.log('🔍 Checking Firebase Phone Authentication Setup...\n');
  
  // Check config
  console.log('📋 Configuration:');
  console.log('  Project ID:', firebaseConfig.projectId || '❌ MISSING');
  console.log('  Auth Domain:', firebaseConfig.authDomain || '❌ MISSING');
  console.log('  API Key:', firebaseConfig.apiKey ? '✅ Set' : '❌ MISSING');
  console.log('  App ID:', firebaseConfig.appId ? '✅ Set' : '❌ MISSING');
  
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.log('\n❌ Missing required Firebase configuration!');
    return;
  }
  
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    console.log('\n✅ Firebase initialized successfully');
    
    console.log('\n📱 Phone Auth Requirements:');
    console.log('  1. Enable Phone provider in Firebase Console');
    console.log('  2. Add authorized domains (localhost, vercel app)');
    console.log('  3. Configure reCAPTCHA');
    console.log('  4. Add test phone numbers for development');
    
    console.log('\n🔗 Quick Links:');
    console.log(`  Firebase Console: https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`);
    console.log(`  Enable Phone Auth: https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`);
    
  } catch (error) {
    console.log('\n❌ Firebase initialization error:', error.message);
  }
}

checkPhoneAuth();
