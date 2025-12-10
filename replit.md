# Student Admission Management Service

## Overview
This project is a full-stack TypeScript application designed to manage the entire student admission lifecycle, from initial inquiry to final enrollment. It features a React frontend and an Express.js backend, providing an administrative dashboard for managing admission cycles, student applications, seat configurations, and document tracking. The system adopts an "AI-first" approach, integrating intelligent features such as AI-powered recommendations, eligibility scoring, predictive analytics, smart waitlist prioritization, anomaly detection, trend forecasting, natural language search, sentiment analysis, and smart scheduling to streamline the admission process and support decision-making.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, styled using Tailwind CSS and `shadcn/ui` components based on Radix UI primitives. It adheres to Material Design 3 principles, supports light/dark mode theming, and uses Lucide React for iconography. Data visualizations are handled by Recharts.

### Technical Implementations
The backend is built with Node.js and Express.js, using TypeScript with ESM modules, and exposes RESTful API endpoints. PostgreSQL is used for data persistence, with Drizzle ORM managing type-safe database interactions and migrations. Zod is employed for schema validation. Session management is facilitated by `express-session` with `connect-pg-simple`.

### Feature Specifications
The system encompasses a comprehensive set of features across several categories:
- **Core Features**: Management of admission cycles, grade seat configuration, application CRUD, document upload/verification, a 15-state status workflow with history tracking, communication logs, and notifications.
- **Screening Features**: Scheduling and scoring for entrance tests and interviews.
- **Enrollment Features**: Offer generation, acceptance, enrollment completion, and real-time seat availability tracking.
- **Reporting Features**: Six types of reports including application summaries, seat availability, document verification, entrance test results, enrollment, and rejection analysis.
- **AI-First Features (v2.7.0)**: 29 integrated AI capabilities including application recommendations, eligibility scoring, predictive outcomes, smart waitlist prioritization, dashboard insights, bulk recommendations, smart status transitions, communication templates, application comparison, deadline alerts, quality scoring, grade analytics, AI document scoring, interview preparation, decision support, anomaly detection, trend forecasting, smart form auto-fill, risk assessment, capacity planning, natural language search, sentiment analysis, smart scheduling, workflow optimization (bottleneck detection), cohort analysis (pattern recognition), sibling detection (family grouping), and conversion funnel analytics.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.
- **Drizzle ORM**: For interacting with PostgreSQL.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **shadcn/ui**: Pre-styled UI components built on Radix UI.
- **Lucide React**: Icon library.
- **Recharts**: For data visualization.

### Frontend Libraries
- **TanStack React Query**: Manages server state, caching, and data synchronization.
- **Wouter**: Lightweight client-side router for React.
- **date-fns**: Date manipulation utility library.

### Backend Libraries
- **express-session**: Middleware for managing user sessions.
- **connect-pg-simple**: PostgreSQL session store for `express-session`.
- **Zod**: Schema declaration and validation library.