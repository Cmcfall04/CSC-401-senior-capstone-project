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

