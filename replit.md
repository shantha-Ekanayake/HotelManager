# Hotel Management System

## Overview

This is a comprehensive hotel management system built for modern hospitality operations. The system provides a web-based interface for managing reservations, guest services, room status, front desk operations, housekeeping, billing, and reporting. The application follows Material Design principles with custom adaptations for the hospitality industry, ensuring consistency, accessibility, and professional appearance suitable for enterprise use.

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
- **Database**: PostgreSQL with Neon serverless configuration
- **Connection**: Connection pooling via @neondatabase/serverless
- **Migrations**: Drizzle Kit for database schema migrations
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

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
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit for schema management and queries

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