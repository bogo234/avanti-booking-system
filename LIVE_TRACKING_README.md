# 🗺️ Live Spårningssystem - Elegant Mörktema

Ett elegant och användarvänligt live-spårningssystem med mörktema och Google Maps integration.

## ✨ Funktioner

### 🎯 **Live Spårning:**
- **Realtids position** av förare på kartan
- **Ankomsttid** med live-uppdateringar
- **Status-indikator** med pulserande animation
- **Ruttvisning** mellan upphämtning och destination

### 🗺️ **Karta & Design:**
- **Mörktema** med elegant glassmorphism
- **Google Maps** med custom dark styling
- **Anpassade markörer** för förare, upphämtning och destination
- **Smooth animationer** och övergångar

### 📱 **Användarupplevelse:**
- **Responsiv design** för alla enheter
- **Elegant UI** med backdrop-filter effekter
- **Intuitiv navigering** och kontroller
- **Real-time uppdateringar**

## 🎨 Design-funktioner

### **Mörktema:**
- **Gradient bakgrunder** för djup och elegans
- **Glassmorphism** med backdrop-filter
- **Custom scrollbars** med accent-färger
- **Pulserande animationer** för status

### **Kartmarkörer:**
- **Förare:** Orange cirkel med person-ikon
- **Upphämtning:** Blå cirkel med punkt
- **Destination:** Grön cirkel med stjärna
- **Rutt:** Blå linje med opacity

### **Status-färger:**
- **Söker:** Gul (#FFC107)
- **Hittad:** Blå (#4FC3F7)
- **På väg:** Blå (#4FC3F7)
- **Anlände:** Grön (#4CAF50)

## 📁 Filsstruktur

```
app/
├── components/
│   └── LiveTrackingMap.tsx    # Huvudkomponent för live-spårning
├── styles/
│   └── live-tracking.css      # Eleganta stilar för mörktema
└── tracking/
    └── page.tsx               # Live-spårningssida
```

## 🚀 Användning

### **För kunder:**
1. Gå till `/tracking` för live-spårning
2. Se realtids position av förare
3. Följ ankomsttid och status
4. Kontakta förare direkt från kartan

### **Funktioner:**
- **Live ETA:** Uppdateras var 30:e sekund
- **Förare-info:** Klicka på förare-kortet
- **Kontakt:** Ring eller skicka meddelande
- **Dela plats:** Dela din position

## 🔧 Teknisk Implementation

### **Frontend:**
- **Next.js 15** med App Router
- **Google Maps API** för kartan
- **TypeScript** för type safety
- **CSS animations** för smooth effekter

### **Kartfunktioner:**
- **Dark theme styling** för Google Maps
- **Custom markers** med SVG-ikoner
- **Directions API** för ruttvisning
- **Real-time updates** med setInterval

### **State Management:**
- **React Hooks** för lokal state
- **useRef** för kart-instanser
- **useEffect** för cleanup

## 🎨 Design-detaljer

### **Glassmorphism:**
```css
background: rgba(255, 255, 255, 0.02);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### **Gradient-bakgrunder:**
```css
background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
```

### **Pulserande animation:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
```

## 📱 Responsiv Design

Systemet är fullt responsivt och anpassar sig till:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

### **Mobile-anpassningar:**
- **Förare-kort** flyttas till botten
- **Kompakt layout** för små skärmar
- **Touch-friendly** knappar och kontroller

## 🔒 Säkerhet & Prestanda

### **API-säkerhet:**
- **Begränsad API-nyckel** till din domän
- **HTTPS-krav** för Google Maps
- **Rate limiting** för API-anrop

### **Prestanda:**
- **Lazy loading** av kartan
- **Optimized animations** med CSS
- **Efficient re-renders** med React

## 🎯 Nästa Steg

### **Kortsiktigt:**
- [ ] Real GPS-integration
- [ ] Push-notifikationer
- [ ] Offline-stöd
- [ ] Flerspråksstöd

### **Långsiktigt:**
- [ ] WebSocket för real-time updates
- [ ] AI-driven ETA-beräkning
- [ ] Traffic-integration
- [ ] Voice navigation

## 🛠️ Utveckling

### **Installation:**
```bash
npm install
npm run dev
```

### **Miljövariabler:**
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
```

### **Testa live-spårning:**
1. Gå till `http://localhost:3001/tracking`
2. Se mock-förare röra sig på kartan
3. Testa alla interaktioner

## 📞 Support

För tekniska frågor eller support, kontakta utvecklingsteamet.

---

**Live Spårningssystem** - Elegant, användarvänlig och realtidsuppdaterad 🗺️✨
