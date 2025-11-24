# Testing Guide - Smart Pantry API

This guide will help you test all the high-priority functionality to ensure everything works correctly.

## Prerequisites

1. Make sure Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Ensure backend API is accessible:
   - Visit: http://localhost:8000/health
   - Should return: `{"ok": true, "database": "connected", "supabase": "ready"}`

## Step 1: Create Test Data

First, let's populate the database with test users and items:

**Option 1: Run Locally (Recommended)**
```bash
# Make sure you have Python 3.12+ installed
cd api
python create_test_data.py
```

**Option 2: Copy to Container**
```bash
# Copy the script into the container's src directory
docker cp api/create_test_data.py sp-api:/app/src/create_test_data.py
docker-compose exec api python /app/src/create_test_data.py
```

**Option 3: Install Dependencies Locally**
```bash
cd api
pip install -r requirements.txt
python create_test_data.py
```

This will create:
- 2 test users (test1@example.com and test2@example.com)
- 10 test items per user with various expiration dates

**Test Credentials:**
- Email: `test1@example.com`
- Password: `testpassword123`

- Email: `test2@example.com`
- Password: `testpassword123`

## Step 2: View Logs

In a separate terminal, watch the API logs to see requests and responses:

```bash
# Watch logs in real-time
docker-compose logs -f api
```

This will show all the logging we added - requests, responses, errors, etc.

## Step 3: Manual Testing Checklist

### Test 1: Sign Up (New User)

1. **Frontend Test:**
   - Go to: http://localhost:3000/signup
   - Fill out the form:
     - First Name: `John`
     - Last Name: `Doe`
     - Email: `john.doe@example.com`
     - Password: `SecurePass123`
     - Confirm Password: `SecurePass123`
   - Check the "I agree" checkbox
   - Click "Create account"
   - ✅ Should redirect to `/dashboard`

2. **Check Logs:**
   - Look for: `Signup attempt for email: john.doe@example.com`
   - Should see: `Signup successful for user: ...`

3. **API Test (using Swagger):**
   - Go to: http://localhost:8000/docs
   - Expand `POST /auth/signup`
   - Click "Try it out"
   - Use the test data:
     ```json
     {
       "name": "Jane Smith",
       "email": "jane.smith@example.com",
       "password": "SecurePass456"
     }
     ```
   - Click "Execute"
   - ✅ Should return 200 with token and user info

### Test 2: Login

1. **Frontend Test:**
   - Go to: http://localhost:3000/login
   - Use test credentials: `test1@example.com` / `testpassword123`
   - Click "Log in"
   - ✅ Should redirect to `/dashboard`

2. **Check Logs:**
   - Look for: `Login attempt for email: test1@example.com`
   - Should see: `Login successful for user: ...`

3. **API Test:**
   - In Swagger, try `POST /auth/login`
   - Use test credentials
   - ✅ Should return token

### Test 3: Create Items Through UI

1. **Navigate to Pantry Page:**
   - After logging in, go to: http://localhost:3000/pantry
   - You should see existing items (if test data was created)

2. **Create a New Item:**
   - Look for an "Add Item" or "+" button
   - Fill in the form:
     - Name: `Orange Juice`
     - Quantity: `2`
     - Expiration Date: `2024-12-31` (or any future date)
   - Submit the form

3. **Verify in Database:**
   - Check the API logs for: `Creating item 'Orange Juice'`
   - Should see: `Item created successfully`
   - ✅ Item should appear in the pantry list

4. **Verify via API:**
   - In Swagger, use `GET /api/items`
   - Click "Authorize" and paste your user_id (token)
   - Click "Execute"
   - ✅ Should see your new item in the list

### Test 4: Update Items

1. **Frontend Test:**
   - Go to pantry page
   - Find an item (e.g., "Milk")
   - Click edit/update button
   - Change quantity from 2 to 3
   - Change expiration date
   - Save changes

2. **Check Logs:**
   - Look for: `Updating item ... for user ...`
   - Should see: `Item ... updated successfully`

3. **Verify Changes:**
   - Refresh the pantry page
   - ✅ Updated values should be reflected

4. **API Test:**
   - In Swagger, use `PUT /api/items/{item_id}`
   - Get an item ID from the list
   - Update the item:
     ```json
     {
       "quantity": 5,
       "expiration_date": "2024-12-25"
     }
     ```
   - ✅ Should return updated item

### Test 5: Delete Items

1. **Frontend Test:**
   - Go to pantry page
   - Find an item to delete
   - Click delete button (trash icon)
   - Confirm deletion

2. **Check Logs:**
   - Look for: `Deleting item ... for user ...`
   - Should see: `Item ... deleted successfully`

3. **Verify Deletion:**
   - Refresh pantry page
   - ✅ Item should no longer appear

4. **API Test:**
   - In Swagger, use `DELETE /api/items/{item_id}`
   - Use an item ID
   - ✅ Should return 204 (No Content)

### Test 6: Expiration Date Filtering

1. **Test Expiring Items Endpoint:**
   - In Swagger, use `GET /api/items/expiring/soon?days=7`
   - Authorize with your token
   - Execute
   - ✅ Should return only items expiring within 7 days

2. **Test Different Day Ranges:**
   - Try `?days=3` - should show fewer items
   - Try `?days=14` - should show more items
   - ✅ Results should change based on days parameter

3. **Frontend Test (if implemented):**
   - Check if pantry page has an "Expiring Soon" filter or section
   - ✅ Should show items expiring within a certain timeframe

### Test 7: User-Specific Data Isolation

This is critical - users should only see their own items!

1. **Login as Test User 1:**
   - Login with: `test1@example.com` / `testpassword123`
   - Go to pantry page
   - Note the items you see

2. **Login as Test User 2:**
   - Logout
   - Login with: `test2@example.com` / `testpassword123`
   - Go to pantry page
   - ✅ Should see different items (User 2's items)

3. **API Test - Cross-User Access Attempt:**
   - Login as User 1 and get an item ID
   - Login as User 2
   - Try to GET that item ID: `GET /api/items/{user1_item_id}`
   - ✅ Should return 404 (not found) - users can't access each other's items

4. **API Test - Cross-User Update Attempt:**
   - As User 2, try to UPDATE User 1's item: `PUT /api/items/{user1_item_id}`
   - ✅ Should return 404 (not found)

5. **API Test - Cross-User Delete Attempt:**
   - As User 2, try to DELETE User 1's item: `DELETE /api/items/{user1_item_id}`
   - ✅ Should return 404 (not found)

## Step 4: Review Logs

After all testing, review the logs to ensure:

1. ✅ All requests are being logged
2. ✅ Response times are reasonable
3. ✅ Errors are logged with stack traces
4. ✅ User IDs are logged for authentication-related operations
5. ✅ Item operations show item IDs and user IDs

```bash
# View last 100 lines of logs
docker-compose logs --tail=100 api

# Search for errors
docker-compose logs api | grep -i error

# Search for specific endpoint
docker-compose logs api | grep "POST /api/items"
```

## Expected Results

After completing all tests, you should have verified:

- ✅ Users can sign up and login
- ✅ Items can be created, read, updated, and deleted
- ✅ Expiration date filtering works correctly
- ✅ User data is properly isolated (no cross-user access)
- ✅ All operations are logged for debugging
- ✅ Frontend and backend communicate correctly
- ✅ Errors are handled gracefully

## Troubleshooting

### Items not appearing in UI
- Check browser console (F12) for errors
- Verify API is returning data: `GET /api/items`
- Check network tab to see API requests

### Authentication errors
- Verify token is being sent in Authorization header
- Check if token matches user_id format
- Review logs for authentication warnings

### Database errors
- Verify Supabase connection: `/health` endpoint
- Check environment variables in `api/.env`
- Review Supabase dashboard for table structure

### Logging not appearing
- Ensure API container is running
- Check logs are being written: `docker-compose logs api`
- Verify logging level is set correctly

## Next Steps

After completing these tests, you can:
1. Mark completed items in `todo.md`
2. Move on to medium-priority tasks (pagination, filtering, etc.)
3. Add more comprehensive automated tests if needed

