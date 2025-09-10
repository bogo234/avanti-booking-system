# 🚀 Snabb fix för Google Maps API

## Steg för att fixa RefererNotAllowedMapError:

### 1. Gå till Google Cloud Console
- Öppna https://console.cloud.google.com/
- Välj ditt projekt

### 2. Gå till API-nycklar
- "APIs & Services" → "Credentials"
- Klicka på din API-nyckel: `AIzaSyB1u3SGVSxh0UyVRUddlPZ0FTTeXjZZ1Lw`

### 3. Ta bort restrictions (temporärt)
- Under "Application restrictions"
- Välj "None"
- Klicka "Save"

### 4. Aktivera APIs
- Gå till "APIs & Services" → "Library"
- Sök "Maps JavaScript API" → "Enable"
- Sök "Places API" → "Enable"

### 5. Testa
- Vänta 2-3 minuter
- Ladda om http://localhost:3005
- Testa adressautocomplete

## ⚠️ Viktigt för produktion:
Lägg tillbaka restrictions med din domän när du deployar:
```
https://din-domän.se/*
https://www.din-domän.se/*
```
