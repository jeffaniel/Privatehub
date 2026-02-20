# Security Configuration Guide

## Overview

This document outlines the security configuration and deployment recommendations for the LincolnVoice anonymous feedback platform.

---

## 🔒 Anonymous User Protection

### IP Address Handling
- **Never store** raw IP addresses for anonymous submissions
- Use `anonymizeIP()` from `lib/anonymization.ts` for admin logs only
- Configure Supabase to not log submission IPs

### Metadata Prevention
```typescript
import { sanitizeSubmissionMetadata } from '@/lib/anonymization'

// Before storing submission
const cleanData = sanitizeSubmissionMetadata(submissionData)
```

### Tor-Friendly Practices
- Don't block Tor exit nodes
- Use `isTorRequest()` to detect Tor users
- Provide clear privacy policy for Tor users

---

## 🛡️ Admin Panel Isolation

### Subdomain Recommendation
**Recommended Setup:**
```
Public Site: feedback.example.com
Admin Panel: admin-secure.example.com
```

### IP Whitelisting
Add to environment variables:
```env
ADMIN_IP_WHITELIST=192.168.1.100,203.0.113.50
```

Use in middleware:
```typescript
import { isIPWhitelisted, getClientIP } from '@/lib/api-security'

const ip = getClientIP(request)
if (!isIPWhitelisted(ip, process.env.ADMIN_IP_WHITELIST?.split(','))) {
  return new NextResponse('Access denied', { status: 403 })
}
```

---

## 🔐 Multi-Factor Authentication

### Database Setup
Run `db-security.sql` to create MFA tables.

### MFA Implementation (Future)
```typescript
// Install: npm install otplib qrcode
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Generate secret
const secret = authenticator.generateSecret()

// Generate QR code
const otpauth = authenticator.keyuri(email, 'LincolnVoice', secret)
const qrCode = await QRCode.toDataURL(otpauth)

// Verify token
const isValid = authenticator.verify({ token, secret })
```

---

## 📊 Audit Logging

### Enable Audit Logging
```typescript
import { logAuditEvent, logLoginAttempt } from '@/lib/audit-enhanced'

// Log admin action
await logAuditEvent({
  admin_email: admin.email,
  admin_id: admin.id,
  action: 'delete_submission',
  resource_type: 'submission',
  resource_id: submissionId,
  status: 'success'
})

// Log login
await logLoginAttempt(email, true, ipAddress, userAgent)
```

### View Audit Logs
```typescript
import { getAuditLogs } from '@/lib/audit-enhanced'

const logs = await getAuditLogs({
  adminId: admin.id,
  startDate: new Date('2026-01-01'),
  limit: 100
})
```

---

## 🚨 Security Monitoring

### Detect Suspicious Activity
```typescript
import { detectSuspiciousLogin, processSecurityEvent } from '@/lib/security-monitoring'

const event = await detectSuspiciousLogin(email, ip, userAgent, previousLogins)
if (event) {
  await processSecurityEvent(event)
}
```

### Monitor Data Access
```typescript
import { detectUnusualDataAccess } from '@/lib/security-monitoring'

const event = detectUnusualDataAccess(adminId, 'export_data', 150, 5)
if (event) {
  await processSecurityEvent(event)
}
```

---

## 🔑 Password Security

### Enforce Strong Passwords
```typescript
import { validatePasswordStrength } from '@/lib/password-security'

const strength = validatePasswordStrength(password)
if (!strength.isStrong) {
  return { error: strength.feedback.join(', ') }
}
```

### Check Breached Passwords
```typescript
import { checkPasswordBreach } from '@/lib/password-security'

const isBreached = await checkPasswordBreach(password)
if (isBreached) {
  return { error: 'This password has been found in data breaches' }
}
```

---

## 📁 File Upload Security

### Validate Uploads
```typescript
import { validateFile, verifyFileSignature } from '@/lib/file-security'

const validation = validateFile(file)
if (!validation.valid) {
  return { errors: validation.errors }
}

const isValid = await verifyFileSignature(file)
if (!isValid) {
  return { error: 'File type mismatch' }
}
```

### Secure File Storage
- Store files outside web root
- Use `generateSecureFilePath()` for paths
- Serve with `Content-Disposition: attachment`

---

## 🧹 Input Sanitization

### Sanitize User Input
```typescript
import { sanitizeHTML, sanitizeText } from '@/lib/sanitization'

// For display
const safeHTML = sanitizeHTML(userInput)

// For plain text
const safeText = sanitizeText(userInput)
```

### Validate API Requests
```typescript
import { validateRequestBody } from '@/lib/api-security'

const validation = validateRequestBody(body, {
  subject: { type: 'string', required: true, minLength: 5, maxLength: 200 },
  description: { type: 'string', required: true, maxLength: 5000 },
  category: { type: 'string', required: true }
})

if (!validation.valid) {
  return { errors: validation.errors }
}
```

---

## 🔄 Data Retention

### Configure Retention Policies
Edit `data_retention_policies` table in Supabase:
```sql
UPDATE data_retention_policies 
SET retention_days = 365, auto_delete = TRUE 
WHERE resource_type = 'submission';
```

### Run Cleanup
```sql
SELECT cleanup_old_data();
```

### Schedule Cleanup (Supabase)
Create a cron job in Supabase Dashboard:
```sql
-- Run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-data',
  '0 2 * * *',
  'SELECT cleanup_old_data()'
);
```

---

## 🌐 Security Headers

Already configured in `next.config.mjs` and `middleware.ts`:
- ✅ HSTS
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ CSP (Content Security Policy)

---

## 🔐 Environment Variables

### Required Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Optional: Redis Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional: IP Whitelist for Admin
ADMIN_IP_WHITELIST=192.168.1.100,203.0.113.50

# Optional: Monitoring
NEXT_PUBLIC_SENTRY_DSN=
```

---

## 📋 Security Checklist

### Before Deployment
- [ ] Run `db-security.sql` in Supabase
- [ ] Configure IP whitelist for admin panel
- [ ] Set up strong admin passwords (16+ characters)
- [ ] Enable audit logging
- [ ] Configure data retention policies
- [ ] Set up security monitoring alerts
- [ ] Review and tighten CSP policy
- [ ] Enable HTTPS only
- [ ] Configure backup encryption
- [ ] Test account lockout mechanism
- [ ] Verify file upload restrictions
- [ ] Test CSRF protection
- [ ] Review CORS configuration

### Post-Deployment
- [ ] Monitor audit logs daily
- [ ] Review security alerts
- [ ] Test MFA setup
- [ ] Conduct penetration testing
- [ ] Run vulnerability scans
- [ ] Review access logs
- [ ] Test disaster recovery
- [ ] Verify backup integrity

---

## 🚀 Deployment Recommendations

### Vercel Deployment
```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Deploy
vercel --prod
```

### Environment Setup
1. Add all environment variables in Vercel dashboard
2. Enable "Automatically expose System Environment Variables"
3. Configure custom domain
4. Enable HTTPS redirect

### Database Migration
```sql
-- Run in Supabase SQL Editor
\i db-security.sql
```

---

## 📞 Incident Response

### If Breach Detected
1. Lock affected accounts immediately
2. Review audit logs for unauthorized access
3. Notify affected users (if identifiable)
4. Change all admin passwords
5. Rotate API keys
6. Review and patch vulnerability
7. Document incident in security_alerts table

### Emergency Contacts
- Database Admin: [email]
- Security Lead: [email]
- Legal: [email]

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)
