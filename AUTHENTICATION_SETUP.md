# Authentication Setup Guide

This application uses secure email and password authentication. Follow these steps to set up authentication.

## Backend Setup

### 1. Install Dependencies

Dependencies are already installed, but if needed:
```bash
cd backend
npm install jsonwebtoken bcryptjs cookie-parser
```

### 2. Environment Variables

Add the following to your `backend/.env` file:

```env
# Authentication Configuration
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key-min-64-characters-long
JWT_EXPIRY=24h
```

### 3. Generate Password Hash (Recommended)

For better security, you can hash your password before storing it in the `.env` file:

```bash
cd backend
node scripts/hashPassword.js your-password
```

This will output a bcrypt hash. Use that hash as your `ADMIN_PASSWORD` value.

**OR** you can use a plain password - it will be automatically hashed on first use.

### 4. Generate JWT Secret

Generate a secure random string for JWT_SECRET (minimum 64 characters):

**On Linux/Mac:**
```bash
openssl rand -hex 64
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Or use Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Frontend Setup

No additional setup required. The frontend automatically:
- Redirects unauthenticated users to `/login`
- Includes auth tokens in API requests
- Handles token expiration

## Security Features

### Industry-Standard Security Measures:

1. **Password Hashing**: Uses bcrypt with 12 salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **HTTP-Only Cookies**: Optional additional security layer
4. **Rate Limiting**: Login endpoint limited to 5 attempts per 15 minutes
5. **Token Expiration**: Configurable token expiry (default: 24 hours)
6. **Secure Headers**: Helmet.js security headers
7. **CORS Protection**: Configured CORS with credentials
8. **Input Validation**: Email format and required field validation
9. **Constant-Time Comparison**: Prevents timing attacks
10. **Protected Routes**: All dashboard routes require authentication

## Usage

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173`
4. You'll be redirected to `/login`
5. Enter your `ADMIN_EMAIL` and `ADMIN_PASSWORD`
6. Upon successful login, you'll be redirected to the dashboard

## API Endpoints

- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/verify` - Verify authentication token (protected)
- `POST /api/auth/logout` - Logout (protected)

## Protecting Backend Routes

To protect a backend route, use the `authenticate` middleware:

```javascript
import { authenticate } from "../middleware/auth.js";

router.get("/protected-route", authenticate, yourController);
```

## Troubleshooting

### "Authentication not configured"
- Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`

### "JWT_SECRET must be set"
- Add `JWT_SECRET` to your `.env` file (minimum 64 characters)

### "Invalid email or password"
- Verify your credentials match the `.env` file
- Check that email comparison is case-insensitive
- If using a hashed password, ensure it starts with `$2a$` or `$2b$`

### Token expires too quickly
- Adjust `JWT_EXPIRY` in `.env` (e.g., "7d" for 7 days, "1h" for 1 hour)

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** (minimum 12 characters, mixed case, numbers, symbols)
3. **Rotate JWT_SECRET** periodically in production
4. **Use HTTPS** in production
5. **Set secure cookie flags** in production (already configured)
6. **Monitor login attempts** for suspicious activity
7. **Keep dependencies updated** for security patches

