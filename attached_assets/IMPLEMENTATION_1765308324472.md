# Student Admission Management Service

## Implementation Guide

### 1. Service Overview

The Student Admission Management Service handles the complete admission lifecycle from inquiry to enrollment. This standalone service manages prospective student applications, screening processes, and final enrollment into the educational institution.

---

### 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Student Admission Service                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Inquiry    │  │  Application │  │  Enrollment  │          │
│  │   Module     │  │   Module     │  │   Module     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Screening   │  │    Seat      │  │     Fee      │          │
│  │   Module     │  │  Management  │  │  Integration │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer (PostgreSQL)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Data Models

#### 3.1 Admission Cycle

```typescript
interface AdmissionCycle {
  id: string;
  academicYear: string;
  cycleName: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'open' | 'closed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3.2 Grade Seat Configuration

```typescript
interface GradeSeatConfig {
  id: string;
  admissionCycleId: string;
  gradeId: string;
  totalSeats: number;
  reservedSeats: Record<string, number>; // category-wise
  managementQuota: number;
  availableSeats: number;
}
```

#### 3.3 Admission Application

```typescript
interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  admissionCycleId: string;
  gradeAppliedFor: string;
  
  // Student Details
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  bloodGroup?: string;
  
  // Guardian Details
  fatherName: string;
  fatherOccupation: string;
  fatherContact: string;
  fatherEmail: string;
  motherName: string;
  motherOccupation: string;
  motherContact: string;
  
  // Address
  currentAddress: Address;
  permanentAddress: Address;
  
  // Previous School
  previousSchoolName?: string;
  previousGrade?: string;
  previousMarks?: number;
  transferCertificateNumber?: string;
  
  // Application Status
  status: ApplicationStatus;
  applicationDate: Date;
  applicationFeeStatus: 'pending' | 'paid';
  applicationFeeTransactionId?: string;
  
  // Documents
  documents: ApplicationDocument[];
  
  // Screening
  entranceTestScore?: number;
  interviewScore?: number;
  interviewNotes?: string;
  
  // Decision
  decisionDate?: Date;
  decisionBy?: string;
  decisionRemarks?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

type ApplicationStatus = 
  | 'inquiry'
  | 'application_submitted'
  | 'documents_pending'
  | 'documents_verified'
  | 'entrance_test_scheduled'
  | 'entrance_test_completed'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'under_review'
  | 'waitlisted'
  | 'offer_extended'
  | 'offer_accepted'
  | 'enrolled'
  | 'rejected'
  | 'withdrawn';
```

#### 3.4 Application Document

```typescript
interface ApplicationDocument {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  remarks?: string;
}

type DocumentType = 
  | 'birth_certificate'
  | 'transfer_certificate'
  | 'previous_report_card'
  | 'category_certificate'
  | 'address_proof'
  | 'passport_photo'
  | 'medical_certificate'
  | 'other';
```

---

### 4. API Endpoints

#### 4.1 Admission Cycle Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admission/cycles` | Create admission cycle |
| GET | `/api/admission/cycles` | List all cycles |
| GET | `/api/admission/cycles/:id` | Get cycle details |
| PUT | `/api/admission/cycles/:id` | Update cycle |
| PATCH | `/api/admission/cycles/:id/status` | Change cycle status |
| DELETE | `/api/admission/cycles/:id` | Delete cycle |

#### 4.2 Seat Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admission/cycles/:id/seats` | Configure grade seats |
| GET | `/api/admission/cycles/:id/seats` | Get seat configuration |
| PUT | `/api/admission/cycles/:id/seats/:gradeId` | Update seat config |
| GET | `/api/admission/cycles/:id/seats/availability` | Get seat availability |

#### 4.3 Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admission/applications` | Submit new application |
| GET | `/api/admission/applications` | List applications (with filters) |
| GET | `/api/admission/applications/:id` | Get application details |
| PUT | `/api/admission/applications/:id` | Update application |
| PATCH | `/api/admission/applications/:id/status` | Update application status |
| POST | `/api/admission/applications/:id/documents` | Upload document |
| DELETE | `/api/admission/applications/:id/documents/:docId` | Delete document |

#### 4.4 Screening

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admission/applications/:id/entrance-test` | Schedule entrance test |
| PUT | `/api/admission/applications/:id/entrance-test/score` | Record test score |
| POST | `/api/admission/applications/:id/interview` | Schedule interview |
| PUT | `/api/admission/applications/:id/interview/result` | Record interview result |

#### 4.5 Enrollment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admission/applications/:id/offer` | Generate offer letter |
| POST | `/api/admission/applications/:id/accept-offer` | Accept admission offer |
| POST | `/api/admission/applications/:id/enroll` | Complete enrollment |
| GET | `/api/admission/applications/:id/offer-letter` | Download offer letter |

---

### 5. Service Implementation

#### 5.1 Application Service

```typescript
class AdmissionApplicationService {
  constructor(
    private db: Database,
    private documentStorage: DocumentStorageService,
    private notificationService: NotificationService,
    private feeService: FeeService
  ) {}

  async submitApplication(data: CreateApplicationDTO): Promise<AdmissionApplication> {
    // 1. Validate admission cycle is open
    const cycle = await this.validateCycleOpen(data.admissionCycleId);
    
    // 2. Validate seat availability
    await this.validateSeatAvailability(data.admissionCycleId, data.gradeAppliedFor);
    
    // 3. Check age eligibility
    await this.validateAgeEligibility(data.dateOfBirth, data.gradeAppliedFor);
    
    // 4. Generate application number
    const applicationNumber = await this.generateApplicationNumber(cycle);
    
    // 5. Create application
    const application = await this.db.admissionApplications.create({
      ...data,
      applicationNumber,
      status: 'application_submitted',
      applicationDate: new Date()
    });
    
    // 6. Create fee record for application fee
    await this.feeService.createApplicationFee(application.id, cycle.applicationFeeAmount);
    
    // 7. Send confirmation notification
    await this.notificationService.sendApplicationConfirmation(application);
    
    return application;
  }

  async updateApplicationStatus(
    applicationId: string, 
    newStatus: ApplicationStatus,
    remarks?: string
  ): Promise<AdmissionApplication> {
    const application = await this.db.admissionApplications.findById(applicationId);
    
    // Validate status transition
    this.validateStatusTransition(application.status, newStatus);
    
    const updated = await this.db.admissionApplications.update(applicationId, {
      status: newStatus,
      updatedAt: new Date()
    });
    
    // Trigger status-specific actions
    await this.handleStatusChange(updated, remarks);
    
    return updated;
  }

  private async handleStatusChange(
    application: AdmissionApplication, 
    remarks?: string
  ): Promise<void> {
    switch (application.status) {
      case 'offer_extended':
        await this.generateOfferLetter(application);
        await this.notificationService.sendOfferLetter(application);
        break;
      case 'enrolled':
        await this.createStudentRecord(application);
        await this.updateSeatAvailability(application);
        break;
      case 'rejected':
        await this.notificationService.sendRejectionNotification(application, remarks);
        break;
    }
  }
}
```

#### 5.2 Seat Management Service

```typescript
class SeatManagementService {
  async checkAvailability(cycleId: string, gradeId: string): Promise<SeatAvailability> {
    const config = await this.db.gradeSeatConfigs.findByCycleAndGrade(cycleId, gradeId);
    const enrolledCount = await this.db.admissionApplications.countEnrolled(cycleId, gradeId);
    const offeredCount = await this.db.admissionApplications.countOffered(cycleId, gradeId);
    
    return {
      totalSeats: config.totalSeats,
      enrolled: enrolledCount,
      offered: offeredCount,
      available: config.totalSeats - enrolledCount - offeredCount,
      reservedByCategory: config.reservedSeats
    };
  }

  async reserveSeat(applicationId: string): Promise<void> {
    const application = await this.db.admissionApplications.findById(applicationId);
    
    await this.db.transaction(async (tx) => {
      const availability = await this.checkAvailability(
        application.admissionCycleId, 
        application.gradeAppliedFor
      );
      
      if (availability.available <= 0) {
        throw new Error('No seats available');
      }
      
      await tx.seatReservations.create({
        applicationId,
        reservedAt: new Date(),
        expiresAt: addDays(new Date(), 7) // 7 days to complete enrollment
      });
    });
  }
}
```

---

### 6. Workflow States

```
┌─────────────┐
│   INQUIRY   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ APPLICATION_SUBMITTED│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  DOCUMENTS_PENDING  │◄────────────┐
└──────────┬──────────┘             │
           │                        │
           ▼                        │
┌─────────────────────┐    ┌───────┴────────┐
│ DOCUMENTS_VERIFIED  │    │ Document Rejected│
└──────────┬──────────┘    └────────────────┘
           │
           ▼
┌─────────────────────┐
│ ENTRANCE_TEST_      │
│ SCHEDULED           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ENTRANCE_TEST_      │
│ COMPLETED           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ INTERVIEW_SCHEDULED │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ INTERVIEW_COMPLETED │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    UNDER_REVIEW     │
└──────────┬──────────┘
           │
     ┌─────┴─────┬────────────┐
     ▼           ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│OFFER_   │ │WAITLIST │ │REJECTED │
│EXTENDED │ │ED       │ └─────────┘
└────┬────┘ └─────────┘
     │
     ▼
┌─────────────────────┐
│   OFFER_ACCEPTED    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      ENROLLED       │
└─────────────────────┘
```

---

### 7. Integration Points

| Service | Integration Type | Purpose |
|---------|-----------------|---------|
| Fee Management | API | Application fee, admission fee processing |
| Document Storage | API | Store and retrieve uploaded documents |
| Notification Service | Event | Email/SMS notifications to applicants |
| Student Profile Service | Event | Create student record upon enrollment |
| Class Management | API | Assign enrolled student to class/section |
| Payment Gateway | API | Online application fee payment |

---

### 8. Configuration

```yaml
admission:
  applicationNumberFormat: "{YEAR}/{GRADE}/{SEQ}"
  defaultGracePeriodDays: 7
  documentSizeLimit: 5MB
  allowedDocumentTypes: ["pdf", "jpg", "png"]
  
  ageEligibility:
    - grade: "nursery"
      minAge: 3
      maxAge: 4
      asOnDate: "april-01"
    - grade: "grade1"
      minAge: 5
      maxAge: 6
      asOnDate: "april-01"
  
  entranceTest:
    enabled: true
    applicableGrades: ["grade6", "grade9", "grade11"]
    passPercentage: 40
  
  interview:
    enabled: true
    applicableGrades: ["grade11", "grade12"]
```

---

### 9. Events Published

| Event | Trigger | Payload |
|-------|---------|---------|
| `admission.application.submitted` | New application | Application details |
| `admission.application.statusChanged` | Status update | Application ID, old/new status |
| `admission.offer.extended` | Offer generated | Application, offer details |
| `admission.offer.accepted` | Offer accepted | Application ID |
| `admission.student.enrolled` | Enrollment complete | Application, student ID |
| `admission.application.rejected` | Application rejected | Application ID, reason |

---

### 10. Security & Permissions

| Permission | Description |
|------------|-------------|
| `admission.cycle.manage` | Create/edit admission cycles |
| `admission.application.view` | View applications |
| `admission.application.process` | Process applications (verify, schedule) |
| `admission.application.decide` | Make admission decisions |
| `admission.seats.manage` | Manage seat configurations |
| `admission.reports.view` | View admission reports |

---

### 11. Reports

1. **Application Summary Report**: Count of applications by status, grade
2. **Seat Availability Report**: Available seats by grade, category
3. **Document Verification Report**: Pending verifications
4. **Entrance Test Results Report**: Test scores by grade
5. **Enrollment Report**: Enrolled students by grade, date
6. **Rejection Analysis Report**: Rejection reasons breakdown
