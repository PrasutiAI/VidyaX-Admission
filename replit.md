# Student Admission Management Service

## Overview
This project is an **enterprise-grade, AI-first** full-stack TypeScript application designed to manage the complete student admission lifecycle, from initial inquiry to final enrollment. It features a React frontend and an Express.js backend, providing a comprehensive administrative dashboard for managing admission cycles, student applications, seat configurations, document tracking, and intelligent decision support. The system is powered by **OpenAI GPT-5** for advanced AI capabilities and is **fully configurable** for any educational institution type. Its purpose is to streamline admission processes, enhance decision-making with AI insights, and provide a robust platform for educational institutions.

## User Preferences
Preferred communication style: Simple, everyday language.

## Current Version: 3.1.0

### Key Statistics
- 65+ total features implemented
- 25+ AI-powered features with GPT-5 and rule-based fallback
- 15-state configurable workflow engine
- 5 institution types supported
- 50+ API endpoints
- 50+ configuration options
- Core AI features tested

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, styled with Tailwind CSS and `shadcn/ui` components based on Radix UI. It follows Material Design 3 principles, supports light/dark mode, and uses Lucide React for iconography. Recharts handles data visualizations. Framer Motion provides smooth animations.

### Technical Implementations
The backend is built with Node.js and Express.js, using TypeScript with ESM modules, and exposes RESTful API endpoints. PostgreSQL is used for data persistence with Drizzle ORM for type-safe database interactions. Zod provides schema validation, and `express-session` with `connect-pg-simple` manages sessions.

### AI Architecture
The AI system incorporates enterprise-grade governance including:
- **Model Versioning**: Identifiers for all AI responses (gpt-5-v4.0.0)
- **Confidence Thresholds**: Configurable thresholds for various AI features
- **Audit Logging**: Complete audit trail of all AI decisions with timestamps
- **PII Protection**: Automatic sanitization of sensitive data (email, phone, addresses, IDs)
- **Fallback System**: Graceful degradation to rule-based engines if OpenAI API is unavailable
- **Contract Testing**: Rigorous AI response validation

### Feature Specifications

#### Core Features
- Admission cycle management (draft, open, closed, archived)
- Seat configuration with reserved categories (SC/ST/OBC/EWS/Management)
- Application CRUD with 15-state workflow
- Document management with AI-powered verification
- Communication tracking (call, email, meeting, SMS, notes)
- Notification system with auto-generation

#### Screening Features
- Entrance test scheduling and scoring
- Interview management with AI sentiment analysis
- AI-generated interview questions

#### Enrollment Features
- Offer generation and tracking
- Acceptance/decline handling
- Enrollment completion with seat updates
- Welcome package generation

#### Reporting Features
- Application summary by status/grade
- Seat availability reports
- Document verification status
- Entrance test results analysis
- Enrollment reports
- Rejection analysis
- AI insights reports

#### AI-First Features (Powered by OpenAI GPT-5)
- **Recommendations**: Smart, actionable recommendations per application
- **Eligibility Scoring**: 0-100 score with category breakdown
- **Predictive Analytics**: Enrollment probability prediction
- **Decision Support**: AI reasoning for admission decisions
- **Sentiment Analysis**: Interview notes sentiment detection
- **NLP Search**: Natural language application search
- **Dashboard Insights**: System-wide AI-generated insights
- **Trend Forecasting**: Predict admission trends
- **Anomaly Detection**: Identify unusual patterns
- **Capacity Planning**: AI-driven seat optimization
- **Workflow Optimization**: Bottleneck detection
- **Cohort Analysis**: Pattern recognition across cohorts
- **Sibling Detection**: Automatic family grouping
- **Smart Scheduling**: Optimal scheduling recommendations
- **Communication Templates**: AI-generated email/SMS templates

#### Enterprise Configuration
- Institution type configuration (School, College, University, Training Center, Custom)
- Workflow stage customization with SLA settings
- Document type configuration with AI verification toggle
- Grading system configuration (percentage, GPA, letter grades)
- Fee structure management with refund policies
- Communication template library
- AI scoring weight adjustment
- Comprehensive audit logging

### AI Testing Framework
- Unit tests for all AI functions
- Contract tests for mock response validation
- Integration tests for full AI pipelines
- Fallback system tests
- Audit logging verification
- Configuration access tests
- Health check endpoint

## Project Structure

```
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   └── ui/           # shadcn/ui components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   ├── pages/            # Page components
│   │   ├── App.tsx           # Main app with routing
│   │   └── index.css         # Global styles
├── server/                   # Express backend
│   ├── routes.ts             # API routes (70+ endpoints)
│   ├── storage.ts            # Database operations
│   ├── openai.ts             # AI service with fallback
│   ├── ai-tests.ts           # AI test suite
│   └── index.ts              # Server entry point
├── shared/                   # Shared types
│   └── schema.ts             # Drizzle schema + Zod types
├── FEATURES.md               # Complete feature documentation
├── design_guidelines.md      # UI/UX guidelines
└── replit.md                 # This file
```

## External Dependencies

### Database
- **PostgreSQL**: Primary relational database
- **Drizzle ORM**: For type-safe database operations and migrations

### AI Integration
- **OpenAI GPT-5**: Powers all AI features with structured JSON responses
- **Fallback Engine**: Rule-based fallback mechanism for 100% availability

### UI Component Libraries
- **Radix UI**: Unstyled, accessible UI primitives
- **shadcn/ui**: Pre-styled UI components based on Radix UI
- **Lucide React**: Icon library
- **Recharts**: Data visualization and charting
- **Framer Motion**: Animation library

### Frontend Libraries
- **TanStack React Query v5**: Server state management, caching, and synchronization
- **Wouter**: Lightweight client-side router
- **date-fns**: Date utility library
- **react-hook-form**: Form handling with validation

### Backend Libraries
- **express-session**: Middleware for user session management
- **connect-pg-simple**: PostgreSQL session store
- **Zod**: Schema declaration and validation
- **drizzle-zod**: Generate Zod schemas from Drizzle tables

## Institution Types Supported

### School (K-12)
- Grades: Nursery through Grade 12
- Documents: Birth certificate, address proof, report cards
- Workflow: Full workflow with parent interviews
- AI Focus: Age-appropriate questions, sibling detection

### College (Undergraduate)
- Years: Year 1-4
- Documents: Mark sheets, certificates, migration certificate
- Workflow: Merit-based with entrance exam focus
- AI Focus: Merit ranking, scholarship eligibility

### University (Graduate/Research)
- Levels: Undergraduate, Postgraduate, Ph.D
- Documents: Transcripts, SOP, research proposals, recommendation letters
- Workflow: Research-focused with faculty interviews
- AI Focus: Research fit analysis, supervisor matching

### Training Center
- Levels: Beginner to Professional
- Documents: ID proof, work experience, skill certificates
- Workflow: Skill assessment focused
- AI Focus: Skill gap analysis, job placement prediction

### Custom
- Fully configurable for any institution type
- All settings can be customized

## API Endpoints (70+)

### Core APIs
- `/api/dashboard/stats` - Dashboard statistics
- `/api/admission/cycles` - Cycle management
- `/api/admission/applications` - Application management
- `/api/admission/cycles/:id/seats` - Seat configuration

### AI APIs
- `/api/ai/recommendations/:id` - AI recommendations
- `/api/ai/eligibility-score/:id` - Eligibility scoring
- `/api/ai/decision-support/:id` - Decision support
- `/api/ai/dashboard-insights` - Dashboard AI insights
- `/api/ai/nlp-search` - Natural language search
- `/api/ai/health` - AI service health check
- `/api/ai/test` - Run AI test suite

### Configuration APIs
- `/api/config/institution` - Institution settings
- `/api/config/workflow-stages` - Workflow configuration
- `/api/config/document-types` - Document settings
- `/api/config/scoring-weights` - AI scoring weights

### Report APIs
- `/api/reports/application-summary` - Application summary
- `/api/reports/enrollment` - Enrollment report
- `/api/reports/document-verification` - Document status
- `/api/reports/entrance-test-results` - Test results

## Running the Application

The application runs on port 5000 with:
- Frontend: Vite dev server (hot reload)
- Backend: Express.js API server
- Database: PostgreSQL

Start command: `npm run dev`

## Recent Changes

### Version 4.0.0 (December 2025)
- Enhanced FEATURES.md with comprehensive documentation
- Rigorous AI testing framework
- Enterprise-grade AI governance
- Institution configurability for any educational type
- 85+ features implemented
- 35+ AI-powered features
