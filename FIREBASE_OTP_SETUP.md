# 🔥 Firebase OTP & reCAPTCHA Setup

## 📱 **SMS OTP med Firebase Authentication**

### **1. Aktivera Phone Authentication i Firebase Console:**
1. Gå till [Firebase Console](https://console.firebase.google.com/)
2. Välj ditt projekt
3. Gå till **Authentication** → **Sign-in method**
4. Aktivera **Phone** provider
5. Lägg till ditt test-telefonnummer för utveckling

### **2. Konfigurera reCAPTCHA:**
1. I Firebase Console → **Authentication** → **Settings**
2. Scrolla ner till **reCAPTCHA Enterprise**
3. Klicka **Enable reCAPTCHA Enterprise**
4. Kopiera **Site Key** (behövs för .env.local)

### **3. Skapa .env.local fil:**
Skapa en `.env.local` fil i projektets rot med:

```env
# Google Maps API (redan konfigurerad)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB1u3SGVSxh0UyVRUddlPZ0FTTeXjZZ1Lw

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=din_api_key_här
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=din_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=din_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=din_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=din_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=din_app_id

# reCAPTCHA Site Key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=din_recaptcha_site_key_här
```

### **4. Hämta Firebase-konfiguration:**
1. I Firebase Console → **Project Settings**
2. Scrolla ner till **Your apps**
3. Klicka på webb-ikonen (</>)
4. Registrera app med namn "Avanti Web"
5. Kopiera alla värden till .env.local

### **5. Testa OTP:**
1. Starta servern: `npm run dev`
2. Gå till: http://localhost:3001/auth
3. Klicka på **Telefon** tab
4. Ange telefonnummer (använd ditt test-nummer)
5. Klicka **Skicka kod**
6. Ange SMS-koden som skickas

## 🎯 **Funktioner som nu fungerar:**

✅ **Riktig Firebase Phone Authentication**  
✅ **SMS OTP-koder**  
✅ **reCAPTCHA verifiering**  
✅ **Automatisk landskod-detektering**  
✅ **Felhantering för ogiltiga nummer**  
✅ **Säker verifiering via Firebase**  

## 🔧 **Vad som händer nu:**

1. **Telefon-tab** använder din `PhoneLogin`-komponent
2. **SMS-koder** skickas via Firebase
3. **reCAPTCHA** skyddar mot bot-attacker
4. **Efter inloggning** → redirect till huvudsidan

## 📞 **Support:**
Om du behöver hjälp med Firebase-konfiguration, kontakta mig!

## 🚨 **Viktigt:**
- Du MÅSTE konfigurera Firebase enligt ovan
- Utan .env.local kommer OTP inte att fungera
- Använd ditt test-telefonnummer för utveckling
