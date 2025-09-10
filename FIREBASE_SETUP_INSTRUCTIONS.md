# Firebase Phone Authentication Setup

## Problem: `auth/invalid-app-credential`

Detta fel uppstår när Firebase-appen inte är korrekt konfigurerad för Phone Authentication.

## Steg för att fixa:

### 1. Gå till Firebase Console
- Öppna [Firebase Console](https://console.firebase.google.com/)
- Välj ditt projekt: `avanti-app-fbe1c`

### 2. Kontrollera App ID
- Gå till **Project Settings** (kugghjulet)
- Under **Your apps** hittar du din web-app
- Kopiera **App ID** (ser ut som: `1:154583264743:web:abc123def456`)

### 3. Uppdatera .env.local
Ersätt `your-app-id` med den riktiga App ID:n:

```bash
NEXT_PUBLIC_FIREBASE_APP_ID=1:154583264743:web:ABC123DEF456
```

### 4. Aktivera Phone Authentication
- Gå till **Authentication** → **Sign-in method**
- Aktivera **Phone** som sign-in method
- Lägg till ditt test-telefonnummer under **Phone numbers for testing**

### 5. Konfigurera reCAPTCHA
- Under **Settings** → **reCAPTCHA Enterprise**
- Aktivera reCAPTCHA v3
- Lägg till din domän: `localhost` (för utveckling)

### 6. Starta om servern
```bash
npm run dev -- --port 3001
```

## Testa igen

Gå till `http://localhost:3001/test-phone` och testa att skicka en SMS-kod.

## Debug-information

Komponenten visar nu debug-information som hjälper dig att identifiera problem.

## Vanliga fel:

- **`auth/invalid-app-credential`**: Fel App ID eller API Key
- **`auth/missing-recaptcha-token`**: reCAPTCHA inte aktiverat
- **`auth/invalid-phone-number`**: Fel telefonnummer-format
- **`auth/too-many-requests`**: För många försök, vänta

## Support

Om problemet kvarstår, kontrollera:
1. Firebase Console-loggar
2. Webbläsarens konsol
3. Debug-informationen i komponenten
