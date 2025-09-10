#!/usr/bin/env node

/**
 * Firebase Setup Script
 * Detta script hjälper dig att konfigurera Firebase för Avanti bokningssystem
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupFirebase() {
  console.log('🔥 Firebase Setup för Avanti Bokningssystem');
  console.log('==========================================\n');

  console.log('📋 Följ dessa steg för att konfigurera Firebase:\n');

  console.log('1. Gå till https://console.firebase.google.com/');
  console.log('2. Klicka på "Lägg till projekt"');
  console.log('3. Namnge projektet: "avanti-booking-system"');
  console.log('4. Aktivera Google Analytics (valfritt)');
  console.log('5. Klicka "Skapa projekt"\n');

  console.log('6. I projektet, klicka på "</>" (Web) ikonen');
  console.log('7. Namnge appen: "avanti-web"');
  console.log('8. Klicka "Registrera app"\n');

  console.log('9. Kopiera konfigurationsobjektet som visas\n');

  const apiKey = await question('🔑 Ange API Key: ');
  const authDomain = await question('🌐 Ange Auth Domain: ');
  const projectId = await question('📁 Ange Project ID: ');
  const storageBucket = await question('💾 Ange Storage Bucket: ');
  const messagingSenderId = await question('📱 Ange Messaging Sender ID: ');
  const appId = await question('🆔 Ange App ID: ');

  // Skapa .env.local fil
  const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=${apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${authDomain}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${storageBucket}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId}
NEXT_PUBLIC_FIREBASE_APP_ID=${appId}
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
`;

  const envPath = path.join(process.cwd(), '.env.local');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env.local fil skapad!');

  // Uppdatera firebase.ts med riktiga värden
  const firebasePath = path.join(process.cwd(), 'lib', 'firebase.ts');
  let firebaseContent = fs.readFileSync(firebasePath, 'utf8');
  
  firebaseContent = firebaseContent.replace(
    /const firebaseConfig = \{[\s\S]*?\};/,
    `const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};`
  );

  fs.writeFileSync(firebasePath, firebaseContent);

  console.log('✅ firebase.ts uppdaterad!');

  console.log('\n📋 Nästa steg:');
  console.log('1. Aktivera Firestore Database i Firebase Console');
  console.log('2. Aktivera Authentication i Firebase Console');
  console.log('3. Aktivera Cloud Messaging i Firebase Console');
  console.log('4. Kör: npm run seed-data för att skapa testdata');
  console.log('5. Starta servern: npm run dev -- -p 3005');

  rl.close();
}

setupFirebase().catch(console.error);
