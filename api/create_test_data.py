"""
Test Data Fixtures Script for Smart Pantry API

This script creates test users and pantry items for development and testing.
Run this script to populate your database with sample data.

Usage:
    python create_test_data.py
"""

import os
import sys
from datetime import date, timedelta
from pathlib import Path

# Add parent directory to path to import from src
sys.path.insert(0, str(Path(__file__).parent))

try:
    from dotenv import load_dotenv
    # Try multiple possible locations for .env file
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        env_path = Path(__file__).parent.parent / "api" / ".env"
    load_dotenv(env_path)
except ImportError:
    pass

from supabase import create_client, Client

# Get Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    print("ERROR: SUPABASE_URL environment variable is required")
    sys.exit(1)
if not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def create_test_users():
    """Create test users for testing"""
    test_users = [
        {
            "name": "Test User One",
            "email": "test1@example.com",
            "password": "testpassword123",
        },
        {
            "name": "Test User Two",
            "email": "test2@example.com",
            "password": "testpassword123",
        },
    ]
    
    created_users = []
    
    print("\n=== Creating Test Users ===")
    for user_data in test_users:
        try:
            # Try to create user using admin API
            response = supabase.auth.admin.create_user({
                "email": user_data["email"],
                "password": user_data["password"],
                "email_confirm": True,
                "user_metadata": {
                    "name": user_data["name"]
                }
            })
            
            if response.user:
                user_id = str(response.user.id)
                
                # Create profile
                try:
                    supabase.table("profiles").insert({
                        "id": user_id,
                        "name": user_data["name"],
                        "email": user_data["email"]
                    }).execute()
                except Exception as e:
                    # Profile might already exist
                    pass
                
                created_users.append({
                    "id": user_id,
                    "name": user_data["name"],
                    "email": user_data["email"]
                })
                print(f"✓ Created user: {user_data['name']} ({user_data['email']})")
            else:
                print(f"✗ Failed to create user: {user_data['email']}")
        except Exception as e:
            error_msg = str(e).lower()
            if "already registered" in error_msg or "user already exists" in error_msg:
                # Try to get existing user
                try:
                    # Sign in to get user ID
                    auth_response = supabase.auth.sign_in_with_password({
                        "email": user_data["email"],
                        "password": user_data["password"]
                    })
                    if auth_response.user:
                        user_id = str(auth_response.user.id)
                        created_users.append({
                            "id": user_id,
                            "name": user_data["name"],
                            "email": user_data["email"]
                        })
                        print(f"ℹ User already exists: {user_data['email']} (using existing)")
                except:
                    print(f"✗ User exists but could not retrieve: {user_data['email']}")
            else:
                print(f"✗ Error creating user {user_data['email']}: {str(e)}")
    
    return created_users


def create_test_items(user_id: str, user_name: str):
    """Create test pantry items for a user"""
    today = date.today()
    
    test_items = [
        {
            "name": "Milk",
            "quantity": 2,
            "expiration_date": (today + timedelta(days=5)).isoformat(),  # Expiring soon
        },
        {
            "name": "Bread",
            "quantity": 1,
            "expiration_date": (today + timedelta(days=2)).isoformat(),  # Expiring very soon
        },
        {
            "name": "Eggs",
            "quantity": 12,
            "expiration_date": (today + timedelta(days=14)).isoformat(),  # Fresh
        },
        {
            "name": "Chicken Breast",
            "quantity": 4,
            "expiration_date": (today + timedelta(days=3)).isoformat(),  # Expiring soon
        },
        {
            "name": "Bananas",
            "quantity": 6,
            "expiration_date": (today + timedelta(days=7)).isoformat(),  # Expiring in a week
        },
        {
            "name": "Tomatoes",
            "quantity": 8,
            "expiration_date": (today + timedelta(days=1)).isoformat(),  # Expiring tomorrow
        },
        {
            "name": "Pasta",
            "quantity": 3,
            "expiration_date": None,  # No expiration date (non-perishable)
        },
        {
            "name": "Rice",
            "quantity": 1,
            "expiration_date": None,  # No expiration date
        },
        {
            "name": "Yogurt",
            "quantity": 6,
            "expiration_date": (today + timedelta(days=10)).isoformat(),  # Fresh
        },
        {
            "name": "Cheese",
            "quantity": 2,
            "expiration_date": (today + timedelta(days=6)).isoformat(),  # Expiring soon
        },
    ]
    
    print(f"\n=== Creating Test Items for {user_name} ===")
    created_items = []
    
    for item_data in test_items:
        try:
            new_item = {
                "user_id": user_id,
                "name": item_data["name"],
                "quantity": item_data["quantity"],
                "expiration_date": item_data["expiration_date"],
            }
            
            response = supabase.table("items").insert(new_item).execute()
            if response.data:
                created_items.append(response.data[0])
                exp_date = item_data["expiration_date"] or "No expiration"
                print(f"✓ Created: {item_data['name']} (qty: {item_data['quantity']}, expires: {exp_date})")
        except Exception as e:
            print(f"✗ Error creating item {item_data['name']}: {str(e)}")
    
    return created_items


def main():
    """Main function to create all test data"""
    print("=" * 60)
    print("Smart Pantry - Test Data Fixtures")
    print("=" * 60)
    
    # Create test users
    users = create_test_users()
    
    if not users:
        print("\n⚠ No users were created. Cannot create test items.")
        return
    
    # Create test items for each user
    all_items = []
    for user in users:
        items = create_test_items(user["id"], user["name"])
        all_items.extend(items)
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Data Creation Summary")
    print("=" * 60)
    print(f"Users created: {len(users)}")
    print(f"Items created: {len(all_items)}")
    
    print("\n=== Test User Credentials ===")
    for user in users:
        print(f"Email: {user['email']}")
        print(f"Password: testpassword123")
        print(f"User ID: {user['id']}")
        print()
    
    print("✓ Test data creation complete!")
    print("\nYou can now test the API using these credentials.")


if __name__ == "__main__":
    main()

