# Student Admission Management Service

## Overview

This project is a full-stack TypeScript application designed to manage the entire student admission lifecycle, from initial inquiry to final enrollment. It features a React frontend and an Express.js backend, providing an administrative dashboard for managing admission cycles, student applications, seat configurations, and document tracking. A key aspect of the system is its "AI-first" approach, incorporating intelligent features such as AI-powered recommendations, eligibility scoring, predictive analytics for admission outcomes, and smart waitlist prioritization to assist in decision-making and streamline the admission process. The system aims to enhance efficiency and provide data-driven insights for admission management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, styled using Tailwind CSS and `shadcn/ui` components built on Radix UI primitives. It follows Material Design 3 principles, supports light/dark mode theming, and uses Lucide React for iconography. Recharts is used for data visualization.

### Technical Implementations
The backend is built with Node.js and Express.js, utilizing TypeScript with ESM modules. It exposes RESTful API endpoints for all functionalities. Data persistence is managed via PostgreSQL, using Drizzle ORM for type-safe database interactions and migrations. Zod is used for schema validation. Session management is handled by `express-session` with `connect-pg-simple`.

### Feature Specifications
The system encompasses a comprehensive set of features, including:
- **Admission Cycles**: CRUD operations, status management (Draft, Open, Closed, Archived), and application fee configuration.
- **Seat Management**: Configuration of seats per grade, reserved seats, management quota, and real-time availability tracking.
- **Applications**: Multi-step application submission, detailed viewing, 15-state status workflow with history tracking, and unique application number generation.
- **Documents**: Upload, verification, and classification into 8 types (e.g., Birth Certificate, Passport Photo).
- **Screening**: Scheduling and recording of entrance tests and interviews.
- **Enrollment**: Offer generation, acceptance flow, and final enrollment completion.
- **Reporting**: Five types of reports including application summaries and enrollment statistics.
- **Notifications**: Real-time alerts for status changes and events.
- **Communications**: Tracking of interactions (calls, emails, meetings, SMS, notes) with applicants.
- **AI Features**:
    - **Smart Recommendations**: Context-aware suggestions based on application status, documents, screening results, and seat availability.
    - **Eligibility Scoring**: A multi-factor system (0-100 points) based on age, document completion, entrance test, and interview performance, with confidence levels (High, Medium, Low).
    - **Document Suggestions**: Intelligent tracking of required, recommended, and optional documents with verification status.
    - **Waitlist Prioritization**: Scoring factors include test performance, interview performance, academic record, and early application bonus.
    - **Predictive Analytics**: Forecasting admission outcomes.
    - **Auto-Suggest Next Steps**: Context-aware action recommendations.

### System Design Choices
- **Frontend Framework**: React 18 with TypeScript for a dynamic user interface.
- **Backend Runtime**: Node.js with Express.js for a scalable server.
- **Database**: PostgreSQL for robust data storage.
- **ORM**: Drizzle ORM for type-safe and efficient database interactions.
- **State Management**: TanStack React Query for server state caching and synchronization.
- **Styling**: Tailwind CSS with `shadcn/ui` for a modern and consistent UI.
- **Build Tool**: Vite for fast development and optimized production builds.
- **API Design**: RESTful architecture for clear and organized endpoints.
- **AI-First Approach**: Core system logic integrates AI for decision-making assistance, enhancing the efficiency and intelligence of the admission process.

## External Dependencies

### Database
- **PostgreSQL**: Used as the primary relational database.
- **Drizzle ORM**: Object-Relational Mapper for interacting with PostgreSQL.

### UI Component Libraries
- **Radix UI**: Provides unstyled, accessible UI primitives.
- **shadcn/ui**: A collection of pre-styled UI components built on Radix UI.
- **Lucide React**: Icon library for consistent iconography.
- **Recharts**: For data visualization and charting.

### Frontend Libraries
- **TanStack React Query**: Manages server state, caching, and data synchronization.
- **Wouter**: A lightweight client-side router for React.
- **date-fns**: A utility library for date manipulation.

### Backend Libraries
- **express-session**: Middleware for managing user sessions.
- **connect-pg-simple**: PostgreSQL session store for `express-session`.
- **Zod**: Schema declaration and validation library.