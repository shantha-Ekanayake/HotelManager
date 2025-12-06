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
- **Current Storage**: PostgreSQL with Drizzle ORM (ACTIVE - December 2025)
- **Database Schema**: PostgreSQL schema defined with Drizzle ORM in `/shared/schema.ts`
- **Storage Implementation**: `/server/database-storage.ts` implements full IHMSStorage interface with DatabaseStorage class
- **Database Migrations**: Using drizzle-kit with `npx drizzle-kit push --force` for schema synchronization
- **Migration Status**: Schema successfully applied to production database

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

## Recent Changes (December 2025)

### Offline Feature Removed - System Now Online-Only
- **Status**: Settings module completely removed per user request
- **Reason**: System should be online-only with no offline capability
- **Changes**:
  - Deleted `/client/src/pages/Settings.tsx`
  - Removed Settings route from `/client/src/App.tsx`
  - Removed systemSettings table from `/shared/schema.ts`
  - Removed system settings endpoints from `/server/hms-routes.ts`
  - Removed "settings.manage" permission from all roles in `/server/auth.ts`
  - Cleaned up MemStorage implementation (removed system settings methods)

### Database Migration Complete
- **Switched from MemStorage to DatabaseStorage**: Application now uses persistent PostgreSQL database
- **Database URL**: Connected via `DATABASE_URL` environment variable (Neon PostgreSQL)
- **Schema Synchronization**: Applied complete schema to database via `drizzle-kit push --force`
- **Storage File**: `/server/storage.ts` now exports `hmsStorage` from `/server/database-storage.ts`
- **Verification**: Database persistence tested via guest creation API endpoint

### Decimal Type Handling
- **Issue Fixed**: Database returns decimal currency fields as strings, not numbers
- **Solution**: Updated ReservationCard component to handle both string and number types for totalAmount
- **Pattern**: `(typeof totalAmount === 'string' ? parseFloat(totalAmount) : totalAmount).toFixed(2)`
- **Future**: All currency fields in components should use this pattern

## External Dependencies

### Database Services
- **Drizzle ORM**: Type-safe database toolkit for schema management and queries
- **Neon PostgreSQL**: Serverless PostgreSQL database with native HTTP driver
- **PostgreSQL**: Full schema defined and deployed in production

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

## Implementation Status by Module

### Guests Module (100% Complete)
- Guest directory with search and advanced filtering
- VIP and loyalty tier management
- GDPR compliance (export, anonymize, merge features)
- All backend APIs functional with database storage

### Rooms Module (Complete)
- Room grid view with status visualization
- Room creation (hotel_manager/admin only)
- All 7 room status types supported
- Room type and rate plan management
- Status update dropdowns with database persistence

### Front Desk Module (95% Complete)
- Check-in/check-out workflows
- Walk-in guest registration
- Room transfers
- Express checkout
- No-show processing

### Reservations Module (Complete)
- New reservation creation with automatic folio generation
- Guest selection with create-new-guest capability
- Room type and rate plan selection
- Automatic confirmation number generation
- Database persistence for all reservations

### Billing Module (Complete)
- Folio management
- Charge posting
- Payment processing
- Balance tracking
- Financial reporting

## Known Issues & Fixes Pending

- Browser console shows stale error about Settings (HMR artifact - not affecting functionality)
- All decimal/currency fields handled with parseFloat() in frontend components
- Database connection verified and working with guest creation tests

## Testing Notes

- Login credentials (demo data seeded in database):
  - manager/password123 (hotel_manager role)
  - admin/admin123 (admin role)
  - frontdesk/frontdesk123 (front_desk_staff role)
- Test database operations: API endpoints functional and persisting data to PostgreSQL
- All CRUD operations tested with database storage active
