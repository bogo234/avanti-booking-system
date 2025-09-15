#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupFirebaseAdmin() {
  console.log('🔥 Firebase Admin SDK Setup');
  console.log('================================');
  console.log('');
  console.log('För att slutföra konfigurationen behöver du:');
  console.log('1. Gå till Firebase Console: https://console.firebase.google.com/project/avanti-booking-system/settings/serviceaccounts/adminsdk');
  console.log('2. Klicka på "Generate new private key"');
  console.log('3. Ladda ner JSON-filen');
  console.log('4. Ange sökvägen till filen nedan');
  console.log('');

  try {
    const serviceAccountPath = await question('Ange sökväg till service account JSON-fil: ');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Filen kunde inte hittas:', serviceAccountPath);
      process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Service account-filen saknar obligatoriska fält:', missingFields.join(', '));
      process.exit(1);
    }

    // Read existing .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing Firebase Admin variables
    const linesToRemove = [
      'FIREBASE_PROJECT_ID=',
      'FIREBASE_CLIENT_EMAIL=', 
      'FIREBASE_PRIVATE_KEY='
    ];
    
    const envLines = envContent.split('\n').filter(line => {
      return !linesToRemove.some(prefix => line.startsWith(prefix));
    });

    // Add new Firebase Admin variables
    envLines.push('');
    envLines.push('# Firebase Admin SDK');
    envLines.push(`FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
    envLines.push(`FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
    envLines.push(`FIREBASE_PRIVATE_KEY="${serviceAccount.private_key}"`);

    // Write updated .env.local
    fs.writeFileSync(envPath, envLines.join('\n'));
    
    console.log('');
    console.log('✅ Firebase Admin SDK har konfigurerats!');
    console.log('📝 .env.local har uppdaterats med service account credentials');
    console.log('');
    console.log('⚠️  Säkerhetspåminnelse:');
    console.log('- Dela ALDRIG private key offentligt');
    console.log('- Lägg till service account JSON-filen i .gitignore');
    console.log('- I produktion, använd säkra miljövariabler');
    console.log('');
    console.log('🚀 Du kan nu starta om utvecklingsservern för att använda Firebase Admin SDK');

  } catch (error) {
    console.error('❌ Fel vid konfiguration:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupFirebaseAdmin();
