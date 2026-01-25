# Phase 1: Authentication Service - Complete Documentation

## Overview

The Authentication Service handles user account management and JWT-based authentication for the FocusHub platform.

**Port**: 3001  
**Database**: `focushub_auth`  
**Tests**: 17/17 passing ✅  
**Endpoints**: 7

---

## Simple Explanation

**What it does**: Manages user accounts and login

Think of it like the "bouncer" at a club:
- Checks IDs (login)
- Remembers who's allowed in (JWT tokens)
- Gives out VIP passes (access tokens)
- Refreshes expired passes (refresh tokens)

---

## Database Schema

### `users` Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

---

## API Endpoints (7 Total)

### 1. POST /register - Create Account

**Simple**: Sign up for a new account

**Request**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "username": "john_doe",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

**Postman Setup**:
```
Method: POST
URL: {{base_url}}/register
Body (JSON):
{
  "email": "test@example.com",
  "password": "Test123!",
  "username": "testuser"
}

Test Script:
pm.test("Registration successful", function() {
    pm.response.to.have.status(201);
    var jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.data.tokens.accessToken);
    pm.environment.set("refresh_token", jsonData.data.tokens.refreshToken);
});
```

---

### 2. POST /login - User Login

**Simple**: Log into your account

**Request**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "username": "john_doe"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 3600
    }
  }
}
```

**Postman Setup**:
```
Method: POST
URL: {{base_url}}/login
Body (JSON):
{
  "email": "test@example.com",
  "password": "Test123!"
}

Test Script:
pm.test("Login successful", function() {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.data.tokens.accessToken);
    pm.environment.set("refresh_token", jsonData.data.tokens.refreshToken);
});
```

---

### 3. POST /refresh - Refresh Access Token

**Simple**: Get a new access token when yours expires

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

**Postman Setup**:
```
Method: POST
URL: {{base_url}}/refresh
Body (JSON):
{
  "refreshToken": "{{refresh_token}}"
}

Test Script:
pm.test("Token refreshed", function() {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.environment.set("access_token", jsonData.data.accessToken);
});
```

---

### 4. POST /logout - User Logout

**Simple**: Log out of your account

**Headers**: `Authorization: Bearer {accessToken}`

**Request**:
```json
{
  "refreshToken": "eyJ..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Postman Setup**:
```
Method: POST
URL: {{base_url}}/logout
Headers:
  Authorization: Bearer {{access_token}}
Body (JSON):
{
  "refreshToken": "{{refresh_token}}"
}
```

---

### 5. GET /profile - Get User Profile

**Simple**: View your account information

**Headers**: `Authorization: Bearer {accessToken}`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "isVerified": false,
    "isActive": true,
    "createdAt": "2026-01-24T10:00:00Z"
  }
}
```

**Postman Setup**:
```
Method: GET
URL: {{base_url}}/profile
Headers:
  Authorization: Bearer {{access_token}}
```

---

### 6. PUT /profile - Update Profile

**Simple**: Change your account information

**Headers**: `Authorization: Bearer {accessToken}`

**Request**:
```json
{
  "firstName": "Johnny",
  "lastName": "Doeson"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "username": "john_doe",
    "firstName": "Johnny",
    "lastName": "Doeson"
  }
}
```

**Postman Setup**:
```
Method: PUT
URL: {{base_url}}/profile
Headers:
  Authorization: Bearer {{access_token}}
Body (JSON):
{
  "firstName": "Updated Name"
}
```

---

### 7. POST /change-password - Change Password

**Simple**: Update your password

**Headers**: `Authorization: Bearer {accessToken}`

**Request**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Postman Setup**:
```
Method: POST
URL: {{base_url}}/change-password
Headers:
  Authorization: Bearer {{access_token}}
Body (JSON):
{
  "currentPassword": "Test123!",
  "newPassword": "NewPass456!"
}
```

---

## Postman Environment Setup

Create an environment with these variables:

```
base_url = http://localhost:3001
access_token = (will be set automatically)
refresh_token = (will be set automatically)
```

---

## Complete Workflow Example

### 1. Register New User
```
POST {{base_url}}/register
→ Save tokens automatically via test script
```

### 2. Login (if already registered)
```
POST {{base_url}}/login
→ Save tokens automatically
```

### 3. Access Protected Routes
```
GET {{base_url}}/profile
Headers: Authorization: Bearer {{access_token}}
```

### 4. Update Profile
```
PUT {{base_url}}/profile
Body: {"firstName": "NewName"}
```

### 5. Refresh Token (when expired)
```
POST {{base_url}}/refresh
Body: {"refreshToken": "{{refresh_token}}"}
```

### 6. Logout
```
POST {{base_url}}/logout
```

---

## Technical Details

### Security Features
- **Password Hashing**: bcrypt with 10 rounds
- **JWT Tokens**: HS256 algorithm
- **Access Token**: Expires in 1 hour
- **Refresh Token**: Expires in 7 days
- **Rate Limiting**: 100 requests per 15 minutes

### Validation Rules
- **Email**: Valid email format, unique
- **Password**: Min 6 characters
- **Username**: 3-50 characters, unique, alphanumeric + underscore

### Error Responses

**400 Bad Request** - Invalid input:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Email is required", "Password too short"]
}
```

**401 Unauthorized** - Invalid credentials or token:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**409 Conflict** - Duplicate email/username:
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

## Testing

Run unit tests:
```bash
cd auth-service
NODE_ENV=test npm test
```

Expected: **17/17 tests passing**

---

## Database Migration

Create database and run migrations:
```bash
createdb focushub_auth
cd auth-service
npx db-migrate up
```

---

## Implementation Files

```
auth-service/
├── index.js              # Server setup
├── index.test.js         # Unit tests (17)
├── routes/
│   └── auth.js          # All 7 endpoints
├── services/
│   └── authService.js   # Business logic
└── migrations/
    └── *-create-users-table.js
```

---

## Next Steps

After authentication works:
1. Use `access_token` for all other services
2. Include in header: `Authorization: Bearer {token}`
3. Token is automatically validated by middleware

**Phase 1 Complete!** ✅
