# 🗺️ Permanent Google Maps API Fix

## Problem: Quota Exceeded

Din Google Maps API-nyckel har överskridit sin kvot. Här är den permanenta lösningen:

## Lösning: Skapa ny API-nyckel med korrekt konfiguration

### 1. Gå till Google Cloud Console
- Öppna https://console.cloud.google.com/
- Välj ditt projekt

### 2. Skapa ny API-nyckel
- Gå till "APIs & Services" → "Credentials"
- Klicka "Create Credentials" → "API key"
- Kopiera den nya nyckeln

### 3. Konfigurera API-nyckel
- Klicka på den nya API-nyckeln
- Under "Application restrictions":
  - Välj "HTTP referrers (web sites)"
  - Lägg till:
    ```
    http://localhost:3005/*
    http://localhost:3001/*
    https://localhost:3005/*
    https://localhost:3001/*
    http://127.0.0.1:3005/*
    http://127.0.0.1:3001/*
    ```

### 4. Aktivera nödvändiga APIs
- Gå till "APIs & Services" → "Library"
- Sök och aktivera:
  - **Maps JavaScript API**
  - **Places API**
  - **Geocoding API**

### 5. Uppdatera koden
Ersätt API-nyckeln i:
- `.env.local` (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

### 6. Testa
- Vänta 2-3 minuter
- Ladda om http://localhost:3005
- Testa adressautocomplete

## Alternativ: Uppgradera till betald plan

Om du behöver högre kvoter:
- Gå till "Billing" i Google Cloud Console
- Lägg till betalningsmetod
- Uppgradera till betald plan

## Produktions deployment

För produktion, lägg till din domän:
```
https://din-domän.se/*
https://www.din-domän.se/*
```

## Viktigt

- **Inga temporära lösningar** - detta är den permanenta lösningen
- **Korrekt konfiguration** - följ alla steg
- **Testa grundligt** - verifiera att allt fungerar
