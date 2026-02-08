import os
import logging
import base64
import json
import re
import time
import httpx
import uuid
from datetime import date, datetime, timedelta
from uuid import UUID
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from supabase import create_client, Client
from fastapi import UploadFile, File


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
USDA_API_KEY = os.getenv("USDA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")
if not SUPABASE_SERVICE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")


# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Initialize the Openai client w/ key
from openai import OpenAI
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# In-memory store for scan sessions (in production, use Redis or database)
scan_sessions: Dict[str, Dict] = {}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

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

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class ProfileResponse(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    created_at: str
    updated_at: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class ExpirationSuggestionRequest(BaseModel):
    name: str
    storage_type: Optional[str] = None  # "pantry", "fridge", "freezer"
    purchased_date: Optional[date] = None

class ExpirationSuggestionResponse(BaseModel):
    suggested_date: Optional[str]  # ISO date string
    days_from_now: Optional[int]
    confidence: str  # "high", "medium", "low"
    category: Optional[str] = None

class ItemResponse(BaseModel):
    id: str
    user_id: str
    name: str
    quantity: int
    expiration_date: Optional[str] = None
    added_at: str
    created_at: str
    updated_at: str

class PaginatedItemsResponse(BaseModel):
    items: List[ItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

app = FastAPI(
    title="Smart Pantry API",
    description="Backend API for Smart Pantry application using Supabase",
    version="1.0.0"
)

# CORS configuration
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

# For development, also allow common localhost ports and local network IPs
if os.getenv("NODE_ENV", "development") == "development":
    common_ports = ["3000", "3001", "3002", "5173", "5174"]  # Common dev server ports
    for port in common_ports:
        origins_to_add = [
            f"http://localhost:{port}",
            f"http://127.0.0.1:{port}",
        ]
        for origin in origins_to_add:
            if origin not in allowed_origins:
                allowed_origins.append(origin)
    
    # Allow all local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for mobile access
    # This is a regex pattern that will match any local IP
    import re
    local_ip_pattern = re.compile(r'^http://(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)')
    
    # We'll use a custom CORS handler that checks for local IPs
    # For now, allow all origins in development (you can restrict this in production)
    logger.info("Development mode: Allowing all local network origins for mobile access")

# In development, allow local network IPs using regex pattern
if os.getenv("NODE_ENV", "development") == "development":
    # Regex pattern to match local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x, localhost)
    local_network_regex = r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?"
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=local_network_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("Development mode: Allowing local network IPs via regex pattern")
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses"""
    start_time = time.time()
    
    # Log request
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    url = str(request.url)
    path = request.url.path
    
    # Skip logging for health checks to reduce noise
    if path != "/health":
        logger.info(f"REQUEST: {method} {path} | IP: {client_ip}")
        
        # Log query parameters if present
        if request.url.query:
            logger.debug(f"Query params: {request.url.query}")
    
    # Process request
    try:
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log response
        status_code = response.status_code
        if path != "/health":
            logger.info(
                f"RESPONSE: {method} {path} | Status: {status_code} | Time: {process_time:.3f}s"
            )
            
            # Log errors
            if status_code >= 400:
                logger.warning(f"ERROR: {method} {path} returned {status_code}")
        
        # Add process time header
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"EXCEPTION: {method} {path} | Error: {str(e)} | Time: {process_time:.3f}s",
            exc_info=True
        )
        raise

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
    """Initialize application on startup"""
    logger.info("Starting Smart Pantry API...")
    logger.info(f"Supabase URL: {SUPABASE_URL[:30]}...")  # Log partial URL for security
    logger.info(f"CORS allowed origins: {allowed_origins}")
    logger.info(f"API listening on: http://0.0.0.0:8000")
    logger.info("API startup complete. Ready to handle requests.")

# Authentication endpoints
@app.post("/auth/signup")
def signup(req: SignupRequest):
    """Sign up a new user using Supabase Auth"""
    logger.info(f"Signup attempt for email: {req.email}")
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
        logger.info(f"Signup successful for user: {user_id} ({req.email})")
        return {
            "token": user_id,
            "user": {
                "id": user_id,
                "name": req.name,
                "email": req.email
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Signup failed for email: {req.email} - {error_msg}")
        if "already registered" in error_msg.lower() or "user already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="User already exists")
        raise HTTPException(status_code=500, detail=f"Signup failed: {error_msg}")

@app.post("/auth/login")
def login(req: LoginRequest):
    """Login user using Supabase Auth"""
    logger.info(f"Login attempt for email: {req.email}")
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
        logger.info(f"Login successful for user: {user_id} ({req.email})")
        return {
            "token": user_id,
            "user": {
                "id": user_id,
                "name": profile.get("name") if profile else req.email,
                "email": req.email
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.warning(f"Login failed for email: {req.email} - {error_msg}")
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
@app.get("/api/items", response_model=PaginatedItemsResponse)
def list_items(
    user_id: Optional[str] = Depends(get_user_id),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
    search: Optional[str] = Query(None, description="Search items by name"),
    sort_by: Optional[str] = Query("created_at", description="Sort field: name, expiration_date, created_at, quantity"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc or desc"),
    expiring_soon: Optional[bool] = Query(None, description="Filter items expiring within 7 days"),
):
    """Get all items for the authenticated user with pagination, filtering, and sorting"""
    if not user_id:
        logger.warning("GET /api/items - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Build query
        query = supabase.table("items").select("*", count="exact").eq("user_id", user_id)
        
        # Apply search filter (name contains search term)
        if search:
            query = query.ilike("name", f"%{search}%")
            logger.debug(f"Search filter: '{search}' for user: {user_id}")
        
        # Apply expiration filter
        if expiring_soon is True:
            from datetime import timedelta
            today = date.today()
            future_date = today + timedelta(days=7)
            query = query.not_.is_("expiration_date", "null").gte("expiration_date", today.isoformat()).lte("expiration_date", future_date.isoformat())
            logger.debug(f"Expiring soon filter applied for user: {user_id}")
        elif expiring_soon is False:
            # Get items NOT expiring soon (expires after 7 days or no expiration)
            # Note: This filter is complex and may need adjustment based on Supabase client capabilities
            # For now, we'll skip this filter if it causes issues
            logger.debug(f"Not expiring soon filter skipped for user: {user_id} (complex filter)")
        
        # Validate sort_by field
        valid_sort_fields = ["name", "expiration_date", "created_at", "quantity", "added_at"]
        if sort_by not in valid_sort_fields:
            sort_by = "created_at"
        
        # Validate sort_order
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        
        # Apply sorting
        query = query.order(sort_by, desc=(sort_order == "desc"))
        logger.debug(f"Sorting by: {sort_by} ({sort_order}) for user: {user_id}")
        
        # Calculate pagination
        offset = (page - 1) * page_size
        
        # Get total count and items
        response = query.range(offset, offset + page_size - 1).execute()
        
        total = response.count if hasattr(response, 'count') and response.count is not None else len(response.data)
        total_pages = (total + page_size - 1) // page_size  # Ceiling division
        
        logger.info(f"Retrieved {len(response.data)} items (page {page}/{total_pages}, total: {total}) for user: {user_id}")
        
        return {
            "items": response.data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as e:
        logger.error(f"Error fetching items for user {user_id}: {str(e)}")
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
        logger.warning("POST /api/items - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate expiration date is not in the past
    if item_data.expiration_date and item_data.expiration_date < date.today():
        logger.warning(f"Invalid expiration date for user {user_id}: {item_data.expiration_date}")
        raise HTTPException(
            status_code=400,
            detail="Expiration date cannot be in the past"
        )
    
    try:
        logger.info(f"Creating item '{item_data.name}' (qty: {item_data.quantity}) for user: {user_id}")
        new_item = {
            "user_id": user_id,
            "name": item_data.name,
            "quantity": item_data.quantity,
            "expiration_date": item_data.expiration_date.isoformat() if item_data.expiration_date else None
        }
        
        response = supabase.table("items").insert(new_item).execute()
        item_id = response.data[0].get("id")
        logger.info(f"Item created successfully: {item_id} for user: {user_id}")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating item for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, item_data: ItemUpdate, user_id: Optional[str] = Depends(get_user_id)):
    """Update an existing item"""
    if not user_id:
        logger.warning(f"PUT /api/items/{item_id} - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if item exists and belongs to user
    try:
        check_response = supabase.table("items").select("id").eq("id", item_id).eq("user_id", user_id).execute()
        if not check_response.data:
            logger.warning(f"Item {item_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Item not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking item {item_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Build update data
    update_data = {}
    if item_data.name is not None:
        update_data["name"] = item_data.name
    if item_data.quantity is not None:
        if item_data.quantity < 1:
            logger.warning(f"Invalid quantity {item_data.quantity} for item {item_id}")
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")
        update_data["quantity"] = item_data.quantity
    if item_data.expiration_date is not None:
        if item_data.expiration_date < date.today():
            logger.warning(f"Invalid expiration date {item_data.expiration_date} for item {item_id}")
            raise HTTPException(
                status_code=400,
                detail="Expiration date cannot be in the past"
            )
        update_data["expiration_date"] = item_data.expiration_date.isoformat()
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        logger.info(f"Updating item {item_id} for user {user_id} with data: {update_data}")
        response = supabase.table("items").update(update_data).eq("id", item_id).eq("user_id", user_id).execute()
        logger.info(f"Item {item_id} updated successfully for user {user_id}")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating item {item_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: str, user_id: Optional[str] = Depends(get_user_id)):
    """Delete an item"""
    if not user_id:
        logger.warning(f"DELETE /api/items/{item_id} - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Check if item exists and belongs to user
        check_response = supabase.table("items").select("id").eq("id", item_id).eq("user_id", user_id).execute()
        if not check_response.data:
            logger.warning(f"Item {item_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete the item
        logger.info(f"Deleting item {item_id} for user {user_id}")
        supabase.table("items").delete().eq("id", item_id).eq("user_id", user_id).execute()
        logger.info(f"Item {item_id} deleted successfully for user {user_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting item {item_id} for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/items/expiring/soon", response_model=PaginatedItemsResponse)
def get_expiring_items(
    days: int = Query(7, ge=1, le=365, description="Number of days to look ahead"),
    user_id: Optional[str] = Depends(get_user_id),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of items per page (max 100)"),
):
    """Get items expiring within the specified number of days with pagination"""
    if not user_id:
        logger.warning("GET /api/items/expiring/soon - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    from datetime import timedelta
    today = date.today()
    future_date = today + timedelta(days=days)
    
    try:
        # Build query
        query = supabase.table("items").select("*", count="exact").eq("user_id", user_id).not_.is_("expiration_date", "null").gte("expiration_date", today.isoformat()).lte("expiration_date", future_date.isoformat()).order("expiration_date")
        
        # Calculate pagination
        offset = (page - 1) * page_size
        
        # Get total count and items
        response = query.range(offset, offset + page_size - 1).execute()
        
        total = response.count if hasattr(response, 'count') and response.count is not None else len(response.data)
        total_pages = (total + page_size - 1) // page_size  # Ceiling division
        
        logger.info(f"Found {len(response.data)} items expiring within {days} days (page {page}/{total_pages}, total: {total}) for user: {user_id}")
        
        return {
            "items": response.data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as e:
        logger.error(f"Error fetching expiring items for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Expiration suggestion rules (in days from purchase/current date)
# Based on common food shelf life guidelines
EXPIRATION_RULES = {
    # Dairy products (refrigerated)
    "dairy": {
        "keywords": ["milk", "cream", "yogurt", "cheese", "butter", "sour cream", "cottage cheese"],
        "pantry": None,  # Not typically stored in pantry
        "fridge": 7,  # 7 days
        "freezer": 90,  # 3 months
    },
    # Meat & Poultry (refrigerated)
    "meat": {
        "keywords": ["chicken", "beef", "pork", "turkey", "lamb", "steak", "ground", "sausage", "bacon", "ham"],
        "pantry": None,
        "fridge": 3,  # 3 days
        "freezer": 180,  # 6 months
    },
    # Seafood
    "seafood": {
        "keywords": ["fish", "salmon", "tuna", "shrimp", "crab", "lobster", "seafood"],
        "pantry": None,
        "fridge": 2,  # 2 days
        "freezer": 90,  # 3 months
    },
    # Produce - Perishable
    "produce_perishable": {
        "keywords": ["lettuce", "spinach", "kale", "broccoli", "carrots", "celery", "bell pepper", "cucumber", "tomato", "berries", "grapes"],
        "pantry": None,
        "fridge": 7,  # 7 days
        "freezer": 30,  # 1 month (if frozen)
    },
    # Produce - Longer lasting
    "produce_long": {
        "keywords": ["potato", "onion", "garlic", "apple", "orange", "banana"],
        "pantry": 30,  # 30 days
        "fridge": 14,  # 14 days
        "freezer": 90,  # 3 months
    },
    # Bread & Bakery
    "bread": {
        "keywords": ["bread", "bagel", "muffin", "roll", "bun", "croissant"],
        "pantry": 5,  # 5 days
        "fridge": 7,  # 7 days
        "freezer": 90,  # 3 months
    },
    # Eggs
    "eggs": {
        "keywords": ["egg", "eggs"],
        "pantry": None,
        "fridge": 21,  # 3 weeks
        "freezer": None,  # Not typically frozen
    },
    # Canned goods
    "canned": {
        "keywords": ["can", "canned", "soup", "beans", "corn", "peas", "tuna can"],
        "pantry": 365,  # 1 year
        "fridge": 365,  # Same after opening
        "freezer": None,
    },
    # Dry goods
    "dry": {
        "keywords": ["pasta", "rice", "flour", "sugar", "cereal", "oats", "quinoa", "lentils", "beans dry"],
        "pantry": 365,  # 1 year
        "fridge": 365,
        "freezer": 365,
    },
    # Snacks & Packaged
    "packaged": {
        "keywords": ["chips", "crackers", "cookies", "nuts", "pretzels", "popcorn"],
        "pantry": 90,  # 3 months
        "fridge": 90,
        "freezer": 180,  # 6 months
    },
    # Beverages
    "beverages": {
        "keywords": ["juice", "soda", "water", "coffee", "tea"],
        "pantry": 180,  # 6 months (unopened)
        "fridge": 7,  # 7 days (opened)
        "freezer": None,
    },
}

def suggest_expiration_date(item_name: str, storage_type: str = "pantry", purchased_date: Optional[date] = None) -> tuple[Optional[date], str, Optional[str]]:
    """
    Suggest expiration date based on item name and storage type.
    Returns: (suggested_date, confidence, category)
    """
    item_name_lower = item_name.lower()
    today = purchased_date if purchased_date else date.today()
    
    # Try to match item name to a category
    matched_category = None
    matched_days = None
    
    for category, rules in EXPIRATION_RULES.items():
        for keyword in rules["keywords"]:
            if keyword in item_name_lower:
                matched_category = category
                # Get days based on storage type
                if storage_type == "freezer" and rules["freezer"] is not None:
                    matched_days = rules["freezer"]
                elif storage_type == "fridge" and rules["fridge"] is not None:
                    matched_days = rules["fridge"]
                elif storage_type == "pantry" and rules["pantry"] is not None:
                    matched_days = rules["pantry"]
                
                if matched_days is not None:
                    break
        
        if matched_days is not None:
            break
    
    # Determine confidence level
    if matched_days is not None:
        # High confidence if we found a match
        confidence = "high"
        suggested_date = today + timedelta(days=matched_days)
        return suggested_date, confidence, matched_category
    else:
        # Low confidence - no match found, use default
        confidence = "low"
        # Default: 7 days for unknown items (conservative estimate)
        suggested_date = today + timedelta(days=7)
        return suggested_date, confidence, None

@app.post("/api/items/suggest-expiration", response_model=ExpirationSuggestionResponse)
def suggest_expiration(request: ExpirationSuggestionRequest):
    """
    Suggest an expiration date for an item based on its name and storage type.
    """
    try:
        storage = request.storage_type or "pantry"
        suggested_date, confidence, category = suggest_expiration_date(
            request.name,
            storage,
            request.purchased_date
        )
        
        days_from_now = (suggested_date - date.today()).days if suggested_date else None
        
        return {
            "suggested_date": suggested_date.isoformat() if suggested_date else None,
            "days_from_now": days_from_now,
            "confidence": confidence,
            "category": category
        }
    except Exception as e:
        logger.error(f"Error suggesting expiration date: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error suggesting expiration: {str(e)}")

# Profile/Account endpoints
@app.get("/api/profile", response_model=ProfileResponse)
def get_profile(user_id: Optional[str] = Depends(get_user_id)):
    """Get the current user's profile"""
    if not user_id:
        logger.warning("GET /api/profile - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/profile", response_model=ProfileResponse)
def update_profile(profile_data: ProfileUpdate, user_id: Optional[str] = Depends(get_user_id)):
    """Update the current user's profile"""
    if not user_id:
        logger.warning("PUT /api/profile - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Build update data
    update_data = {}
    if profile_data.name is not None:
        update_data["name"] = profile_data.name
    if profile_data.email is not None:
        update_data["email"] = profile_data.email
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        logger.info(f"Updating profile for user {user_id} with data: {update_data}")
        response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        
        # Also update email in auth.users if email is being changed
        if profile_data.email:
            try:
                supabase.auth.admin.update_user_by_id(
                    user_id,
                    {"email": profile_data.email}
                )
            except Exception as e:
                logger.warning(f"Could not update email in auth.users: {str(e)}")
        
        logger.info(f"Profile updated successfully for user {user_id}")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating profile for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/profile/change-password")
def change_password(password_data: PasswordChangeRequest, user_id: Optional[str] = Depends(get_user_id)):
    """Change the user's password"""
    if not user_id:
        logger.warning("POST /api/profile/change-password - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get user email from profile
        profile_response = supabase.table("profiles").select("email").eq("id", user_id).execute()
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        user_email = profile_response.data[0].get("email")
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        # Verify current password by attempting to sign in
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": user_email,
                "password": password_data.current_password
            })
            if not auth_response.user:
                raise HTTPException(status_code=401, detail="Current password is incorrect")
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e).lower()
            if "invalid" in error_msg or "credentials" in error_msg or "password" in error_msg:
                logger.warning(f"Password verification failed for user {user_id}")
                raise HTTPException(status_code=401, detail="Current password is incorrect")
            raise
        
        # Update password using Supabase Admin API via REST API directly
        # The Python client's admin API might have limitations, so we'll use REST API
        import httpx
        
        try:
            # Use Supabase REST API directly with service role key
            admin_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "password": password_data.new_password
            }
            
            # Make the API call
            with httpx.Client(timeout=10.0) as client:
                response = client.put(admin_url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    logger.info(f"Password changed successfully for user {user_id} via REST API")
                elif response.status_code == 403 or response.status_code == 401:
                    logger.error(f"Permission denied for password change: {response.text}")
                    raise HTTPException(
                        status_code=403,
                        detail="Password change is not available. Please use the 'Forgot Password' feature to reset your password via email."
                    )
                else:
                    error_text = response.text
                    logger.error(f"Password change failed: {response.status_code} - {error_text}")
                    raise Exception(f"API returned {response.status_code}: {error_text}")
                    
        except HTTPException:
            raise
        except httpx.RequestError as e:
            logger.error(f"Network error during password change: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Network error while changing password. Please try again."
            )
        except Exception as e:
            error_msg = str(e).lower()
            logger.error(f"Password change failed for user {user_id}: {error_msg}")
            
            if "not allowed" in error_msg or "permission" in error_msg or "forbidden" in error_msg:
                raise HTTPException(
                    status_code=403,
                    detail="Password change is not available. Please use the 'Forgot Password' feature to reset your password via email."
                )
            
            raise HTTPException(
                status_code=500,
                detail=f"Failed to change password: {str(e)}"
            )
        
        logger.info(f"Password changed successfully for user {user_id}")
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password for user {user_id}: {str(e)}")
        error_msg = str(e).lower()
        if "not allowed" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="Password change is currently unavailable. Please use the 'Forgot Password' feature or contact support."
            )
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

@app.get("/api/profile/stats")
def get_profile_stats(user_id: Optional[str] = Depends(get_user_id)):
    """Get statistics about the user's account"""
    if not user_id:
        logger.warning("GET /api/profile/stats - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Get total items count
        items_response = supabase.table("items").select("id", count="exact").eq("user_id", user_id).execute()
        total_items = items_response.count if hasattr(items_response, 'count') and items_response.count is not None else len(items_response.data)
        
        # Get expiring items count (next 7 days)
        from datetime import timedelta
        today = date.today()
        future_date = today + timedelta(days=7)
        expiring_response = supabase.table("items").select("id", count="exact").eq("user_id", user_id).not_.is_("expiration_date", "null").gte("expiration_date", today.isoformat()).lte("expiration_date", future_date.isoformat()).execute()
        expiring_items = expiring_response.count if hasattr(expiring_response, 'count') and expiring_response.count is not None else len(expiring_response.data)
        
        # Get expired items count
        expired_response = supabase.table("items").select("id", count="exact").eq("user_id", user_id).not_.is_("expiration_date", "null").lt("expiration_date", today.isoformat()).execute()
        expired_items = expired_response.count if hasattr(expired_response, 'count') and expired_response.count is not None else len(expired_response.data)
        
        # Get profile to find account creation date
        profile_response = supabase.table("profiles").select("created_at").eq("id", user_id).execute()
        account_created = profile_response.data[0].get("created_at") if profile_response.data else None
        
        return {
            "total_items": total_items,
            "expiring_items": expiring_items,
            "expired_items": expired_items,
            "account_created": account_created
        }
    except Exception as e:
        logger.error(f"Error fetching stats for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# USDA Food API endpoints
@app.get("/api/food/search")
async def search_food(query: str):
    """Search USDA FoodData Central for foods"""
    if not USDA_API_KEY:
        raise HTTPException(status_code=500, detail="USDA API key not configured")
    
    logger.info(f"Searching USDA API for: {query}")
    try:
        url = f"https://api.nal.usda.gov/fdc/v1/foods/search?query={query}&pageSize=10&api_key={USDA_API_KEY}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
            foods = data.get("foods", [])
            logger.info(f"Found {len(foods)} results for query: {query}")
            return foods
    except Exception as e:
        logger.error(f"Error searching USDA API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"USDA API error: {str(e)}")

@app.post("/api/items/from-usda")
async def create_item_from_usda(
    usda_fdc_id: int,
    name: str,
    quantity: int = 1,
    expiration_date: Optional[str] = None,
    user_id: Optional[str] = Depends(get_user_id)
):
    """Create pantry item with USDA nutritional data"""
    if not user_id:
        logger.warning("POST /api/items/from-usda - Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not USDA_API_KEY:
        raise HTTPException(status_code=500, detail="USDA API key not configured")
    
    try:
        # Fetch nutrition from USDA API
        logger.info(f"Fetching USDA data for fdcId: {usda_fdc_id}")
        url = f"https://api.nal.usda.gov/fdc/v1/food/{usda_fdc_id}?api_key={USDA_API_KEY}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            usda_data = response.json()
        
        # Extract nutrition from labelNutrients
        label = usda_data.get("labelNutrients", {})
        
        # Create item with nutritional data
        new_item = {
            "user_id": user_id,
            "name": name,
            "quantity": quantity,
            "expiration_date": expiration_date,
            "usda_fdc_id": usda_fdc_id,
            "calories": label.get("calories", {}).get("value", 0),
            "protein": label.get("protein", {}).get("value", 0),
            "carbs": label.get("carbohydrates", {}).get("value", 0),
            "fat": label.get("fat", {}).get("value", 0),
        }
        
        result = supabase.table("items").insert(new_item).execute()
        logger.info(f"Item created from USDA: {result.data[0].get('id')} for user: {user_id}")
        return result.data[0]
    except Exception as e:
        logger.error(f"Error creating item from USDA for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/api/receipt/scan")
async def scan_receipt(
    file: UploadFile = File(...),
    user_id: Optional[str] = Depends(get_user_id)
):
    """Scan receipt image using OpenAI Vision API"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API not configured")
    
    try:
        # Read the uploaded image as bytes
        image_data = await file.read()
        
        # Convert bytes to base64
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        logger.info(f"Receipt image received: size: {len(image_data)} bytes")
        
        # Call OpenAI Vision API
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all food items from this receipt. Return ONLY a JSON array like: [{\"name\": \"Milk\", \"quantity\": 2}, {\"name\": \"Bread\", \"quantity\": 1}]"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        # Extract items from response
        content = response.choices[0].message.content
        logger.info(f"GPT-4 raw response: {content}")
        
        # Extract JSON from response (GPT sometimes adds extra text)
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
        else:
            logger.error(f"No JSON array found in response: {content}")
            raise ValueError("Could not find JSON array in response")
        
        items = json.loads(content)

        # Insert items into database
        added_items = []
        for item in items:
            new_item = {
                "user_id": user_id,
                "name": item.get("name", ""),
                "quantity": item.get("quantity", 1)
            }

            # Try to get USDA data with cleaned search term
            if USDA_API_KEY:
                try:
                    # Clean item name for better USDA matching
                    search_name = item.get('name', '').lower()
                    # Remove common abbreviations and brand-specific terms
                    search_name = search_name.replace('qtrs', 'quarters').replace('lt', 'light').replace('crm', 'cream')
                    search_name = search_name.replace('eng', 'english').replace('unc', 'uncured')
                    # Remove extra spaces
                    search_name = ' '.join(search_name.split())
                    
                    usda_url = f"https://api.nal.usda.gov/fdc/v1/foods/search?query={search_name}&pageSize=1&api_key={USDA_API_KEY}"
                    async with httpx.AsyncClient() as client:
                        usda_response = await client.get(usda_url)
                        usda_data = usda_response.json()
                        if usda_data.get("foods"):
                            food = usda_data["foods"][0]
                            fdc_id = food.get("fdcId")
                            usda_name = food.get("description", item.get('name', ''))
                            new_item["usda_fdc_id"] = fdc_id
                            new_item["name"] = usda_name
                            logger.info(f"Matched '{item.get('name')}' to USDA: '{usda_name}' (fdcId: {fdc_id})")
                        else:
                            logger.info(f"No USDA match for '{item.get('name')}' (searched: '{search_name}')")
                except Exception as e:
                    logger.warning(f"USDA lookup failed for '{item.get('name')}': {str(e)}")

            result = supabase.table("items").insert(new_item).execute()
            added_items.append(result.data[0])

        logger.info(f"Added {len(added_items)} items to pantry for user {user_id}")
        return {"items": added_items, "count": len(added_items)}


    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to parse receipt data")
    except Exception as e:
        logger.error(f"Error scanning receipt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error scanning receipt: {str(e)}")


@app.post("/api/receipt/create-session")
async def create_scan_session(
    user_id: Optional[str] = Depends(get_user_id)
):
    """Create a scan session and return a token for mobile scanning"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Generate unique token
    token = str(uuid.uuid4())
    
    # Store session
    scan_sessions[token] = {
        "user_id": user_id,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }
    
    logger.info(f"Created scan session {token} for user {user_id}")
    return {"token": token}


@app.post("/api/receipt/scan-mobile")
async def scan_receipt_mobile(
    file: UploadFile = File(...),
    token: str = Query(...)
):
    """Scan receipt from mobile device using token"""
    if token not in scan_sessions:
        raise HTTPException(status_code=404, detail="Invalid scan token")
    
    session = scan_sessions[token]
    user_id = session["user_id"]
    
    if session["status"] != "pending":
        raise HTTPException(status_code=400, detail="Scan session already completed")
    
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI API not configured")
    
    try:
        # Read the uploaded image as bytes
        image_data = await file.read()
        
        # Convert bytes to base64
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        logger.info(f"Mobile receipt image received: size: {len(image_data)} bytes for session {token}")
        
        # Call OpenAI Vision API
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all food items from this receipt. Return ONLY a JSON array like: [{\"name\": \"Milk\", \"quantity\": 2}, {\"name\": \"Bread\", \"quantity\": 1}]"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        # Extract items from response
        content = response.choices[0].message.content
        logger.info(f"GPT-4 raw response: {content}")
        
        # Extract JSON from response (GPT sometimes adds extra text)
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
        else:
            logger.error(f"No JSON array found in response: {content}")
            raise ValueError("Could not find JSON array in response")
        
        items = json.loads(content)

        # Insert items into database
        added_items = []
        for item in items:
            new_item = {
                "user_id": user_id,
                "name": item.get("name", ""),
                "quantity": item.get("quantity", 1)
            }

            # Try to get USDA data with cleaned search term
            if USDA_API_KEY:
                try:
                    # Clean item name for better USDA matching
                    search_name = item.get('name', '').lower()
                    # Remove common abbreviations and brand-specific terms
                    search_name = search_name.replace('qtrs', 'quarters').replace('lt', 'light').replace('crm', 'cream')
                    search_name = search_name.replace('eng', 'english').replace('unc', 'uncured')
                    # Remove extra spaces
                    search_name = ' '.join(search_name.split())
                    
                    usda_url = f"https://api.nal.usda.gov/fdc/v1/foods/search?query={search_name}&pageSize=1&api_key={USDA_API_KEY}"
                    async with httpx.AsyncClient() as client:
                        usda_response = await client.get(usda_url)
                        usda_data = usda_response.json()
                        if usda_data.get("foods"):
                            food = usda_data["foods"][0]
                            fdc_id = food.get("fdcId")
                            usda_name = food.get("description", item.get('name', ''))
                            new_item["usda_fdc_id"] = fdc_id
                            new_item["name"] = usda_name
                            logger.info(f"Matched '{item.get('name')}' to USDA: '{usda_name}' (fdcId: {fdc_id})")
                        else:
                            logger.info(f"No USDA match for '{item.get('name')}' (searched: '{search_name}')")
                except Exception as e:
                    logger.warning(f"USDA lookup failed for '{item.get('name')}': {str(e)}")

            result = supabase.table("items").insert(new_item).execute()
            added_items.append(result.data[0])

        logger.info(f"Added {len(added_items)} items to pantry for user {user_id} via mobile scan")
        
        # Update session with result
        scan_sessions[token]["status"] = "completed"
        scan_sessions[token]["result"] = {
            "items": added_items,
            "count": len(added_items)
        }
        scan_sessions[token]["completed_at"] = datetime.now().isoformat()
        
        return {"success": True, "items": added_items, "count": len(added_items)}

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI response: {str(e)}")
        scan_sessions[token]["status"] = "error"
        scan_sessions[token]["result"] = {"error": "Failed to parse receipt data"}
        raise HTTPException(status_code=500, detail="Failed to parse receipt data")
    except Exception as e:
        logger.error(f"Error scanning receipt: {str(e)}")
        scan_sessions[token]["status"] = "error"
        scan_sessions[token]["result"] = {"error": str(e)}
        raise HTTPException(status_code=500, detail=f"Error scanning receipt: {str(e)}")


@app.get("/api/receipt/scan-result/{token}")
async def get_scan_result(
    token: str,
    user_id: Optional[str] = Depends(get_user_id)
):
    """Get scan result by token"""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if token not in scan_sessions:
        raise HTTPException(status_code=404, detail="Scan session not found")
    
    session = scan_sessions[token]
    
    # Verify user owns this session
    if session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if session["status"] == "pending":
        return {"status": "pending", "result": None}
    
    return {
        "status": session["status"],
        "result": session["result"]
    }
