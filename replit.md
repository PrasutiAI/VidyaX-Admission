# Student Admission Management Service

## Overview
This project is an **enterprise-grade, AI-first** full-stack TypeScript application designed to manage the complete student admission lifecycle, from initial inquiry to final enrollment. It features a React frontend and an Express.js backend, providing a comprehensive administrative dashboard for managing admission cycles, student applications, seat configurations, document tracking, and intelligent decision support. The system is powered by **OpenAI GPT-5** for advanced AI capabilities and is **fully configurable** for any educational institution type. Its purpose is to streamline admission processes, enhance decision-making with AI insights, and provide a robust platform for educational institutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, styled with Tailwind CSS and `shadcn/ui` components based on Radix UI. It follows Material Design 3 principles, supports light/dark mode, and uses Lucide React for iconography. Recharts handles data visualizations.

### Technical Implementations
The backend is built with Node.js and Express.js, using TypeScript with ESM modules, and exposes RESTful API endpoints. PostgreSQL is used for data persistence with Drizzle ORM for type-safe database interactions. Zod provides schema validation, and `express-session` with `connect-pg-simple` manages sessions.

### AI Architecture
The AI system incorporates enterprise-grade governance including:
- **Model Versioning**: Identifiers for all AI responses.
- **Confidence Thresholds**: Configurable thresholds for various AI features.
- **Audit Logging**: A complete audit trail of all AI decisions.
- **PII Protection**: Automatic sanitization of sensitive data.
- **Fallback System**: Graceful degradation to rule-based engines if the OpenAI API is unavailable.

### Feature Specifications
The system manages admission cycles, seat configurations, application CRUD, document management, a 15-state status workflow with history, communication tracking, and notifications. Screening features include entrance test and interview scheduling/scoring. Enrollment features cover offer generation, acceptance, and enrollment completion with real-time seat tracking. Reporting includes application summaries, seat availability, document verification, and enrollment reports.

AI-first features, powered by OpenAI GPT-5, include:
- **Recommendations & Eligibility Scoring**: Smart, actionable insights and eligibility scores.
- **Predictive Analytics**: Predictive outcomes, trend forecasting, and anomaly detection.
- **Workflow Optimization**: AI-suggested next steps, smart status transitions, and bottleneck detection.
- **Decision Support**: AI reasoning for admission decisions, risk assessment, and capacity planning.
- **Communication & Insights**: Auto-generated communication templates, dashboard insights, and cohort analysis.

Enterprise features include comprehensive configuration for institutions, workflow stages, document types, grading systems, fee structures, communication templates, and AI scoring weights. It also includes audit logging, feature flags, and AI governance with hierarchical configuration.

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database.
- **Drizzle ORM**: For type-safe database operations and migrations.

### AI Integration
- **OpenAI GPT-5**: Powers all AI features, expecting structured JSON responses.
- **Fallback Engine**: Rule-based fallback mechanism.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible UI primitives.
- **shadcn/ui**: Pre-styled UI components based on Radix UI.
- **Lucide React**: Icon library.
- **Recharts**: Data visualization and charting.

### Frontend Libraries
- **TanStack React Query**: Server state management, caching, and synchronization.
- **Wouter**: Lightweight client-side router.
- **date-fns**: Date utility library.
- **Framer Motion**: Animation library.

### Backend Libraries
- **express-session**: Middleware for user session management.
- **connect-pg-simple**: PostgreSQL session store.
- **Zod**: Schema declaration and validation.