# 🚗 Avanti Bokningssystem

Ett komplett, lagligt och användarvänligt bokningssystem för både förare och kunder.

## ✨ Funktioner

### 🎯 **För kunder:**
- **Modern 3-stegs bokningsprocess** med progress-indikator
- **Google Places Autocomplete** för enkel adressval
- **Realtidsprisberäkning** baserat på avstånd och service
- **Laglig compliance** med villkor och integritetspolicy
- **Bokningshistorik** och statusspårning
- **Kontakt med förare** under resan

### 🚘 **För förare:**
- **Online/Offline toggle** för tillgänglighet
- **Realtids bokningsnotifikationer**
- **Steg-för-steg resa-hantering** (på väg → anlände → starta → slutför)
- **Chaufför-profil** med rating och statistik
- **Enkel navigering** mellan bokningar

### 🛡️ **Laglighet & Säkerhet:**
- **GDPR-kompatibel** databehandling
- **Villkor och integritetspolicy** integrerade
- **Säker betalningshantering**
- **Försäkringsacknowledgment**
- **Nödkontakt-information**

## 🎨 Design

### **Minimalistisk & Tidlös:**
- **Glassmorphism** design med backdrop-filter
- **Gradient-bakgrunder** för modern känsla
- **Smooth animationer** och övergångar
- **Responsiv design** för alla enheter
- **Konsistent färgschema** (blå accent-färg)

### **Användarupplevelse:**
- **Intuitiv navigering** med progress-indikatorer
- **Tydlig feedback** för alla åtgärder
- **Loading states** och error handling
- **Accessibility** fokuserad

## 📁 Filsstruktur

```
app/
├── components/
│   ├── ModernBookingForm.tsx      # Huvudbokningsformulär
│   ├── DriverDashboard.tsx        # Förare-dashboard
│   ├── CustomerDashboard.tsx      # Kund-dashboard
│   └── GooglePlacesAutocomplete.tsx # Adressautocomplete
├── types/
│   └── booking.ts                 # TypeScript-typer
├── styles/
│   └── booking-system.css         # Moderna stilar
├── booking/
│   └── page.tsx                   # Bokningssida
├── driver/
│   └── page.tsx                   # Förare-dashboard
└── customer/
    └── page.tsx                   # Kund-dashboard
```

## 🚀 Användning

### **För kunder:**
1. Gå till `/booking` för att boka en resa
2. Följ 3-stegs processen:
   - **Steg 1:** Välj upphämtningsplats och destination
   - **Steg 2:** Välj service och tid
   - **Steg 3:** Bekräfta och acceptera villkor
3. Gå till `/customer` för att spåra bokningar

### **För förare:**
1. Gå till `/driver` för att öppna dashboard
2. Aktivera dig som "Online"
3. Acceptera tillgängliga bokningar
4. Uppdatera status under resan

## 🔧 Teknisk Implementation

### 📚 Firestore-schema (Collections & fält)

Users (`users`)
- uid: string
- email: string
- emailVerified: boolean
- displayName: string | null
- phone: string | null
- role: 'customer' | 'driver' | 'admin'
- profile:
  - name: string
  - phone?: string
  - preferences:
    - defaultAddresses: { home?: { address, coordinates? }, work?: { address, coordinates? } }
    - notifications: { email: boolean; sms: boolean; push: boolean }
    - language: 'sv' | 'en'
- metadata: { createdAt, updatedAt, lastLogin?, emailVerificationSentAt? }
- status: 'active' | 'suspended' | 'pending_verification'

Drivers (`drivers`)
- name: string
- email: string
- phone: string
- car: string
- licensePlate: string
- status: 'available' | 'busy' | 'offline'
- location?: { lat: number; lng: number }
- rating: number
- totalRides: number
- createdAt, updatedAt

Bookings (`bookings`)
- customerId: string | null
- customerEmail: string
- customer: { name: string; phone: string; email: string }
- pickup: { address: string; time: string; coordinates?: { lat; lng } }
- destination: { address: string; coordinates?: { lat; lng } }
- service: 'standard' | 'premium' | 'luxury'
- licensePlate: string
- status: 'waiting' | 'accepted' | 'on_way' | 'arrived' | 'completed' | 'cancelled'
- driver?: { id: string; name: string; phone: string; car: string; licensePlate: string; location?: { lat; lng } }
- price: number
- paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
- paymentId?: string
- paymentMethod?: string
- paidAt?: any
- createdAt, updatedAt

Messages (`messages`)
- bookingId: string
- senderId: string
- senderType: 'customer' | 'driver'
- message: string
- timestamp

Notifications (`notifications`)
- type: 'booking' | 'driver' | 'system'
- title?: string
- message: string
- bookingId?: string
- userId?: string
- read: boolean
- createdAt, updatedAt?

Statusflöden (bokningar)
- requested/waiting → accepted → on_way → arrived → completed
- Avvikelse: cancelled när kund/förare/adm. avbryter.

### 🔎 Firestore-index som krävs
- bookings: where(status == X) + orderBy(createdAt desc)
- bookings: where(customerId == uid) + orderBy(createdAt desc)
- bookings: where(driver.id == uid) + orderBy(createdAt desc)
- messages: where(bookingId == id) + orderBy(timestamp asc)
- users: orderBy(createdAt desc)
- drivers: orderBy(createdAt desc)

Observera: Index skapas i Firebase Console eller via `firestore.indexes.json`. Fältnamn måste matcha exakt (t.ex. `driver.id`).

### **Frontend:**
- **Next.js 15** med App Router
- **TypeScript** för type safety
- **CSS Modules** för styling
- **Google Maps API** för adressval

### **State Management:**
- **React Hooks** för lokal state
- **Context API** för global auth/roll (via `app/contexts/AuthContext.tsx`)
- **Realtidsdata via Firestore** (`onSnapshot`) för bokningar, förare, meddelanden, användare

### **API Integration:**
- **Next.js API routes** (server):
  - `app/api/create-payment-intent/route.ts` (Stripe PaymentIntent)
  - `app/api/stripe-webhook/route.ts` (Stripe webhook: paid/failed/canceled → uppdaterar `bookings` + notis)
  - `app/api/update-driver-location/route.ts` (uppdaterar `drivers.location` och ev. `bookings.driver.location`)
- **Firebase Firestore** för realtid i UI, ingen WebSocket-infrastruktur behövs
- **Google Maps JS API** för rutt/markörer/live-karta

## 📱 Responsiv Design

Systemet är fullt responsivt och fungerar på:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

## 🔒 Säkerhet & Compliance

### **Dataskydd:**
- **GDPR-kompatibel** databehandling
- **Krypterad dataöverföring**
- **Säker session-hantering**

### **Laglighet:**
- **Användarvillkor** och integritetspolicy
- **Försäkringsacknowledgment**
- **Avbokningspolicy**
- **Nödkontakt-information**

## 🎯 Nästa Steg

### **Kortsiktigt:**
- [ ] Implementera backend API
- [ ] Lägg till betalningsintegration
- [ ] Real-time tracking med WebSockets
- [ ] Push-notifikationer

### **Långsiktigt:**
- [ ] AI-driven prissättning
- [ ] Förare-optimering
- [ ] Kundlojalitetsprogram
- [ ] Analytics och rapportering

## 🛠️ Utveckling

### **Installation:**
```bash
npm install
npm run dev
```

### **Miljövariabler (lästa från miljön):**
- Firebase (public): `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Stripe (server): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

Applikationen läser dessa från befintliga miljövariabler i körmiljön.

### **Bygga för produktion:**
```bash
npm run build
npm start
```

## 📞 Support

För tekniska frågor eller support, kontakta utvecklingsteamet.

---

**Avanti Bokningssystem** - Modern, säker och användarvänlig transportlösning 🚗✨
