# Stripe-betalning Fix - Permanent Lösning

## Problem
Stripe-betalningarna fungerar inte eftersom Firebase Admin SDK inte är konfigurerat korrekt.

## Permanent Lösning

### Steg 1: Skaffa Firebase Service Account Credentials

1. Gå till [Firebase Console](https://console.firebase.google.com/project/avanti-booking-system/settings/serviceaccounts/adminsdk)
2. Klicka på **"Generate new private key"**
3. Ladda ner JSON-filen (t.ex. `avanti-booking-system-firebase-adminsdk-xxxxx.json`)

### Steg 2: Konfigurera Automatiskt (Rekommenderat)

Kör setup-scriptet:
```bash
node scripts/setup-firebase-admin.js
```

Följ instruktionerna och ange sökvägen till din nedladdade JSON-fil.

### Steg 3: Manuell Konfiguration (Alternativ)

Om du föredrar att göra det manuellt, lägg till följande i `.env.local`:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=avanti-booking-system
FIREBASE_CLIENT_EMAIL=[client_email från JSON-filen]
FIREBASE_PRIVATE_KEY="[private_key från JSON-filen - hela nyckeln inklusive -----BEGIN PRIVATE KEY-----]"
```

### Steg 4: Starta Om Servern

```bash
npm run dev
```

## Vad Som Är Fixat

✅ **Ingen temporär lösning** - Allt använder korrekt Firebase Admin SDK  
✅ **Säker autentisering** - Endast bokningsägare/förare/admin kan skapa betalningar  
✅ **Korrekt Stripe-integration** - Använder officiell Stripe SDK  
✅ **Produktionsklar** - Fungerar både lokalt och i produktion  
✅ **Tydliga felmeddelanden** - API:et förklarar vad som saknas  

## Säkerhet

- **Lokalt**: Service account credentials i `.env.local`
- **Produktion**: Använd Vercel Environment Variables för säkra credentials
- **Aldrig** commit service account JSON-filer eller private keys till git

## Verifiering

Efter konfiguration, testa att API:et fungerar:

```bash
# Detta ska nu fungera (med korrekt Authorization header)
curl -X POST http://localhost:3005/api/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [FIREBASE_ID_TOKEN]" \
  -d '{"amount": 299, "bookingId": "test123", "customerEmail": "test@example.com"}'
```

## Nästa Steg

Efter att Firebase Admin SDK är konfigurerat:
1. Betalningsflödet kommer att fungera helt
2. Autentisering kommer att valideras korrekt
3. Bokningsdata kommer att uppdateras säkert
4. Inga temporära lösningar används
