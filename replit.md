# Hotel Management System

## Overview

This is a comprehensive hotel management system built for modern hospitality operations. The system provides a web-based interface for managing reservations, guest services, room status, front desk operations, housekeeping, billing, and reporting. The application follows Material Design principles with custom adaptations for the hospitality industry, ensuring consistency, accessibility, and professional appearance suitable for enterprise use.

**📋 Feature Tracking**: See [HMS_FEATURE_TRACKER.md](./HMS_FEATURE_TRACKER.md) for complete feature completion status, integration roadmap, and implementation timeline.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/UI component library built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom hotel-specific color palette and design system
- **State Management**: TanStack Query for server state management and caching
- **Forms**: React Hook Form with Zod for form validation and type safety
- **Theme System**: Custom theme provider supporting light/dark modes with CSS variables

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Pattern**: RESTful API design with /api prefix for all endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod schemas shared between client and server

### Data Storage
- **Current Storage**: In-memory storage (MemStorage) as temporary workaround for database connectivity issue
- **Database Schema**: PostgreSQL schema defined with Drizzle ORM in `/shared/schema.ts`
- **Future Migration**: System designed to easily switch back to DatabaseStorage once database connection is restored
- **Storage Implementation**: `/server/mem-storage.ts` implements full IHMSStorage interface with demo data

### Current Storage Details (In-Memory)
- **Implementation**: MemStorage class with Map-based storage for all entities
- **Demo Data**: Pre-seeded with Grand Hotel Demo property, 3 users, room types, rooms, and guest
- **Authentication**: JWT tokens with bcrypt-hashed passwords (synchronous seeding to prevent race conditions)
- **Users**: manager/password123, admin/admin123, frontdesk/frontdesk123
- **Property**: Grand Hotel Demo (prop-demo) in San Francisco
- **Financial Reports**: All report methods implemented returning empty/zero data for clean demo state

### Design System
- **Color Palette**: Custom hotel industry colors (success green, warning amber, error red)
- **Typography**: Inter and Open Sans fonts with consistent sizing (14px-20px range)
- **Spacing**: 4-unit grid system with consistent spacing primitives
- **Components**: Hotel-specific UI components (reservation cards, room status cards, stats cards)
- **Layout**: Sidebar navigation with collapsible design and breadcrumb navigation

### Module Structure
The application is organized into core hotel management modules:
- **Dashboard**: Overview statistics and key metrics
- **Front Desk**: Check-in/check-out operations and guest services
- **Reservations**: Booking management and guest information
- **Rooms**: Room status tracking and housekeeping coordination
- **Guests**: Guest profile and history management
- **Housekeeping**: Room maintenance and cleaning schedules
- **Billing**: Payment processing and invoice management
- **Reports**: Analytics and business intelligence
- **Settings**: System configuration and user management

## External Dependencies

### Database Services
- **Drizzle ORM**: Type-safe database toolkit for schema management and queries
- **PostgreSQL Schema**: Complete database schema defined in shared/schema.ts (ready for migration from in-memory to persistent storage)

### UI and Component Libraries
- **Radix UI**: Headless UI primitives for accessibility and interaction patterns
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework for styling

### Development and Build Tools
- **Vite**: Fast build tool and development server with React plugin
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds

### State Management and HTTP
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state management with validation
- **Zod**: Schema validation for forms and API data

### Fonts and Typography
- **Google Fonts**: Inter and Open Sans fonts for consistent typography
- **Custom Font Loading**: Optimized font loading with preconnect hints

### Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Express Session**: Server-side session management

## Recent Implementation: New Reservation Feature

### Authorization System Enhancement (November 2025)
- **Permission Hierarchy**: Implemented "X.manage" → "X.view" logic in hasPermission()
  - Users with "guests.manage" automatically have "guests.view" access
  - Users with "reservations.manage" automatically have "reservations.view" access
  - Wildcard permissions ("*.manage") imply matching view permissions
- **Updated Permissions**: hotel_manager role now includes:
  - "rooms.view" - View room types, availability, and rate plans
  - "properties.view" - Access property-scoped data and metadata
- **Security**: Permission hierarchy preserves least privilege while enabling management workflows

### Complete Reservation Creation Feature
- **Frontend**: NewReservationDialog component with comprehensive form
  - Guest selection with create-new-guest capability
  - Room type selection with pricing display
  - Rate plan selection
  - Date pickers with automatic nights calculation
  - Automatic total amount calculation (room rate × nights)
  - Adults/children inputs
  - Special requests textarea
  - Full form validation using Zod schema

- **Backend**: Reservation creation with automatic folio generation
  - Auto-generates confirmation numbers (format: RES-{timestamp}-{random})
  - Auto-creates folios with folio numbers (format: FLO-{timestamp}-{random})
  - Date validation with z.coerce.date() for ISO string handling
  - Rate plan restrictions validation (min/max length of stay)
  - Transactional creation prevents race conditions

- **API Endpoints**:
  - GET /api/guests - Fetch all guests by property
  - GET /api/properties/:propertyId/room-types - Fetch room types with pricing
  - GET /api/properties/:propertyId/rate-plans - Fetch available rate plans
  - POST /api/reservations - Create reservation with validation
  - POST /api/guests - Create new guest with property association

- **Data Flow**:
  1. User selects/creates guest
  2. Selects room type and rate plan
  3. Picks arrival/departure dates
  4. System calculates nights and total amount
  5. User submits reservation
  6. Backend validates and creates reservation
  7. System auto-generates confirmation number
  8. System auto-creates associated folio
  9. Success notification displayed
  10. Reservation appears in list

### Implementation Status
- ✅ Authorization hierarchy working correctly
- ✅ All API endpoints functional with proper permissions
- ✅ Guest creation with validation and propertyId association
- ✅ Date handling (ISO strings coerced to Date objects)
- ✅ End-to-end reservation flow tested and operational
- ✅ No 403 authorization or 400 validation errors
- ✅ Production-ready for UAT (User Acceptance Testing)

## Rooms Module Implementation (November 2025)

### Frontend Features (Rooms.tsx)
- **Room Grid View**: Responsive grid displaying all rooms with status visualization
- **Room Status Cards**: Color-coded cards showing room number, type, floor, status
- **Status Update Dropdown**: Inline dropdown to change room status (clean/dirty/occupied/available/maintenance)
- **Room Types Tab**: Displays room type configurations with pricing and occupancy
- **Rate Plans Tab**: Shows rate plan details with cancellation policies
- **Statistics Dashboard**: Total rooms, occupied, available, clean, dirty, maintenance counts
- **Search & Filtering**: Filter rooms by status, room type, and room number

### Backend APIs (hms-routes.ts)
- GET /api/properties/:propertyId/rooms - Fetch all rooms for a property
- GET /api/properties/:propertyId/room-types - Fetch room types with pricing
- GET /api/properties/:propertyId/rate-plans - Fetch rate plans with policies
- GET /api/reservations - Fetch all reservations for enriching room data
- PATCH /api/rooms/:id/status - Update room status
- PATCH /api/rooms/:id/block - Block/unblock room
- PUT /api/rooms/:id - Update room details
- PUT /api/room-types/:id - Update room type
- PUT /api/rate-plans/:id - Update rate plan

### Query Pattern
All queries use the shared `queryFn` from queryClient.ts which automatically:
- Includes Authorization header from localStorage (hms_token)
- Handles 401 errors by redirecting to login
- Throws proper error messages for failed requests

Example: `useQuery({ queryKey: ['/api/properties/prop-demo/rooms'] })`

## Guests Module Implementation (November 2025)

### Frontend Features (Guests.tsx)
- **Guest Directory**: Responsive grid displaying all guests with search and filtering
- **Statistics Cards**: Total guests, VIP count, Gold/Platinum tier, Blacklisted count
- **Search**: Real-time search by name or email (GET /api/guests/search)
- **Filtering**: Filter by VIP status, blacklist status, loyalty tier, segment, tags
- **Guest Profile Panel**: Tabbed interface with Profile, Loyalty, History, Communications, Preferences
- **Loyalty Management**: Update tier (None/Bronze/Silver/Gold/Platinum) and points
- **Tags System**: Add/remove guest tags with visual chips
- **Blacklist Management**: Toggle blacklist status with reason tracking
- **Segment Management**: Assign guest segment (Business/Leisure/Corporate/Group)
- **GDPR Compliance**: Export guest data (JSON) and anonymize/delete guest
- **Guest Merge**: Merge duplicate guest profiles

### Backend APIs (hms-routes.ts)
- GET /api/guests - Property-scoped guests
- GET /api/guests/all - All guests with optional filters (vipStatus, blacklistStatus, loyaltyTier, segment, tags)
- GET /api/guests/search?query= - Search guests by name/email (returns all matching globally)
- GET /api/guests/:id - Single guest profile
- POST /api/guests - Create new guest
- PUT /api/guests/:id - Update guest details
- PUT /api/guests/:id/loyalty - Update loyalty tier and points
- PUT /api/guests/:id/blacklist - Update blacklist status with reason
- PUT /api/guests/:id/tags - Update guest tags array
- PUT /api/guests/:id/segment - Update guest segment
- GET /api/guests/:id/communications - Get communication log
- POST /api/guests/:id/communications - Add communication entry
- GET /api/guests/:id/export - GDPR data export (all guest data as JSON)
- DELETE /api/guests/:id - GDPR anonymization (replaces PII with "DELETED")
- POST /api/guests/merge - Merge duplicate guests (primary keeps data, secondary deleted)

### Route Ordering Fix
- Critical: Specific routes (/api/guests/all, /api/guests/search, /api/guests/merge) must come BEFORE parameterized route (/api/guests/:id)
- Express matches routes in order; parameterized routes would incorrectly capture "all", "search", "merge" as IDs

### Cache Invalidation Pattern
- After mutations, invalidate cache with exact query keys: `queryClient.invalidateQueries({ queryKey: ["/api/guests/all"] })`
- Use array format for consistent cache segment management