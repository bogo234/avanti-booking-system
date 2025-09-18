# DNS Fix för avantidriver.com

## Problem
- `www.avantidriver.com` fungerar ✅
- `avantidriver.com` (utan www) fungerar inte ❌

## Orsak
DNS-poster är inte korrekt konfigurerade. Just nu:
- `avantidriver.com` pekar på `76.76.19.61` (fel server)
- `www.avantidriver.com` pekar på Vercel-servrar (korrekt)

## Lösning

### 1. Logga in på din domänregistrator
Gå till din domänregistrator (t.ex. Namecheap, GoDaddy, etc.) där du köpte `avantidriver.com`.

### 2. Uppdatera DNS-poster
Du behöver lägga till/ändra följande DNS-poster:

#### A-poster:
```
Type: A
Name: @
Value: 76.76.19.61
TTL: 300
```

**Ändra till:**
```
Type: A
Name: @
Value: 76.76.19.61
TTL: 300
```

#### CNAME-poster:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 300
```

### 3. Alternativ: Använd Vercel DNS
Om din domänregistrator stöder det, ändra nameservers till:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### 4. Verifiera i Vercel Dashboard
1. Gå till [vercel.com/dashboard](https://vercel.com/dashboard)
2. Välj ditt projekt `avanti-booking-system`
3. Gå till **Settings** → **Domains**
4. Lägg till `avantidriver.com` (utan www)
5. Följ instruktionerna för DNS-konfiguration

### 5. Testa efter ändringar
```bash
# Testa DNS-upplösning
nslookup avantidriver.com
nslookup www.avantidriver.com

# Testa webbplatsen
curl -I https://avantidriver.com
curl -I https://www.avantidriver.com
```

## Förväntat resultat
Efter korrekt DNS-konfiguration ska båda domänerna peka på Vercel-servrar:
- `avantidriver.com` → Vercel-servrar
- `www.avantidriver.com` → Vercel-servrar

## Support
Om du behöver hjälp med DNS-konfiguration, kontakta din domänregistrator eller Vercel support.
