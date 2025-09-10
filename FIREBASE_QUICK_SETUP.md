# 🔥 Snabb Firebase Setup

## 📋 Steg 1: Skapa .env.local fil

Skapa en fil som heter `.env.local` i projektets rotmapp med följande innehåll:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=din_api_key_här
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=avanti-booking-system.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=avanti-booking-system
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=avanti-booking-system.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ditt_sender_id_här
NEXT_PUBLIC_FIREBASE_APP_ID=ditt_app_id_här
NEXT_PUBLIC_FIREBASE_VAPID_KEY=ditt_vapid_key_här
```

## 📋 Steg 2: Hitta dina Firebase värden

1. Gå till https://console.firebase.google.com/
2. Välj ditt projekt "avanti-booking-system"
3. Klicka på kugghjulet (⚙️) → "Project settings"
4. Scrolla ner till "Your apps" sektionen
5. Klicka på webapp ikonen "</>"
6. Kopiera värdena från "Firebase SDK snippet" → "Config"

## 📋 Steg 3: Aktivera Firebase Services

### Firestore Database:
1. Gå till "Firestore Database" i vänster meny
2. Klicka "Create database"
3. Välj "Start in test mode"
4. Välj region (europe-west1 för Sverige)
5. Klicka "Enable"

### Authentication:
1. Gå till "Authentication" i vänster meny
2. Klicka "Get started"
3. Gå till "Sign-in method" fliken
4. Aktivera "Email/Password"
5. Klicka "Save"

## 📋 Steg 4: Testa systemet

```bash
# Skapa testdata
npm run seed-data

# Testa hemsidan
# Gå till http://localhost:3005

# Testa förare dashboard
# Gå till http://localhost:3005/driver
```

## ✅ När allt fungerar:

- ✅ Hemsidan laddar utan fel
- ✅ Förare dashboard fungerar
- ✅ Testdata skapas i Firestore
- ✅ Bokningar kan accepteras/avslås
- ✅ Realtidsuppdateringar fungerar

## 🚨 Vanliga problem:

**Problem:** "Firebase App already exists"
**Lösning:** Systemet hanterar detta automatiskt nu

**Problem:** "Permission denied"
**Lösning:** Kontrollera att Firestore är i testläge

**Problem:** "Invalid API key"
**Lösning:** Kontrollera att .env.local har rätt värden
