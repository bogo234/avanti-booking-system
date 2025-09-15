# Firebase Admin SDK Setup Guide

## Steg 1: Skapa Service Account i Firebase Console

1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Välj projektet "avanti-booking-system"
3. Gå till Project Settings (kugghjulet) > Service accounts
4. Klicka på "Generate new private key"
5. Ladda ner JSON-filen

## Steg 2: Extrahera nödvändiga värden från JSON-filen

Från den nedladdade JSON-filen, extrahera följande värden:
- `project_id` 
- `private_key`
- `client_email`

## Steg 3: Lägg till i .env.local

Lägg till följande rader i `.env.local`:

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=avanti-booking-system
FIREBASE_CLIENT_EMAIL=[client_email från JSON-filen]
FIREBASE_PRIVATE_KEY="[private_key från JSON-filen - hela nyckeln inklusive -----BEGIN PRIVATE KEY-----]"
```

## Säkerhetsnotering

- Dela ALDRIG private key offentligt
- Lägg till service account JSON-filen i .gitignore om du sparar den lokalt
- I produktion, använd säkra miljövariabler (Vercel Environment Variables)
