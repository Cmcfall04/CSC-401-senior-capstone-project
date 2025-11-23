"""
Test script for Supabase connection
"""
import os
import sys
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def test_supabase_connection():
    """Test Supabase connection"""
    print("Testing Supabase connection...")
    
    try:
        from supabase import create_client
        
        SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not SUPABASE_URL:
            print("✗ SUPABASE_URL is not set")
            return False
        
        if not SUPABASE_SERVICE_KEY:
            print("✗ SUPABASE_SERVICE_ROLE_KEY is not set")
            print("\nTo get your service role key:")
            print("1. Go to: https://supabase.com/dashboard/project/pmwgxacaahmsoxloxotv/settings/api")
            print("2. Under 'Project API keys', copy the 'service_role secret' key")
            return False
        
        print(f"✓ SUPABASE_URL: {SUPABASE_URL[:30]}...")
        print(f"✓ SUPABASE_SERVICE_ROLE_KEY: {'*' * 20}... (hidden)")
        
        # Create Supabase client
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Test connection by querying items table
        print("\nTesting database connection...")
        try:
            response = supabase.table("items").select("id").limit(1).execute()
            print("✓ Database connection successful!")
            print(f"✓ Can query 'items' table")
            return True
        except Exception as e:
            print(f"✗ Database query failed: {e}")
            print("\nThis might mean:")
            print("1. The 'items' table doesn't exist yet (run the SQL schema in Supabase)")
            print("2. The service role key is incorrect")
            return False
            
    except ImportError:
        print("✗ Supabase library not installed")
        print("Run: pip install supabase")
        return False
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Supabase Connection Test")
    print("=" * 50)
    print()
    
    success = test_supabase_connection()
    
    print()
    print("=" * 50)
    if success:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("✗ Tests failed")
        sys.exit(1)

