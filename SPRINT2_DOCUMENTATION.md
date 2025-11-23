# Sprint 2 - Backend Integration Documentation

## Overview

Sprint 2 focused on building a complete backend infrastructure for the Smart Pantry application, connecting the frontend to a real database, and implementing user authentication. The project now uses **Supabase** as the backend-as-a-service platform, providing authentication, database, and API capabilities.

## What Was Accomplished

### ✅ Backend Infrastructure
- **FastAPI Backend**: Complete REST API built with FastAPI
- **Supabase Integration**: Connected to Supabase for database and authentication
- **Database Schema**: Created tables for users (profiles) and pantry items with expiration tracking
- **API Endpoints**: Full CRUD operations for pantry items

### ✅ Authentication System
- **User Signup**: Users can create accounts via Supabase Auth
- **User Login**: Secure authentication with Supabase
- **Session Management**: Cookie-based session handling
- **Protected Routes**: API endpoints require authentication

### ✅ Frontend Integration
- **API Service Layer**: Created reusable API functions (`lib/api.ts`)
- **Real Data**: Pantry page now fetches data from the database
- **Loading States**: User-friendly loading indicators
- **Error Handling**: Graceful error messages and retry options

### ✅ Database Schema
- **Profiles Table**: User profile information
- **Items Table**: Pantry items with expiration dates, quantities, and user ownership
- **Row Level Security**: Users can only access their own data
- **Indexes**: Optimized queries for performance

## Tech Stack

### Backend
- **FastAPI**: Python web framework for building APIs
- **Supabase Python Client**: Official Supabase SDK for Python
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server for running FastAPI

### Frontend
- **Next.js**: React framework
- **TypeScript**: Type-safe JavaScript
- **Fetch API**: For making HTTP requests

### Database & Auth
- **Supabase**: Backend-as-a-service platform
- **PostgreSQL**: Database (managed by Supabase)
- **Supabase Auth**: Authentication service

## Project Structure

```
CSC-401-senior-capstone-project/
├── api/
│   ├── src/
│   │   └── main.py          # FastAPI backend application
│   └── requirements.txt     # Python dependencies
├── app/
│   └── (routes)/
│       ├── login/           # Login page
│       ├── signup/          # Signup page
│       └── pantry/          # Pantry page
├── components/
│   └── DashboardHome.tsx    # Main pantry dashboard component
├── lib/
│   ├── api.ts              # API service functions
│   └── config.ts           # Configuration (API URLs)
├── db/
│   └── supabase_schema.sql # Database schema (if exists)
└── .env                    # Environment variables (not in git)
```

## Setup Instructions

### Prerequisites
- Python 3.12+ installed
- Node.js and npm installed
- Supabase account and project

### 1. Clone and Setup

```bash
# Make sure you're on the Sprint2 branch
git checkout Sprint2

# Install frontend dependencies
npm install

# Install backend dependencies
cd api
pip install -r requirements.txt
cd ..
```

### 2. Supabase Configuration

1. **Create Supabase Project** (if not already done):
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and keys

2. **Set Up Database Schema**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the database schema SQL (see Database Schema section below)

3. **Get Your Keys**:
   - Go to Settings → API
   - Copy your:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - Service Role Key (secret key for backend)

4. **Configure Email Confirmation** (for development):
   - Go to Authentication → Settings
   - Disable "Enable email confirmations" for easier testing

### 3. Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:3000

# Environment
NODE_ENV=development
```

**Important**: Never commit the `.env` file to git! It's already in `.gitignore`.

### 4. Run the Application

#### Start the Backend Server

```bash
# From project root
python -m uvicorn api.src.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at: `http://localhost:8000`

#### Start the Frontend Server

```bash
# From project root (in a new terminal)
npm run dev
```

The frontend will be available at: `http://localhost:3000`

## How to Use

### 1. Sign Up

1. Navigate to `http://localhost:3000/signup`
2. Fill in your information:
   - First Name
   - Last Name
   - Email
   - Password
   - Confirm Password
3. Agree to terms and click "Create account"
4. You'll be automatically logged in and redirected to the dashboard

### 2. Log In

1. Navigate to `http://localhost:3000/login`
2. Enter your email and password
3. Click "Log in"
4. You'll be redirected to the dashboard

### 3. View Pantry Items

1. After logging in, you'll see the dashboard
2. The pantry page automatically loads your items from the database
3. You can:
   - Search items by name
   - Sort by "Recently Added" or "Expires Soonest"
   - See items with color-coded status:
     - 🟢 Green: Fresh (expires in more than 3 days)
     - 🟡 Yellow: Expiring Soon (expires in 3 days or less)
     - 🔴 Red: Expired

### 4. API Documentation

Visit `http://localhost:8000/docs` to see interactive API documentation (Swagger UI).

You can test all endpoints directly from the browser.

## API Endpoints

### Authentication

#### POST `/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "user-uuid",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST `/auth/login`
Login with existing credentials.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "user-uuid",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Pantry Items

All item endpoints require authentication. Include the user ID in the Authorization header:
```
Authorization: Bearer {user_id}
```

#### GET `/api/items`
Get all items for the authenticated user.

**Response:**
```json
[
  {
    "id": "item-uuid",
    "user_id": "user-uuid",
    "name": "Milk",
    "quantity": 2,
    "expiration_date": "2025-01-20",
    "added_at": "2025-01-15T10:00:00Z",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
]
```

#### GET `/api/items/{item_id}`
Get a single item by ID.

#### POST `/api/items`
Create a new pantry item.

**Request Body:**
```json
{
  "name": "Bread",
  "quantity": 1,
  "expiration_date": "2025-01-25"
}
```

#### PUT `/api/items/{item_id}`
Update an existing item.

**Request Body:**
```json
{
  "name": "Whole Wheat Bread",
  "quantity": 2,
  "expiration_date": "2025-01-26"
}
```

#### DELETE `/api/items/{item_id}`
Delete an item.

#### GET `/api/items/expiring/soon?days=7`
Get items expiring within the specified number of days (default: 7).

## Database Schema

### Profiles Table
Stores user profile information.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Items Table
Stores pantry inventory items.

```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    expiration_date DATE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Row Level Security (RLS)** is enabled, ensuring users can only access their own data.

## Frontend API Service

The frontend uses a centralized API service located in `lib/api.ts`.

### Available Functions

```typescript
// Get all items
const items = await getItems();

// Get single item
const item = await getItem(itemId);

// Create item
const newItem = await createItem({
  name: "Milk",
  quantity: 2,
  expiration_date: "2025-01-20"
});

// Update item
const updated = await updateItem(itemId, {
  name: "Whole Milk",
  quantity: 1
});

// Delete item
await deleteItem(itemId);

// Get expiring items
const expiring = await getExpiringItems(7); // next 7 days
```

## Troubleshooting

### Backend Won't Start
- Check that Python dependencies are installed: `pip install -r api/requirements.txt`
- Verify `.env` file exists and has correct values
- Make sure port 8000 is not in use

### "Failed to Fetch" Errors
- Ensure backend server is running on port 8000
- Check browser console for specific error messages
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env` matches backend URL

### Authentication Issues
- Make sure you're logged in (check for `sp_session` cookie)
- Verify Supabase credentials in `.env`
- Check Supabase dashboard to see if users are being created

### Database Connection Errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check that database schema has been created in Supabase
- Ensure Supabase project is active

### Email Confirmation Issues
- For development, disable email confirmation in Supabase dashboard
- Go to Authentication → Settings → Disable "Enable email confirmations"

## Testing

### Manual Testing Checklist

- [ ] Sign up a new user
- [ ] Log in with existing user
- [ ] View pantry items (should be empty initially)
- [ ] Create an item via API (using Swagger UI at `/docs`)
- [ ] Verify item appears in frontend
- [ ] Test search functionality
- [ ] Test sorting functionality
- [ ] Verify expiration status colors (fresh/expiring/expired)

### API Testing

Use the Swagger UI at `http://localhost:8000/docs` to test endpoints:

1. Test `/health` endpoint (no auth required)
2. Test `/auth/signup` to create a user
3. Copy the returned `token` (user_id)
4. Use that token in Authorization header: `Bearer {user_id}`
5. Test item endpoints with authentication

## Next Steps

### Immediate Priorities
1. **Add Item Form**: Create UI for adding new items
2. **Edit/Delete UI**: Add buttons to edit and delete items
3. **Testing**: Comprehensive end-to-end testing

### Future Enhancements
1. **Pagination**: For large item lists
2. **Advanced Filtering**: Filter by status, category, etc.
3. **Optimistic Updates**: Better UX when creating/updating items
4. **Token Refresh**: Handle expired sessions gracefully
5. **Logging**: Add request/response logging
6. **Deployment**: Deploy to staging/production environment

## Key Files Reference

- **Backend API**: `api/src/main.py`
- **Frontend API Service**: `lib/api.ts`
- **Pantry Component**: `components/DashboardHome.tsx`
- **Database Schema**: Run SQL in Supabase dashboard (see schema above)
- **Configuration**: `lib/config.ts` and `.env` file

## Support

If you encounter issues:
1. Check the browser console (F12) for errors
2. Check backend terminal for error messages
3. Verify all environment variables are set correctly
4. Ensure both frontend and backend servers are running
5. Check Supabase dashboard for database/auth issues

## Notes

- The backend uses Supabase's service role key for admin operations
- User authentication is handled by Supabase Auth
- Row Level Security ensures data isolation between users
- The frontend automatically handles authentication tokens from cookies
- All dates are stored in ISO format (YYYY-MM-DD)

---

**Last Updated**: Sprint 2 - Backend Integration Complete
**Branch**: `Sprint2`

