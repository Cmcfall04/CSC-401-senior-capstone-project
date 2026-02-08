# Backend Development Todo - Sprint 2

## Core Backend Setup

- [x] Configure FastAPI backend and connect to Supabase database (using Supabase instead of MySQL)
  - [x] Configure Supabase connection using SUPABASE_URL and service role key
  - [x] Install Supabase Python client library
  - [x] Test database connection and verify connectivity
  - [x] Set up environment variables for database credentials

## Database Schema

- [x] Define a database schema for users, items, and expiration dates
  - [x] Update PantryItem model to include expiration_date field
  - [x] Add user_id foreign key to items table for user-specific inventory
  - [x] Create database schema SQL script (supabase_schema.sql)
  - [x] Add indexes for performance (user_id, expiration_date)
  - [ ] Consider adding categories, units, and other metadata fields

## API Endpoints

- [x] Create API endpoints for CRUD operations on inventory items
  - [x] GET /api/items - List all items for authenticated user
  - [x] GET /api/items/{id} - Get single item by ID
  - [x] POST /api/items - Create new inventory item
  - [x] PUT /api/items/{id} - Update existing item
  - [x] DELETE /api/items/{id} - Delete item
  - [x] GET /api/items/expiring/soon - Get items expiring soon (with date range filter)
  - [x] Add pagination support for list endpoints
  - [x] Add filtering and sorting capabilities (backend filtering and sorting implemented)

## Frontend Integration

- [x] Connect the frontend Pantry page to the backend API using Axios/fetch
  - [x] Create API service/utility file for inventory operations (lib/api.ts)
  - [x] Replace mock data with actual API calls
  - [x] Implement loading states and error handling in UI
  - [x] Add optimistic updates for better UX
  - [x] Handle authentication tokens in API requests

## Testing

- [x] Conduct sample data tests to confirm data flow between UI and database
  - [x] Test creating items through UI and verify in database
  - [x] Test updating items and verify changes persist
  - [x] Test deleting items and verify removal
  - [x] Test expiration date filtering and sorting
  - [x] Test user-specific data isolation
  - [x] Create test data fixtures for development

## Authentication

- [x] Implement user authentication (Supabase Auth - using Supabase instead of Firebase)
  - [x] Set up Supabase Auth in backend
  - [x] Create login and signup endpoints
  - [x] Update API endpoints to require authentication
  - [x] Extract user ID from session token for database queries
  - [x] Handle authentication in frontend API calls
  - [x] Handle token refresh and expiration (automatic redirect on 401)

## Validation & Error Handling

- [x] Begin backend validation and error handling
  - [x] Add Pydantic models for request/response validation
  - [x] Validate expiration dates (not in past, reasonable future dates)
  - [x] Validate item names, quantities, and other fields
  - [x] Implement proper HTTP status codes
  - [x] Create consistent error response format
  - [x] Add input sanitization (Supabase handles SQL injection prevention)
  - [x] Handle database connection errors gracefully
  - [x] Add request logging for debugging

## Additional Backend Tasks

- [x] Set up API documentation
  - [x] Configure FastAPI automatic docs (Swagger/OpenAPI) - available at /docs
  - [x] Add detailed endpoint descriptions
  - [x] Document request/response schemas (via Pydantic models)

- [x] Add logging and monitoring
  - [x] Set up structured logging
  - [x] Log API requests and responses
  - [ ] Add error tracking (basic error logging implemented)

- [ ] Database migrations
  - [ ] Set up Alembic or similar migration tool
  - [ ] Create initial migration for schema
  - [ ] Document migration process

- [x] Environment configuration
  - [x] Set up .env file with required variables
  - [x] Document all environment variables needed (in setup guides)
  - [ ] Set up different configs for dev/staging/prod

## Deployment

- [ ] Deploy working backend prototype for testing
  - [ ] Update Docker configuration for MySQL
  - [ ] Test docker-compose setup locally
  - [ ] Deploy to staging environment
  - [ ] Verify all endpoints work in deployed environment
  - [ ] Set up health check endpoint monitoring
  - [ ] Document deployment process

---

# Sprint 4: Multi-User Smart Pantry Foundation

**Sprint Goal:** Deliver a multi-user Smart Pantry foundation by adding household accounts, integrating Spoonacular, enabling AI receipt scanning, completing pantry CRUD, and ensuring accurate expiration dates for items.

## 1. Household Accounts Linked (10 pts)

**User Story:** As a user, I want to join or create a household so multiple people can manage the same pantry.

**Dependencies/Blockers:** Requires user auth/login to exist or be finalized

### Database Design
- [ ] Design DB tables/relations: Users ↔ Households ↔ PantryItems
  - [ ] Create `households` table (id, name, invite_code, created_at, updated_at)
  - [ ] Create `household_members` junction table (user_id, household_id, role, joined_at)
  - [ ] Update `items` table to reference `household_id` instead of/in addition to `user_id`
  - [ ] Add indexes for performance (household_id, user_id in junction table)
  - [ ] Create database migration script

### Backend Endpoints
- [ ] Create household endpoints
  - [ ] POST /api/households - Create new household
  - [ ] GET /api/households/{id} - Get household details
  - [ ] POST /api/households/join - Join household by invite code
  - [ ] POST /api/households/{id}/leave - Leave household
  - [ ] GET /api/households/{id}/members - List household members
  - [ ] Update authorization checks so requests are scoped to household
  - [ ] Add household validation and error handling

### Frontend UI
- [ ] Household create/join flow
  - [ ] Create household modal/form
  - [ ] Join household by invite code form
  - [ ] Display active household in UI
  - [ ] Show household members list
  - [ ] Leave household functionality
  - [ ] Handle household switching (if user is in multiple households)

---

## 2. Spoonacular API Linked (8 pts)

**User Story:** As a user, I want to search foods/recipes so I can use ingredients before they expire.

**Dependencies/Blockers:** API key access; network reliability; rate limits

### Backend Setup
- [ ] Set up API key storage (env vars) + server proxy endpoint
  - [ ] Add SPOONACULAR_API_KEY to api/.env
  - [ ] Create proxy endpoints to avoid exposing key to frontend
  - [ ] Implement rate limiting middleware
  - [ ] Add error handling for API failures

### Backend Endpoints
- [ ] Implement basic search endpoints
  - [ ] GET /api/recipes/search - Search recipes by ingredients
  - [ ] GET /api/recipes/{id} - Get recipe details
  - [ ] GET /api/foods/search - Search food items/ingredients
  - [ ] Add query parameter validation
  - [ ] Implement caching for frequently searched items (optional)

### Frontend UI
- [ ] Recipe search page/component
  - [ ] Search input for ingredients/recipes
  - [ ] Display search results with images
  - [ ] Recipe detail view
  - [ ] Filter/sort options
  - [ ] Loading states and error handling
  - [ ] Link recipes to pantry items

### Error Handling
- [ ] Handle rate limit errors gracefully
- [ ] Display user-friendly error messages
- [ ] Implement retry logic for transient failures
- [ ] Add fallback UI when API is unavailable

---

## 3. Tune AI Agent for Receipt Scanning (13 pts)

**User Story:** As a user, I want to scan a receipt and auto-add items so I don't manually type everything.

**Dependencies/Blockers:** Model quality/consistency; image handling; edge cases (blur, weird fonts)

### Define Input/Output Format
- [ ] Define receipt scan input/output format (image → extracted line items)
  - [ ] Document expected image formats (JPG, PNG, PDF)
  - [ ] Define output JSON structure for extracted items
  - [ ] Create Pydantic models for receipt data

### Backend Pipeline
- [ ] Implement image upload → extraction → parsed items list
  - [ ] POST /api/receipts/scan - Upload receipt image
  - [ ] Integrate OpenAI Vision API or alternative OCR service
  - [ ] Parse extracted text into structured items
  - [ ] Extract item names, quantities, prices, dates
  - [ ] Handle image preprocessing (resize, enhance quality)

### Post-Processing
- [ ] Post-processing rules
  - [ ] Quantity normalization (convert units, handle fractions)
  - [ ] Item name normalization (remove extra spaces, standardize)
  - [ ] Duplicate detection and merging
  - [ ] Category assignment (optional)
  - [ ] Price extraction and validation

### Frontend UI
- [ ] Upload receipt interface
  - [ ] Image upload component (drag & drop or file picker)
  - [ ] Image preview before submission
  - [ ] Loading state during processing
  - [ ] Review/edit extracted items before adding
  - [ ] Edit item details (name, quantity, expiration)
  - [ ] Bulk add to pantry functionality
  - [ ] Error handling for failed scans

### Testing & Validation
- [ ] Validation tests with multiple receipt examples
  - [ ] Test with different receipt formats (grocery stores, formats)
  - [ ] Test with blurry/poor quality images
  - [ ] Test with unusual fonts/layouts
  - [ ] Test edge cases (handwritten notes, damaged receipts)
  - [ ] Measure accuracy and improve prompts as needed

---

## 4. CRUD for Items in the Pantry (8 pts)

**User Story:** As a user, I want to add/edit/delete pantry items so my pantry stays accurate.

**Dependencies/Blockers:** Household scoping must be in place (or done in parallel carefully)

### Backend Endpoints
- [ ] Update pantry item endpoints (scoped to household)
  - [ ] GET /api/items - List pantry items (household-scoped)
  - [ ] GET /api/items/{id} - Get single item
  - [ ] POST /api/items - Create new item
  - [ ] PUT /api/items/{id} - Update existing item
  - [ ] DELETE /api/items/{id} - Delete item
  - [ ] Ensure all endpoints respect household membership
  - [ ] Add bulk operations (optional)

### Frontend UI
- [ ] Pantry list view
  - [ ] Display items in a grid or list
  - [ ] Show item details (name, quantity, expiration, category)
  - [ ] Filter and sort functionality
  - [ ] Search items by name
  - [ ] Pagination for large lists

- [ ] Add/edit modal/forms
  - [ ] Create item modal/form
  - [ ] Edit item modal/form
  - [ ] Input fields: name, quantity, unit, category, expiration date
  - [ ] Form validation
  - [ ] Save/cancel actions

- [ ] Delete functionality
  - [ ] Delete button with confirmation dialog
  - [ ] Undo delete (optional - show toast with undo button)
  - [ ] Handle delete errors gracefully

### Input Validation
- [ ] Validate item inputs
  - [ ] Name: required, non-empty, max length
  - [ ] Quantity: positive number, reasonable max
  - [ ] Unit: valid unit type (if using units)
  - [ ] Category: valid category (if using categories)
  - [ ] Expiration date: valid date format, not in past (optional)
  - [ ] Display validation errors in UI

---

## 5. Estimated Expiration Dates for Items Added (8 pts)

**User Story:** As a user, I want suggested expiration dates so the app can warn me before food goes bad.

**Dependencies/Blockers:** Item categories need to exist; API metadata optional

### Database Schema
- [ ] Add expiration date fields (if not already)
  - [ ] Add `purchased_date` field to items table
  - [ ] Ensure `expiration_date` field exists
  - [ ] Add `storage_type` field (pantry/fridge/freezer) - optional
  - [ ] Create database migration

### Expiration Rules
- [ ] Decide rules for expiration: defaults by category + user override
  - [ ] Define default expiration periods by category
  - [ ] Define expiration periods by storage type
  - [ ] Create lookup table or configuration for expiration rules
  - [ ] Document expiration logic

### Auto-Suggest Expiration
- [ ] Implement auto-suggest expiration based on:
  - [ ] Item type/category (primary method)
  - [ ] Spoonacular metadata when available (optional enhancement)
  - [ ] Storage type (pantry/fridge/freezer) if tracked
  - [ ] Purchased date (calculate from purchase date + shelf life)
  - [ ] User preferences/history (optional)

### Backend Implementation
- [ ] Create expiration suggestion endpoint
  - [ ] POST /api/items/suggest-expiration - Get suggested expiration date
  - [ ] Accept item name, category, storage type, purchased date
  - [ ] Return suggested expiration date with confidence level
  - [ ] Integrate with Spoonacular API for food metadata (optional)

### Frontend UI
- [ ] Show suggested expiration + allow edit
  - [ ] Display suggested expiration date when adding item
  - [ ] Show expiration date picker with suggestion pre-filled
  - [ ] Allow user to override suggested date
  - [ ] Show expiration warnings in pantry list
  - [ ] Visual indicators for expiring/expired items

### Testing
- [ ] Verify common items produce reasonable dates
  - [ ] Test with common pantry items (canned goods, pasta, etc.)
  - [ ] Test with perishables (milk, produce, meat)
  - [ ] Test with frozen items
  - [ ] Verify dates are reasonable (not too short/long)
  - [ ] Test edge cases (unknown items, unusual categories)

---

## Sprint 4 Summary

**Total Estimated Points:** 47 pts

**Priority Order:**
1. Household Accounts (foundation for multi-user)
2. CRUD for Items (core functionality)
3. Estimated Expiration Dates (enhanced UX)
4. Spoonacular API (recipe features)
5. AI Receipt Scanning (advanced feature)

**Key Dependencies:**
- Household accounts should be completed early as other features depend on household scoping
- CRUD can be done in parallel with household accounts
- Expiration dates can leverage Spoonacular metadata once API is integrated
