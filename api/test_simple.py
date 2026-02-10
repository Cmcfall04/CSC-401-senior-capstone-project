print("=== TESTING PYTHON ===")

try:
    print("Testing imports...")
    import os
    print("✓ os imported")
    
    from fastapi import FastAPI
    print("✓ FastAPI imported")
    
    from supabase import create_client
    print("✓ Supabase imported")
    
    print("Testing environment variables...")
    from dotenv import load_dotenv
    from pathlib import Path
    
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(env_path)
    
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Service Key: {SUPABASE_SERVICE_KEY[:20] if SUPABASE_SERVICE_KEY else 'None'}...")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("✗ Missing environment variables")
    else:
        print("✓ Environment variables loaded")
        
        print("Testing Supabase client creation...")
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✓ Supabase client created")
        
        print("Testing simple query...")
        result = supabase.table("profiles").select("id").limit(1).execute()
        print("✓ Supabase query successful")
    
    print("=== ALL TESTS PASSED ===")
    
except Exception as e:
    print(f"✗ ERROR: {e}")
    import traceback
    traceback.print_exc()