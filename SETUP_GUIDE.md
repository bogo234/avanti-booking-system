# 🚀 Avanti Bokningssystem - Setup Guide

## 📋 Snabbstart

### 1. Installera Dependencies
```bash
npm install
```

### 2. Konfigurera Firebase
Skapa en `.env.local` fil i projektets rotmapp:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=din_api_key_här
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=avanti-booking-system.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=avanti-booking-system
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=avanti-booking-system.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=ditt_sender_id_här
NEXT_PUBLIC_FIREBASE_APP_ID=ditt_app_id_här
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=ditt_measurement_id_här

# Google Maps API (valfritt)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=din_google_maps_api_key_här
```

### 3. Starta Utvecklingsservern
```bash
npm run dev
```

### 4. Skapa Testdata
```bash
npm run seed-data
```

## 🔥 Firebase Setup

### Steg 1: Skapa Firebase Projekt
1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Skapa nytt projekt: `avanti-booking-system`
3. Aktivera Google Analytics (valfritt)

### Steg 2: Konfigurera Web App
1. Lägg till webapp i Firebase Console
2. Kopiera konfigurationsvärden till `.env.local`

### Steg 3: Aktivera Services
- **Firestore Database**: Skapa databas i testläge
- **Authentication**: Aktivera Email/Password
- **Cloud Messaging**: Aktivera FCM (valfritt)

## 🎯 Funktioner

### ✅ Implementerat
- **Autentisering**: Email/password för kunder och förare
- **Bokningssystem**: 3-stegs bokningsprocess
- **Förare Dashboard**: Realtidsbokningshantering
- **Kund Dashboard**: Bokningsspårning
- **Live Spårning**: Realtidsuppdateringar
- **Betalningsintegration**: Mock-betalning (Kort, Swish, Klarna)
- **Notifikationer**: Realtidsnotifikationer
- **Responsiv Design**: Fungerar på alla enheter

### 🔄 Realtidsfunktioner
- Bokningsuppdateringar
- Förare-tilldelning
- Statusändringar
- Notifikationer

### 💳 Betalningsmetoder
- Kortbetalning
- Swish
- Klarna
- Mock-implementation (kan utökas med Stripe)

## 🚀 Deployment

### Vercel (Rekommenderat)
1. Pusha kod till GitHub
2. Koppla till Vercel
3. Lägg till miljövariabler i Vercel dashboard
4. Deploy

### Andra Plattformar
- Netlify
- Firebase Hosting
- AWS Amplify

## 📱 Användning

### För Kunder
1. Gå till `/auth/simple` för att registrera/logga in
2. Gå till `/booking` för att boka resa
3. Gå till `/customer` för att se bokningar
4. Gå till `/tracking?bookingId=XXX` för live spårning

### För Förare
1. Gå till `/auth/simple` och registrera som förare
2. Gå till `/driver` för förare dashboard
3. Acceptera bokningar och uppdatera status

## 🛠️ Utveckling

### Projektstruktur
```
app/
├── components/          # React komponenter
├── contexts/           # React contexts
├── styles/            # CSS filer
├── types/             # TypeScript typer
├── auth/              # Autentiseringssidor
├── booking/           # Bokningssidor
├── customer/          # Kund-sidor
├── driver/            # Förare-sidor
└── tracking/          # Spårningssidor
```

### Viktiga Filer
- `lib/firebase.ts` - Firebase konfiguration
- `app/contexts/AuthContext.tsx` - Autentisering
- `app/components/ModernBookingForm.tsx` - Bokningsformulär
- `app/components/PaymentModal.tsx` - Betalningsmodal

## 🔧 Felsökning

### Vanliga Problem
1. **Firebase fel**: Kontrollera `.env.local` värden
2. **Autentisering**: Kontrollera att Email/Password är aktiverat
3. **Bokningar visas inte**: Kör `npm run seed-data`
4. **Google Maps fel**: Lägg till API-nyckel i `.env.local`

### Loggar
Kontrollera browser console för felmeddelanden.

## 📞 Support

För support eller frågor, kontakta utvecklingsteamet.

---

**Avanti Bokningssystem** - Professionell transport när du behöver det! 🚗
