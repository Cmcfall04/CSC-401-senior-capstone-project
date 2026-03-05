# Security Audit Report - Smart Pantry Application

**Date:** 2026-03-04  
**Application:** Smart Pantry (CSC-401 Senior Capstone Project)  
**Scope:** Full-stack security analysis (Frontend + Backend)

---

## Executive Summary

This security audit identifies **critical**, **high**, **medium**, and **low** severity vulnerabilities in the Smart Pantry application. The application uses FastAPI (backend) and Next.js (frontend) with Supabase for authentication and database management.

**Overall Security Posture:** ⚠️ **Needs Improvement**

**Critical Issues Found:** 3  
**High Severity Issues:** 5  
**Medium Severity Issues:** 4  
**Low Severity Issues:** 3

---

## Critical Vulnerabilities

### 1. **Weak Authentication Token System** 🔴 CRITICAL

**Location:** `api/src/main.py:240-254`, `app/(routes)/login/page.tsx:61`

**Issue:**
- The application uses **user_id as the authentication token** directly
- No JWT signing, no expiration, no validation
- Tokens are stored in cookies without security flags
- Comment in code: `"TODO: Replace with Firebase Auth token verification"`

**Code Evidence:**
```python
# api/src/main.py
def get_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Temporary function to extract user_id from header."""
    # For now, expect format: "Bearer user_id"
    parts = authorization.split()
    if len(parts) == 2 and parts[0] == "Bearer":
        return parts[1]  # No validation!
    return None
```

```typescript
// login/page.tsx
document.cookie = `sp_session=${data.token}; Max-Age=${60 * 60 * 24 * 30}; Path=/`;
// Missing: HttpOnly, Secure, SameSite flags
```

**Impact:**
- Anyone who knows a user_id can impersonate that user
- Tokens never expire (30-day cookie lifetime)
- No way to revoke compromised tokens
- XSS attacks can steal tokens from cookies

**Recommendation:**
- Implement proper JWT tokens with expiration
- Use Supabase's built-in JWT authentication
- Add token refresh mechanism
- Set cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`

---

### 2. **Insecure Session Cookie Configuration** 🔴 CRITICAL

**Location:** `app/(routes)/login/page.tsx:61`, `app/(routes)/signup/page.tsx:63`

**Issue:**
- Session cookies are set without security flags
- Missing `HttpOnly` flag (vulnerable to XSS)
- Missing `Secure` flag (can be sent over HTTP)
- Missing `SameSite` flag (vulnerable to CSRF)

**Code Evidence:**
```typescript
document.cookie = `sp_session=${data.token}; Max-Age=${60 * 60 * 24 * 30}; Path=/`;
```

**Impact:**
- XSS attacks can steal session tokens via `document.cookie`
- Session tokens transmitted over insecure connections
- CSRF attacks possible

**Recommendation:**
```typescript
document.cookie = `sp_session=${data.token}; Max-Age=${60 * 60 * 24 * 30}; Path=/; HttpOnly; Secure; SameSite=Strict`;
```
Note: `HttpOnly` must be set server-side, not client-side. Use Next.js API routes or middleware.

---

### 3. **No CSRF Protection** 🔴 CRITICAL

**Location:** Entire application

**Issue:**
- No CSRF tokens implemented
- No SameSite cookie protection
- State-changing operations (POST, PUT, DELETE) are vulnerable

**Impact:**
- Attackers can perform actions on behalf of authenticated users
- Malicious sites can trigger API calls using user's session

**Recommendation:**
- Implement CSRF tokens for state-changing operations
- Use `SameSite=Strict` cookie attribute
- Consider using double-submit cookie pattern
- Add CSRF middleware to FastAPI

---

## High Severity Vulnerabilities

### 4. **Overly Permissive CORS Configuration** 🟠 HIGH

**Location:** `api/src/main.py:141-187`

**Issue:**
- Development mode allows all local network IPs via regex
- `allow_methods=["*"]` and `allow_headers=["*"]` too permissive
- Regex pattern could be exploited: `r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+...)"`

**Code Evidence:**
```python
if os.getenv("NODE_ENV", "development") == "development":
    local_network_regex = r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|...)"
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=local_network_regex,  # Too permissive
        allow_credentials=True,
        allow_methods=["*"],  # Allows all HTTP methods
        allow_headers=["*"],   # Allows all headers
    )
```

**Impact:**
- Any local network application can make requests
- Production could accidentally use development CORS settings
- Allows unauthorized cross-origin requests

**Recommendation:**
- Restrict CORS to specific origins in production
- Remove wildcard methods/headers
- Use environment-specific CORS configuration
- Validate origin against allowlist

---

### 5. **No Rate Limiting** 🟠 HIGH ✅ **FIXED**

**Location:** All API endpoints

**Status:** ✅ **IMPLEMENTED** (2026-03-04)

**Implementation:**
- Rate limiting implemented using `slowapi` library
- IP-based rate limiting using `get_remote_address`
- Different limits for different endpoint types:
  - Authentication: 5 requests/minute per IP
  - Item operations: 60-100 requests/minute per IP
  - Expensive operations (recipes, receipts): 20-30 requests/minute per IP
  - Password changes: 5 requests/minute per IP

**Remaining Work:**
- Consider user-based rate limiting in addition to IP-based
- Redis-backed rate limiting for distributed systems (future enhancement)

**See:** `IMPLEMENTED_SECURITY_FEATURES.md` for details

---

### 6. **In-Memory Session Storage (Not Scalable/Secure)** 🟠 HIGH

**Location:** `api/src/main.py:48-49`

**Issue:**
- Scan sessions stored in-memory dictionary
- Lost on server restart
- No expiration/cleanup
- Not suitable for production

**Code Evidence:**
```python
# In-memory store for scan sessions (in production, use Redis or database)
scan_sessions: Dict[str, Dict] = {}
```

**Impact:**
- Session data lost on restart
- Memory exhaustion with many sessions
- No way to invalidate sessions
- Security risk if server compromised

**Recommendation:**
- Use Redis for session storage
- Implement session expiration (e.g., 10 minutes)
- Add cleanup job for expired sessions
- Store in database for persistence

---

### 7. **File Upload Security Issues** 🟠 HIGH

**Location:** `api/src/main.py:1961-2046` (receipt scanning)

**Issue:**
- No file size limits enforced
- No file type validation on backend
- Files converted to base64 (memory intensive)
- No virus/malware scanning

**Code Evidence:**
```python
image_data = await file.read()  # No size check
base64_image = base64.b64encode(image_data).decode('utf-8')
```

**Impact:**
- DoS via large file uploads
- Memory exhaustion
- Potential for malicious file uploads
- No protection against malicious images

**Recommendation:**
- Enforce file size limits (e.g., 10MB max)
- Validate file type on backend (check MIME type, magic bytes)
- Use streaming for large files
- Consider virus scanning for production
- Add file type whitelist

---

### 8. **Information Disclosure in Error Messages** 🟠 HIGH

**Location:** Multiple endpoints

**Issue:**
- Error messages may leak sensitive information
- Stack traces potentially exposed
- Database errors shown to users

**Code Evidence:**
```python
except Exception as e:
    logger.error(f"Error: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Error: {str(e)}")  # Leaks details
```

**Impact:**
- Attackers can learn about system internals
- Database structure exposed
- API keys or paths might leak

**Recommendation:**
- Use generic error messages for users
- Log detailed errors server-side only
- Implement error sanitization
- Don't expose stack traces in production

---

## Medium Severity Vulnerabilities

### 9. **Weak Password Policy** 🟡 MEDIUM

**Location:** `api/src/main.py:64-67` (SignupRequest)

**Issue:**
- No password complexity requirements
- No minimum length enforcement
- Passwords handled by Supabase (check their policy)

**Recommendation:**
- Enforce minimum 8 characters
- Require mix of uppercase, lowercase, numbers, symbols
- Check against common password lists
- Consider password strength meter

---

### 10. **No Input Sanitization for XSS** 🟡 MEDIUM

**Location:** Frontend components, API responses

**Issue:**
- User input (item names, search queries) not sanitized
- React may protect against XSS, but need to verify
- No Content Security Policy (CSP) headers

**Recommendation:**
- Sanitize all user input
- Use React's built-in XSS protection (verify it's working)
- Implement CSP headers
- Escape output in API responses

---

### 11. **Scan Token Security** 🟡 MEDIUM

**Location:** `api/src/main.py:2178-2198`

**Issue:**
- Scan tokens are UUIDs with no expiration
- Tokens stored in-memory (see issue #6)
- No rate limiting on token creation

**Code Evidence:**
```python
token = str(uuid.uuid4())
scan_sessions[token] = {
    "user_id": user_id,
    "status": "pending",
    "created_at": datetime.now().isoformat(),
    "result": None
}
# No expiration!
```

**Recommendation:**
- Add expiration time (e.g., 10 minutes)
- Implement token cleanup job
- Rate limit token creation

---

### 12. **Environment Variable Exposure Risk** 🟡 MEDIUM

**Location:** `api/src/main.py:29`

**Issue:**
- Fallback to `NEXT_PUBLIC_*` variables could expose secrets
- `NEXT_PUBLIC_*` variables are exposed to frontend

**Code Evidence:**
```python
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
```

**Impact:**
- If `SUPABASE_URL` not set, falls back to public variable
- Public variables are accessible in browser
- Could accidentally expose sensitive URLs

**Recommendation:**
- Never use `NEXT_PUBLIC_*` for sensitive data
- Fail fast if required env vars missing
- Use separate config files for frontend/backend

---

## Low Severity Issues

### 13. **Missing Security Headers** 🟢 LOW

**Issue:**
- No security headers configured (X-Frame-Options, X-Content-Type-Options, etc.)
- No HSTS (HTTP Strict Transport Security)

**Recommendation:**
- Add security headers middleware
- Implement HSTS for HTTPS
- Add X-Frame-Options: DENY
- Add X-Content-Type-Options: nosniff

---

### 14. **Logging Sensitive Information** 🟢 LOW

**Location:** Multiple locations

**Issue:**
- Passwords logged in some error paths (though Supabase handles this)
- User IDs and tokens in logs

**Recommendation:**
- Never log passwords
- Sanitize logs before writing
- Use log levels appropriately
- Consider log rotation and retention policies

---

### 15. **No Account Lockout** 🟢 LOW

**Issue:**
- No account lockout after failed login attempts
- Brute force attacks possible (see issue #5)

**Recommendation:**
- Implement account lockout after 5 failed attempts
- Lock for 15-30 minutes
- Notify user of lockout
- Consider CAPTCHA after multiple failures

---

## Positive Security Practices Found ✅

1. **Using Supabase for Authentication** - Leverages secure, managed auth service
2. **Pydantic Models for Validation** - Input validation on API endpoints
3. **Row Level Security (RLS)** - Database-level access control (mentioned in docs)
4. **Environment Variables** - API keys stored in environment (good practice)
5. **HTTPS Recommended** - Should be enforced in production
6. **Query Parameter Validation** - Using FastAPI's Query validation

---

## Recommendations Priority

### Immediate Actions (Before Production):
1. ✅ Implement proper JWT authentication
2. ✅ Add HttpOnly, Secure, SameSite cookie flags
3. ✅ Implement CSRF protection
4. ✅ **Add rate limiting** - ✅ **COMPLETED** (2026-03-04)
5. ✅ Restrict CORS configuration
6. ✅ Add file upload validation and size limits

### Short-term (Within 1-2 Weeks):
7. ✅ Move session storage to Redis/database
8. ✅ Add security headers
9. ✅ Implement account lockout
10. ✅ Sanitize error messages

### Long-term (Ongoing):
11. ✅ Regular security audits
12. ✅ Penetration testing
13. ✅ Security monitoring and logging
14. ✅ Dependency updates and vulnerability scanning

---

## Testing Recommendations

1. **Penetration Testing:**
   - Test authentication bypass
   - Test CSRF attacks
   - Test file upload exploits
   - Test rate limiting

2. **Security Scanning:**
   - Use OWASP ZAP for automated scanning
   - Run dependency vulnerability scans (npm audit, pip-audit)
   - Use Snyk or similar for dependency monitoring

3. **Code Review:**
   - Review all authentication flows
   - Review all user input handling
   - Review all file operations

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/advanced/security/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth/security)

---

## Conclusion

The Smart Pantry application has several **critical security vulnerabilities** that must be addressed before production deployment. The most urgent issues are:

1. Weak authentication token system
2. Insecure session cookies
3. Lack of CSRF protection

These should be fixed immediately. The application shows good use of managed services (Supabase) and input validation, but needs significant security hardening before it can be considered production-ready.

**Estimated Time to Fix Critical Issues:** 2-3 days  
**Estimated Time to Fix All Issues:** 1-2 weeks

---

*This audit was conducted through code review and analysis. For production deployment, consider hiring a professional security firm for comprehensive penetration testing.*
