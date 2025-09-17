# Vercel Firebase Admin SDK Setup

## Problem
Felet "Firebase Admin SDK not configured" uppstår eftersom följande miljövariabler saknas i Vercel:

## Saknade Miljövariabler

Du behöver lägga till dessa miljövariabler i Vercel Dashboard:

### 1. Gå till Vercel Dashboard
- Logga in på [vercel.com](https://vercel.com)
- Välj ditt projekt
- Gå till **Settings** → **Environment Variables**

### 2. Lägg till dessa variabler:

#### Firebase Admin SDK (Server-side)
```
FIREBASE_PROJECT_ID=avanti-booking-system
FIREBASE_CLIENT_EMAIL=[din_client_email_från_service_account_json]
FIREBASE_PRIVATE_KEY="[din_private_key_från_service_account_json]"
```

### 3. Hitta värdena i din Firebase Service Account JSON

Öppna din `avanti-booking-system-firebase-adminsdk-fbsvc-7b138f81a9.json` fil och kopiera:

- **FIREBASE_PROJECT_ID**: Använd `project_id` från JSON-filen
- **FIREBASE_CLIENT_EMAIL**: Använd `client_email` från JSON-filen  
- **FIREBASE_PRIVATE_KEY**: Använd `private_key` från JSON-filen (hela strängen inklusive `-----BEGIN PRIVATE KEY-----`)

### 4. Exempel på hur det ska se ut:

```
FIREBASE_PROJECT_ID=avanti-booking-system
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@avanti-booking-system.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 5. Viktigt
- **FIREBASE_PRIVATE_KEY** måste vara inom citattecken
- **FIREBASE_PRIVATE_KEY** måste innehålla `\n` för radbrytningar (inte faktiska radbrytningar)
- Sätt alla variabler för **Production**, **Preview**, och **Development**

### 6. Efter att du lagt till variablerna:
1. Gå till **Deployments** i Vercel
2. Klicka på **Redeploy** för din senaste deployment
3. Testa bokningen igen

## Testa konfigurationen

Du kan testa om Firebase Admin är korrekt konfigurerat genom att besöka:
`https://din-domän.vercel.app/api/test-firebase-admin`

Detta kommer att visa exakt vilka variabler som saknas.

## Felsökning

Om du fortfarande får fel:
1. Kontrollera att alla tre variabler är satta
2. Kontrollera att FIREBASE_PRIVATE_KEY är inom citattecken
3. Kontrollera att FIREBASE_PRIVATE_KEY innehåller `\n` för radbrytningar
4. Kontrollera att du har redeployat efter att ha lagt till variablerna
