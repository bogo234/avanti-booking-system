# 🔐 Robust Authentication Backend APIs

Produktionsklara, säkra backend API:er för autentiseringssystemet i Avanti-appen.

## 📚 API Översikt

### 🔑 **Säkerhetsförbättringar**
- **Rate Limiting**: Skyddar mot brute-force attacker
- **Input Validation**: Zod schema validation för alla endpoints
- **JWT Verification**: Säker token-verifiering för alla requests
- **Audit Logging**: Spårning av säkerhetshändelser
- **GDPR Compliance**: Säker datahantering och anonymisering

### 🛡️ **Produktionsklara funktioner**
- **Error Handling**: Robusta felmeddelanden och HTTP status codes
- **Session Management**: Avancerad sessionshantering med cleanup
- **Device Tracking**: Spårning av enheter och plattformar
- **Automatic Cleanup**: Periodisk rensning av gamla sessioner och rate limits

---

## 🔗 API Endpoints

### 1. **Användarprofilhantering** - `/api/auth/profile`

#### `GET /api/auth/profile`
Hämtar användarens profil med säker filtrering.

**Headers:**
```
Authorization: Bearer <firebase-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user123",
    "email": "user@example.com",
    "emailVerified": true,
    "role": "customer",
    "profile": {
      "name": "John Doe",
      "phone": "+46701234567",
      "preferences": {
        "defaultAddresses": {
          "home": { "address": "Hemgatan 1" },
          "work": { "address": "Kontorsgatan 2" }
        },
        "notifications": {
          "email": true,
          "sms": true,
          "push": true
        },
        "language": "sv"
      }
    },
    "status": "active",
    "metadata": {
      "createdAt": "2024-01-01T12:00:00Z",
      "lastLogin": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### `PUT /api/auth/profile`
Uppdaterar användarens profil.

**Request Body:**
```json
{
  "profile": {
    "name": "John Doe Updated",
    "phone": "+46701234567",
    "preferences": {
      "notifications": {
        "email": false,
        "sms": true,
        "push": true
      }
    }
  }
}
```

#### `DELETE /api/auth/profile`
Tar bort användarkonto (GDPR-kompatibel anonymisering).

**Request Body:**
```json
{
  "confirmDelete": "DELETE_MY_ACCOUNT"
}
```

---

### 2. **Lösenordshantering** - `/api/auth/password`

#### `POST /api/auth/password`
Ändrar användarens lösenord med styrka-validering.

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "NewStrongP@ssw0rd!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully",
  "strengthScore": 6
}
```

#### `PUT /api/auth/password`
Begär lösenordsåterställning via email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### `GET /api/auth/password?password=testpassword`
Kontrollerar lösenordsstyrka.

**Response:**
```json
{
  "success": true,
  "strength": {
    "score": 4,
    "maxScore": 6,
    "level": "medium",
    "feedback": ["Include special characters"]
  }
}
```

---

### 3. **Email-verifiering** - `/api/auth/email-verification`

#### `POST /api/auth/email-verification`
Skickar verifieringsmail.

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "email": "us***@example.com",
  "expiresIn": "24 hours"
}
```

#### `PUT /api/auth/email-verification`
Kontrollerar och uppdaterar verifieringsstatus.

**Response:**
```json
{
  "success": true,
  "verified": true,
  "message": "Email verified successfully",
  "statusChanged": true,
  "newStatus": "active"
}
```

#### `GET /api/auth/email-verification`
Hämtar verifieringsstatus och statistik.

**Response:**
```json
{
  "success": true,
  "emailVerified": true,
  "email": "us***@example.com",
  "status": "active",
  "rateLimiting": {
    "canSendNow": true,
    "attemptsRemaining": 4
  }
}
```

---

### 4. **Session-hantering** - `/api/auth/session`

#### `POST /api/auth/session`
Skapar ny session med device tracking.

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "sess_1642234567_abc123",
    "expiresAt": "2024-01-16T12:00:00Z",
    "deviceInfo": {
      "platform": "mac"
    }
  },
  "user": {
    "uid": "user123",
    "email": "user@example.com",
    "role": "customer",
    "emailVerified": true,
    "status": "active"
  }
}
```

#### `GET /api/auth/session?action=list`
Listar alla aktiva sessioner.

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "deviceInfo": {
        "platform": "mac",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X..."
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "lastActivity": "2024-01-15T12:00:00Z",
      "expiresAt": "2024-01-16T12:00:00Z",
      "isCurrent": true
    }
  ],
  "totalActiveSessions": 1
}
```

#### `DELETE /api/auth/session?action=all`
Avslutar alla sessioner.

**Response:**
```json
{
  "success": true,
  "message": "Successfully revoked 3 session(s)",
  "revokedCount": 3,
  "action": "all"
}
```

#### `PUT /api/auth/session`
Uppdaterar session-aktivitet (heartbeat).

---

## 🔒 Säkerhetsfunktioner

### **Rate Limiting**
- **Profil API**: 10 requests per 15 minuter
- **Lösenord API**: 3 ändringar per timme
- **Email-verifiering**: 5 emails per timme, minimum 2 minuter mellan emails
- **Session API**: 20 operationer per 15 minuter

### **Input Validation**
- **Zod schemas** för all input-validering
- **Lösenordsstyrka**: Minimum 8 tecken, stora/små bokstäver, siffror, specialtecken
- **Email-format**: RFC-kompatibel validering
- **Telefonnummer**: Internationellt format (+46...)

### **Audit Logging**
- Alla säkerhetshändelser loggas
- Timestamps och device information
- IP-adresser och user agents
- GDPR-kompatibel loggning

### **GDPR Compliance**
- **Anonymisering** istället för hård borttagning
- **Data export** funktionalitet
- **Consent tracking** för notifications
- **Right to be forgotten** implementation

---

## 🚀 Användning i Frontend

### **Exempel: Uppdatera profil**
```typescript
const updateProfile = async (profileData: any) => {
  const token = await user.getIdToken();
  
  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error);
  }
  
  return result;
};
```

### **Exempel: Ändra lösenord**
```typescript
const changePassword = async (currentPassword: string, newPassword: string) => {
  const token = await user.getIdToken();
  
  const response = await fetch('/api/auth/password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  
  const result = await response.json();
  
  if (response.status === 429) {
    throw new Error(`Rate limited. Try again in ${result.resetIn} seconds.`);
  }
  
  if (!response.ok) {
    throw new Error(result.error);
  }
  
  return result;
};
```

---

## 🛠️ Utveckling & Deployment

### **Miljövariabler**
Dessa läses från befintlig `.env.local`:
```bash
# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# App URL
NEXTAUTH_URL=https://your-domain.com
```

### **Dependencies**
```bash
# Redan installerade
npm install zod bcryptjs @types/bcryptjs
```

### **Testing**
```bash
# Testa API endpoints
curl -X GET http://localhost:3005/api/auth/profile \
  -H "Authorization: Bearer YOUR_FIREBASE_JWT"
```

---

## 📈 Prestanda & Skalbarhet

### **In-Memory Caching**
- Rate limiting data
- Active sessions
- Periodisk cleanup av gamla entries

### **Produktionsförbättringar**
För produktion, överväg:
- **Redis** för session storage och rate limiting
- **Database** för audit logs
- **Email service** (SendGrid, AWS SES) för verifieringsmail
- **CDN** för statiska assets
- **Load balancing** för hög tillgänglighet

---

## 🔍 Monitoring & Debugging

### **Loggar**
Alla API:er loggar viktiga händelser:
```javascript
console.log(`Profile updated for user: ${uid}`, {
  updatedFields: ['name', 'phone'],
  timestamp: new Date().toISOString(),
  userAgent: 'Mozilla/5.0...'
});
```

### **Error Tracking**
Strukturerade felloggar med:
- Error message och stack trace
- Timestamp
- User context
- Request information

---

**🎉 Backend API:erna är nu produktionsklara med robust säkerhet och prestanda!**
