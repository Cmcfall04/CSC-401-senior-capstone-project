import os
from datetime import date, datetime
from uuid import UUID
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from supabase import create_client, Client

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / ".env"
    load_dotenv(env_path)
except ImportError:
    pass  # dotenv not installed, will use system environment variables

# Get Supabase configuration from environment
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")
if not SUPABASE_SERVICE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Request/Response models for API
class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class ItemCreate(BaseModel):
    name: str
    quantity: int = 1
    expiration_date: Optional[date] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    expiration_date: Optional[date] = None

class ItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    quantity: int
    expiration_date: Optional[str] = None
    added_at: str
    created_at: str
    updated_at: str

app = FastAPI(
    title="Smart Pantry API",
    description="Backend API for Smart Pantry application using Supabase",
    version="1.0.0"
)

# CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get user_id from Authorization header (temporary - will use Firebase later)
def get_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Temporary function to extract user_id from header.
    TODO: Replace with Firebase Auth token verification
    """
    if not authorization:
        return None
    # For now, expect format: "Bearer user_id"
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0] == "Bearer":
            return parts[1]
    except:
        pass
    return None

@app.on_event("startup")
def startup():
    # Supabase client is already initialized
    pass

# Authentication endpoints
@app.post("/auth/signup")
def signup(req: SignupRequest):
    """Sign up a new user using Supabase Auth"""
    try:
        # Create user in Supabase Auth with email confirmation disabled for development
        # Using admin API to create user directly (bypasses email confirmation)
        try:
            # First, try to create user using admin API (auto-confirms email)
            admin_response = supabase.auth.admin.create_user({
                "email": req.email,
                "password": req.password,
                "email_confirm": True,  # Auto-confirm email
                "user_metadata": {
                    "name": req.name
                }
            })
            
            if not admin_response.user:
                raise HTTPException(status_code=400, detail="Failed to create user")
            
            user_id = str(admin_response.user.id)
        except Exception as admin_error:
            # Fallback to regular sign_up if admin API fails
            auth_response = supabase.auth.sign_up({
                "email": req.email,
                "password": req.password,
                "options": {
                    "data": {
                        "name": req.name
                    }
                }
            })
            
            if not auth_response.user:
                raise HTTPException(status_code=400, detail="Failed to create user")
            
            user_id = str(auth_response.user.id)
            
            # If user was created but not confirmed, try to confirm them
            try:
                supabase.auth.admin.update_user_by_id(
                    user_id,
                    {"email_confirm": True}
                )
            except:
                pass  # If we can't auto-confirm, user will need to confirm via email
        
        # Create profile in profiles table (trigger should handle this, but ensure it exists)
        try:
            supabase.table("profiles").insert({
                "id": user_id,
                "name": req.name,
                "email": req.email
            }).execute()
        except Exception as e:
            # Profile might already exist from trigger, that's okay
            pass
        
        # Return token (using user_id as token for now)
        return {
            "token": user_id,
            "user": {
                "id": user_id,
                "name": req.name,
                "email": req.email
            }
        }
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "user already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="User already exists")
        raise HTTPException(status_code=500, detail=f"Signup failed: {error_msg}")

@app.post("/auth/login")
def login(req: LoginRequest):
    """Login user using Supabase Auth"""
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_id = str(auth_response.user.id)
        
        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        profile = profile_response.data[0] if profile_response.data else None
        
        # Return token (using user_id as token for now)
        return {
            "token": user_id,
            "user": {
                "id": user_id,
                "name": profile.get("name") if profile else req.email,
                "email": req.email
            }
        }
    except Exception as e:
        error_msg = str(e)
        if "email not confirmed" in error_msg.lower() or "not confirmed" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Email not confirmed. Please check your email and click the confirmation link.")
        if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=500, detail=f"Login failed: {error_msg}")

# Health check endpoint
@app.get("/health")
def health():
    try:
        # Test Supabase connection
        result = supabase.table("items").select("id").limit(1).execute()
        return {"ok": True, "database": "connected", "supabase": "ready"}
    except Exception as e:
        return {"ok": True, "database": "error", "error": str(e)}

# Items endpoints
@app.get("/api/items", response_model=List[ItemResponse])
def list_items(user_id: Optional[str] = Depends(get_user_id)):
    """Get all items for the authenticated user"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        response = supabase.table("items").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: str, user_id: Optional[str] = Depends(get_user_id)):
    """Get a single item by ID"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        response = supabase.table("items").select("*").eq("id", item_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Item not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/items", response_model=ItemResponse, status_code=201)
def create_item(item_data: ItemCreate, user_id: Optional[str] = Depends(get_user_id)):
    """Create a new pantry item"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate expiration date is not in the past
    if item_data.expiration_date and item_data.expiration_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Expiration date cannot be in the past"
        )
    
    try:
        new_item = {
            "user_id": user_id,
            "name": item_data.name,
            "quantity": item_data.quantity,
            "expiration_date": item_data.expiration_date.isoformat() if item_data.expiration_date else None
        }
        
        response = supabase.table("items").insert(new_item).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, item_data: ItemUpdate, user_id: Optional[str] = Depends(get_user_id)):
    """Update an existing item"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if item exists and belongs to user
    try:
        check_response = supabase.table("items").select("id").eq("id", item_id).eq("user_id", user_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Item not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Build update data
    update_data = {}
    if item_data.name is not None:
        update_data["name"] = item_data.name
    if item_data.quantity is not None:
        if item_data.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")
        update_data["quantity"] = item_data.quantity
    if item_data.expiration_date is not None:
        if item_data.expiration_date < date.today():
            raise HTTPException(
                status_code=400,
                detail="Expiration date cannot be in the past"
            )
        update_data["expiration_date"] = item_data.expiration_date.isoformat()
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        response = supabase.table("items").update(update_data).eq("id", item_id).eq("user_id", user_id).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: str, user_id: Optional[str] = Depends(get_user_id)):
    """Delete an item"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Check if item exists and belongs to user
        check_response = supabase.table("items").select("id").eq("id", item_id).eq("user_id", user_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete the item
        supabase.table("items").delete().eq("id", item_id).eq("user_id", user_id).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/items/expiring/soon", response_model=List[ItemResponse])
def get_expiring_items(days: int = 7, user_id: Optional[str] = Depends(get_user_id)):
    """Get items expiring within the specified number of days"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    from datetime import timedelta
    today = date.today()
    future_date = today + timedelta(days=days)
    
    try:
        response = supabase.table("items").select("*").eq("user_id", user_id).not_.is_("expiration_date", "null").gte("expiration_date", today.isoformat()).lte("expiration_date", future_date.isoformat()).order("expiration_date").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
