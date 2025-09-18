# One.com DNS-konfiguration för avantidriver.com

## Steg-för-steg guide för one.com

### 1. Logga in på one.com
1. Gå till [one.com](https://one.com)
2. Logga in med dina uppgifter
3. Välj din domän `avantidriver.com`

### 2. Gå till DNS-hantering
1. I kontrollpanelen, leta efter **"DNS"** eller **"Domänhantering"**
2. Klicka på **"DNS-poster"** eller **"DNS Management"**
3. Välj `avantidriver.com`

### 3. Uppdatera DNS-poster

#### Ta bort gamla poster (om de finns):
- Ta bort alla A-poster för `@` (root domain)
- Ta bort alla CNAME-poster för `www`

#### Lägg till nya poster:

**A-post för root domain:**
```
Typ: A
Namn: @
Värde: 76.76.19.61
TTL: 300 (eller standard)
```

**CNAME-post för www:**
```
Typ: CNAME
Namn: www
Värde: cname.vercel-dns.com
TTL: 300 (eller standard)
```

### 4. Alternativ: Använd Vercel DNS (Rekommenderat)

Om one.com stöder nameserver-ändring:

1. I one.com kontrollpanel, leta efter **"Nameservers"** eller **"Nameserver"**
2. Ändra till:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

### 5. Verifiera i Vercel Dashboard

1. Gå till [vercel.com/dashboard](https://vercel.com/dashboard)
2. Välj projektet `avanti-booking-system`
3. Gå till **Settings** → **Domains**
4. Lägg till `avantidriver.com` (utan www)
5. Följ Vercel's instruktioner för DNS-konfiguration

### 6. Vänta på DNS-propagation

DNS-ändringar kan ta 24-48 timmar att sprida sig globalt, men ofta fungerar det inom några timmar.

### 7. Testa efter ändringar

```bash
# Testa DNS-upplösning
nslookup avantidriver.com
nslookup www.avantidriver.com

# Testa webbplatsen
curl -I https://avantidriver.com
curl -I https://www.avantidriver.com
```

## Förväntat resultat

Efter korrekt konfiguration ska båda domänerna peka på Vercel:
- `avantidriver.com` → Vercel-servrar
- `www.avantidriver.com` → Vercel-servrar

## Felsökning

### Om det inte fungerar efter 24 timmar:
1. Kontrollera att DNS-poster är korrekt konfigurerade
2. Kontakta one.com support
3. Kontakta Vercel support för hjälp med domänkonfiguration

### One.com support:
- E-post: support@one.com
- Telefon: Kontrollera one.com för aktuella kontaktuppgifter

## Just nu fungerar:
- ✅ `https://www.avantidriver.com` - Använd denna tills DNS är fixat
- ✅ Alla funktioner fungerar perfekt
