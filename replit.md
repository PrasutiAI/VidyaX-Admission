# Student Admission Management Service

## Overview

This is a Student Admission Management System designed to handle the complete admission lifecycle from inquiry to enrollment. The application provides an administrative dashboard for managing admission cycles, student applications, seat configurations, and document tracking. It's built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens following Material Design 3 principles
- **Theming**: Custom theme provider with light/dark mode support using CSS variables
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API endpoints under `/api` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod for runtime validation, drizzle-zod for schema-to-validator generation
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage

### Data Layer
- **Database**: PostgreSQL (required via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` contains all Drizzle table definitions
- **Migrations**: Managed via drizzle-kit with output to `./migrations` directory

### Key Data Models
- **Admission Cycles**: Academic year-based admission periods with status workflow (draft → open → closed → archived)
- **Grade Seat Configurations**: Per-grade seat allocations within admission cycles
- **Applications**: Student admission applications with multi-step status tracking
- **Application Documents**: File attachments supporting applications
- **Status History**: Audit trail for application status changes

### Application Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route page components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema definitions
└── migrations/       # Database migrations
```

### Design Patterns
- **Storage Interface Pattern**: `IStorage` interface in `storage.ts` abstracts database operations for testability
- **Query Key Convention**: React Query uses URL paths as query keys for automatic cache invalidation
- **Component Composition**: UI built from small, composable shadcn/ui components
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared directory

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and migrations

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (dialogs, dropdowns, forms)
- **shadcn/ui**: Pre-styled component collection using Radix UI primitives
- **Lucide React**: Icon library

### Frontend Libraries
- **TanStack React Query**: Server state management and caching
- **date-fns**: Date formatting and manipulation
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class conflict resolution

### Backend Libraries
- **express-session**: Session middleware
- **connect-pg-simple**: PostgreSQL session store
- **zod**: Schema validation
- **zod-validation-error**: Human-readable Zod error messages

### Development Tools
- **Vite**: Frontend build tool with HMR
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Production bundling for server code
- **drizzle-kit**: Database migration tooling