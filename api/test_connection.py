"""Quick test to verify Supabase connection"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {SUPABASE_URL}")
print(f"Key: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "Key: None")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("[OK] Supabase client created successfully")
    
    # Test connection by fetching items
    result = supabase.table("items").select("*").limit(1).execute()
    print(f"[OK] Database connection successful! Found {len(result.data)} items")
except Exception as e:
    print(f"[ERROR] {e}")
