# 🔥 Firebase Setup Guide för Avanti Bokningssystem

## 📋 Steg-för-steg guide

### 1. Skapa Firebase Projekt

1. **Gå till Firebase Console:**
   - Öppna https://console.firebase.google.com/
   - Logga in med ditt Google-konto

2. **Skapa nytt projekt:**
   - Klicka på "Lägg till projekt"
   - Namnge projektet: `avanti-booking-system`
   - Aktivera Google Analytics (valfritt)
   - Klicka "Skapa projekt"

### 2. Konfigurera Web App

1. **Lägg till webapp:**
   - I projektet, klicka på "</>" (Web) ikonen
   - Namnge appen: `avanti-web`
   - Klicka "Registrera app"

2. **Kopiera konfiguration:**
   - Kopiera hela `firebaseConfig` objektet
   - Du behöver dessa värden:
     - `apiKey`
     - `authDomain`
     - `projectId`
     - `storageBucket`
     - `messagingSenderId`
     - `appId`

### 3. Aktivera Firebase Services

#### Firestore Database
1. Gå till "Firestore Database" i vänster meny
2. Klicka "Skapa databas"
3. Välj "Starta i testläge" (för utveckling)
4. Välj närmaste region (europe-west1 för Sverige)
5. Klicka "Aktivera"

#### Authentication
1. Gå till "Authentication" i vänster meny
2. Klicka "Kom igång"
3. Gå till "Sign-in method" fliken
4. Aktivera "E-post/lösenord"
5. Klicka "Spara"

#### Cloud Messaging
1. Gå till "Cloud Messaging" i vänster meny
2. Klicka "Kom igång"
3. Följ instruktionerna för att aktivera FCM

### 4. Konfigurera Projektet

#### Kör setup script:
```bash
npm run setup-firebase
```

Följ instruktionerna och ange dina Firebase konfigurationsvärden.

#### Skapa testdata:
```bash
npm run seed-data
```

### 5. Testa Systemet

1. **Starta servern:**
   ```bash
   npm run dev -- -p 3005
   ```

2. **Testa bokningsflödet:**
   - Gå till http://localhost:3005
   - Fyll i adresser och boka en resa
   - Du kommer att redirectas till bokningsstatus sidan

3. **Testa förare dashboard:**
   - Gå till http://localhost:3005/driver
   - Du ska se testbokningen i listan
   - Acceptera bokningen
   - Uppdatera status (På väg → Anlänt → Slutförd)

4. **Testa realtidsuppdateringar:**
   - Öppna både kund- och förare-sidorna
   - Uppdatera status i förare dashboard
   - Se att kund-sidan uppdateras automatiskt

### 6. Firestore Security Rules

För produktion, uppdatera Firestore reglerna:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bookings - läs/skriv för autentiserade användare
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null;
    }
    
    // Drivers - läs/skriv för autentiserade förare
    match /drivers/{driverId} {
      allow read, write: if request.auth != null;
    }
    
    // Messages - läs/skriv för autentiserade användare
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 7. Push Notifications Setup

1. **Generera VAPID Key:**
   - Gå till "Project Settings" → "Cloud Messaging"
   - Under "Web configuration", klicka "Generate key pair"
   - Kopiera VAPID key

2. **Uppdatera .env.local:**
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_here
   ```

3. **Uppdatera service worker:**
   - Redigera `public/firebase-messaging-sw.js`
   - Ersätt placeholder värden med dina riktiga Firebase config

### 8. Produktions Deployment

1. **Uppdatera Firestore regler för produktion**
2. **Konfigurera domän i Firebase Console**
3. **Aktivera HTTPS**
4. **Konfigurera CORS för din domän**

## 🚨 Viktiga Säkerhetsnoter

- **Använd aldrig testläge i produktion**
- **Konfigurera korrekta Firestore regler**
- **Använd miljövariabler för alla känsliga data**
- **Aktivera endast nödvändiga Firebase services**

## 📞 Support

Om du stöter på problem:
1. Kontrollera Firebase Console för fel
2. Kontrollera browser console för JavaScript fel
3. Kontrollera att alla miljövariabler är korrekt konfigurerade
4. Kontrollera att Firebase services är aktiverade

## ✅ Checklista

- [ ] Firebase projekt skapat
- [ ] Web app registrerad
- [ ] Firestore Database aktiverad
- [ ] Authentication aktiverad
- [ ] Cloud Messaging aktiverad
- [ ] Konfigurationsvärden angivna
- [ ] Testdata skapad
- [ ] Bokningsflöde testat
- [ ] Förare dashboard testat
- [ ] Realtidsuppdateringar testat
- [ ] Push notifications konfigurerade (valfritt)