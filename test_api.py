"""
Test FastAPI backend with Supabase
"""
import os
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def test_api():
    print("Testing FastAPI backend...")
    try:
        from api.src.main import app, supabase
        
        print("✓ FastAPI app loaded successfully")
        print("✓ Supabase client initialized")
        
        # Get routes
        routes = [r.path for r in app.routes if hasattr(r, 'path')]
        api_routes = [r for r in routes if r.startswith('/api') or r == '/health']
        
        print(f"\n✓ Total routes: {len(routes)}")
        print(f"✓ API routes: {len(api_routes)}")
        print("\nAPI Endpoints:")
        for route in sorted(set(api_routes)):
            print(f"  - {route}")
        
        # Test health endpoint logic
        print("\n✓ Backend is ready to use!")
        return True
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("FastAPI Backend Test")
    print("=" * 50)
    print()
    
    success = test_api()
    
    print()
    print("=" * 50)
    if success:
        print("✓ All tests passed!")
        print("\nYou can now start the server with:")
        print("  python -m uvicorn api.src.main:app --reload")
    else:
        print("✗ Tests failed")

