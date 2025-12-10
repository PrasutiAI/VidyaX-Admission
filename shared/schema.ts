import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (for admin authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Admission Cycle
export const admissionCycles = pgTable("admission_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  academicYear: text("academic_year").notNull(),
  cycleName: text("cycle_name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status", { enum: ["draft", "open", "closed", "archived"] }).notNull().default("draft"),
  applicationFeeAmount: decimal("application_fee_amount", { precision: 10, scale: 2 }).default("500"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admissionCyclesRelations = relations(admissionCycles, ({ many }) => ({
  seatConfigs: many(gradeSeatConfigs),
  applications: many(admissionApplications),
}));

export const insertAdmissionCycleSchema = createInsertSchema(admissionCycles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdmissionCycle = z.infer<typeof insertAdmissionCycleSchema>;
export type AdmissionCycle = typeof admissionCycles.$inferSelect;

// Grade Seat Configuration
export const gradeSeatConfigs = pgTable("grade_seat_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  admissionCycleId: varchar("admission_cycle_id").notNull().references(() => admissionCycles.id, { onDelete: "cascade" }),
  gradeId: text("grade_id").notNull(),
  gradeName: text("grade_name").notNull(),
  totalSeats: integer("total_seats").notNull().default(30),
  reservedSeats: jsonb("reserved_seats").$type<Record<string, number>>().default({}),
  managementQuota: integer("management_quota").notNull().default(0),
  availableSeats: integer("available_seats").notNull().default(30),
});

export const gradeSeatConfigsRelations = relations(gradeSeatConfigs, ({ one }) => ({
  admissionCycle: one(admissionCycles, {
    fields: [gradeSeatConfigs.admissionCycleId],
    references: [admissionCycles.id],
  }),
}));

export const insertGradeSeatConfigSchema = createInsertSchema(gradeSeatConfigs).omit({
  id: true,
});

export type InsertGradeSeatConfig = z.infer<typeof insertGradeSeatConfigSchema>;
export type GradeSeatConfig = typeof gradeSeatConfigs.$inferSelect;

// Address type
export const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string().default("India"),
});

export type Address = z.infer<typeof addressSchema>;

// Application Status
export const applicationStatusEnum = [
  "inquiry",
  "application_submitted",
  "documents_pending",
  "documents_verified",
  "entrance_test_scheduled",
  "entrance_test_completed",
  "interview_scheduled",
  "interview_completed",
  "under_review",
  "waitlisted",
  "offer_extended",
  "offer_accepted",
  "enrolled",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof applicationStatusEnum)[number];

// Admission Application
export const admissionApplications = pgTable("admission_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationNumber: text("application_number").notNull().unique(),
  admissionCycleId: varchar("admission_cycle_id").notNull().references(() => admissionCycles.id),
  gradeAppliedFor: text("grade_applied_for").notNull(),
  
  // Student Details
  studentFirstName: text("student_first_name").notNull(),
  studentLastName: text("student_last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender", { enum: ["male", "female", "other"] }).notNull(),
  nationality: text("nationality").notNull().default("Indian"),
  bloodGroup: text("blood_group"),
  
  // Guardian Details
  fatherName: text("father_name").notNull(),
  fatherOccupation: text("father_occupation"),
  fatherContact: text("father_contact").notNull(),
  fatherEmail: text("father_email").notNull(),
  motherName: text("mother_name").notNull(),
  motherOccupation: text("mother_occupation"),
  motherContact: text("mother_contact"),
  
  // Address
  currentAddress: jsonb("current_address").$type<Address>().notNull(),
  permanentAddress: jsonb("permanent_address").$type<Address>(),
  
  // Previous School
  previousSchoolName: text("previous_school_name"),
  previousGrade: text("previous_grade"),
  previousMarks: decimal("previous_marks", { precision: 5, scale: 2 }),
  transferCertificateNumber: text("transfer_certificate_number"),
  
  // Application Status
  status: text("status", { enum: applicationStatusEnum }).notNull().default("application_submitted"),
  applicationDate: timestamp("application_date").defaultNow(),
  applicationFeeStatus: text("application_fee_status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  applicationFeeTransactionId: text("application_fee_transaction_id"),
  
  // Screening
  entranceTestDate: date("entrance_test_date"),
  entranceTestScore: decimal("entrance_test_score", { precision: 5, scale: 2 }),
  interviewDate: date("interview_date"),
  interviewScore: decimal("interview_score", { precision: 5, scale: 2 }),
  interviewNotes: text("interview_notes"),
  
  // Decision
  decisionDate: timestamp("decision_date"),
  decisionBy: text("decision_by"),
  decisionRemarks: text("decision_remarks"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admissionApplicationsRelations = relations(admissionApplications, ({ one, many }) => ({
  admissionCycle: one(admissionCycles, {
    fields: [admissionApplications.admissionCycleId],
    references: [admissionCycles.id],
  }),
  documents: many(applicationDocuments),
  statusHistory: many(applicationStatusHistory),
}));

export const insertAdmissionApplicationSchema = createInsertSchema(admissionApplications).omit({
  id: true,
  applicationNumber: true,
  createdAt: true,
  updatedAt: true,
  applicationDate: true,
});

export type InsertAdmissionApplication = z.infer<typeof insertAdmissionApplicationSchema>;
export type AdmissionApplication = typeof admissionApplications.$inferSelect;

// Document Types
export const documentTypeEnum = [
  "birth_certificate",
  "transfer_certificate",
  "previous_report_card",
  "category_certificate",
  "address_proof",
  "passport_photo",
  "medical_certificate",
  "other",
] as const;

export type DocumentType = (typeof documentTypeEnum)[number];

// Application Documents
export const applicationDocuments = pgTable("application_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
  documentType: text("document_type", { enum: documentTypeEnum }).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  verifiedBy: text("verified_by"),
  verifiedAt: timestamp("verified_at"),
  remarks: text("remarks"),
});

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(admissionApplications, {
    fields: [applicationDocuments.applicationId],
    references: [admissionApplications.id],
  }),
}));

export const insertApplicationDocumentSchema = createInsertSchema(applicationDocuments).omit({
  id: true,
  uploadedAt: true,
});

export type InsertApplicationDocument = z.infer<typeof insertApplicationDocumentSchema>;
export type ApplicationDocument = typeof applicationDocuments.$inferSelect;

// Application Status History
export const applicationStatusHistory = pgTable("application_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
  fromStatus: text("from_status", { enum: applicationStatusEnum }),
  toStatus: text("to_status", { enum: applicationStatusEnum }).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: text("changed_by"),
  remarks: text("remarks"),
});

export const applicationStatusHistoryRelations = relations(applicationStatusHistory, ({ one }) => ({
  application: one(admissionApplications, {
    fields: [applicationStatusHistory.applicationId],
    references: [admissionApplications.id],
  }),
}));

export const insertApplicationStatusHistorySchema = createInsertSchema(applicationStatusHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertApplicationStatusHistory = z.infer<typeof insertApplicationStatusHistorySchema>;
export type ApplicationStatusHistory = typeof applicationStatusHistory.$inferSelect;

// Application Communications/Notes
export const applicationCommunicationTypeEnum = [
  "call",
  "email",
  "meeting",
  "sms",
  "note",
] as const;

export type CommunicationType = (typeof applicationCommunicationTypeEnum)[number];

export const applicationCommunications = pgTable("application_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
  type: text("type", { enum: applicationCommunicationTypeEnum }).notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  contactPerson: text("contact_person"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by"),
});

export const applicationCommunicationsRelations = relations(applicationCommunications, ({ one }) => ({
  application: one(admissionApplications, {
    fields: [applicationCommunications.applicationId],
    references: [admissionApplications.id],
  }),
}));

export const insertApplicationCommunicationSchema = createInsertSchema(applicationCommunications).omit({
  id: true,
  createdAt: true,
});

export type InsertApplicationCommunication = z.infer<typeof insertApplicationCommunicationSchema>;
export type ApplicationCommunication = typeof applicationCommunications.$inferSelect;

// Notifications
export const notificationTypeEnum = [
  "reminder",
  "status_change",
  "deadline",
  "document",
  "system",
] as const;

export type NotificationType = (typeof notificationTypeEnum)[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type", { enum: notificationTypeEnum }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  applicationId: varchar("application_id").references(() => admissionApplications.id, { onDelete: "cascade" }),
  isRead: text("is_read", { enum: ["true", "false"] }).notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  application: one(admissionApplications, {
    fields: [notifications.applicationId],
    references: [admissionApplications.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Seat Reservations
export const seatReservations = pgTable("seat_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => admissionApplications.id, { onDelete: "cascade" }),
  reservedAt: timestamp("reserved_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
});

export const seatReservationsRelations = relations(seatReservations, ({ one }) => ({
  application: one(admissionApplications, {
    fields: [seatReservations.applicationId],
    references: [admissionApplications.id],
  }),
}));

export const insertSeatReservationSchema = createInsertSchema(seatReservations).omit({
  id: true,
  reservedAt: true,
});

export type InsertSeatReservation = z.infer<typeof insertSeatReservationSchema>;
export type SeatReservation = typeof seatReservations.$inferSelect;

// Grade options for the application
export const gradeOptions = [
  { id: "nursery", name: "Nursery" },
  { id: "lkg", name: "LKG" },
  { id: "ukg", name: "UKG" },
  { id: "grade1", name: "Grade 1" },
  { id: "grade2", name: "Grade 2" },
  { id: "grade3", name: "Grade 3" },
  { id: "grade4", name: "Grade 4" },
  { id: "grade5", name: "Grade 5" },
  { id: "grade6", name: "Grade 6" },
  { id: "grade7", name: "Grade 7" },
  { id: "grade8", name: "Grade 8" },
  { id: "grade9", name: "Grade 9" },
  { id: "grade10", name: "Grade 10" },
  { id: "grade11", name: "Grade 11" },
  { id: "grade12", name: "Grade 12" },
] as const;

// Status labels for display
export const statusLabels: Record<ApplicationStatus, string> = {
  inquiry: "Inquiry",
  application_submitted: "Application Submitted",
  documents_pending: "Documents Pending",
  documents_verified: "Documents Verified",
  entrance_test_scheduled: "Entrance Test Scheduled",
  entrance_test_completed: "Entrance Test Completed",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  under_review: "Under Review",
  waitlisted: "Waitlisted",
  offer_extended: "Offer Extended",
  offer_accepted: "Offer Accepted",
  enrolled: "Enrolled",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

// Status colors for badges
export const statusColors: Record<ApplicationStatus, { bg: string; text: string }> = {
  inquiry: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" },
  application_submitted: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300" },
  documents_pending: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-300" },
  documents_verified: { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-300" },
  entrance_test_scheduled: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300" },
  entrance_test_completed: { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300" },
  interview_scheduled: { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-700 dark:text-indigo-300" },
  interview_completed: { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-700 dark:text-indigo-300" },
  under_review: { bg: "bg-cyan-100 dark:bg-cyan-900", text: "text-cyan-700 dark:text-cyan-300" },
  waitlisted: { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300" },
  offer_extended: { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-700 dark:text-teal-300" },
  offer_accepted: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300" },
  enrolled: { bg: "bg-green-500", text: "text-white" },
  rejected: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300" },
  withdrawn: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

// Institution Type
export const institutionTypeEnum = [
  "school",
  "college",
  "university",
  "training_center",
  "custom",
] as const;

export type InstitutionType = (typeof institutionTypeEnum)[number];

// Institution Configuration
export const institutionConfigs = pgTable("institution_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  institutionName: text("institution_name").notNull().default("Educational Institution"),
  institutionType: text("institution_type", { enum: institutionTypeEnum }).notNull().default("school"),
  logo: text("logo"),
  address: jsonb("address").$type<Address>(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  settings: jsonb("settings").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInstitutionConfigSchema = createInsertSchema(institutionConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInstitutionConfig = z.infer<typeof insertInstitutionConfigSchema>;
export type InstitutionConfig = typeof institutionConfigs.$inferSelect;

// Workflow Stage Configuration
export const workflowStages = pgTable("workflow_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageKey: text("stage_key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isRequired: text("is_required", { enum: ["true", "false"] }).notNull().default("true"),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  slaHours: integer("sla_hours").default(48),
  notifyOnEntry: text("notify_on_entry", { enum: ["true", "false"] }).notNull().default("false"),
  color: text("color").default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowStageSchema = createInsertSchema(workflowStages).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkflowStage = z.infer<typeof insertWorkflowStageSchema>;
export type WorkflowStage = typeof workflowStages.$inferSelect;

// Document Type Configuration
export const documentTypeConfigs = pgTable("document_type_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  typeKey: text("type_key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isRequired: text("is_required", { enum: ["true", "false"] }).notNull().default("true"),
  applicableGrades: jsonb("applicable_grades").$type<string[]>().default([]),
  acceptedFormats: jsonb("accepted_formats").$type<string[]>().default(["pdf", "jpg", "png"]),
  maxFileSizeMB: integer("max_file_size_mb").default(5),
  aiVerificationEnabled: text("ai_verification_enabled", { enum: ["true", "false"] }).notNull().default("false"),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentTypeConfigSchema = createInsertSchema(documentTypeConfigs).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentTypeConfig = z.infer<typeof insertDocumentTypeConfigSchema>;
export type DocumentTypeConfig = typeof documentTypeConfigs.$inferSelect;

// Grading System Configuration
export const gradingSystemConfigs = pgTable("grading_system_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemType: text("system_type", { enum: ["percentage", "gpa", "letter", "custom"] }).notNull().default("percentage"),
  scale: jsonb("scale").$type<{ grade: string; minScore: number; maxScore: number; points: number }[]>().default([]),
  passingThreshold: decimal("passing_threshold", { precision: 5, scale: 2 }).default("40"),
  entranceTestMaxScore: integer("entrance_test_max_score").default(100),
  interviewMaxScore: integer("interview_max_score").default(100),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGradingSystemConfigSchema = createInsertSchema(gradingSystemConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGradingSystemConfig = z.infer<typeof insertGradingSystemConfigSchema>;
export type GradingSystemConfig = typeof gradingSystemConfigs.$inferSelect;

// Fee Component Configuration
export const feeComponents = pgTable("fee_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("INR"),
  isRefundable: text("is_refundable", { enum: ["true", "false"] }).notNull().default("false"),
  applicableGrades: jsonb("applicable_grades").$type<string[]>().default([]),
  dueDate: text("due_date"),
  lateFeePercentage: decimal("late_fee_percentage", { precision: 5, scale: 2 }).default("0"),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeeComponentSchema = createInsertSchema(feeComponents).omit({
  id: true,
  createdAt: true,
});

export type InsertFeeComponent = z.infer<typeof insertFeeComponentSchema>;
export type FeeComponent = typeof feeComponents.$inferSelect;

// Communication Template Configuration
export const communicationTemplates = pgTable("communication_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  templateType: text("template_type", { enum: ["email", "sms", "whatsapp"] }).notNull().default("email"),
  triggerEvent: text("trigger_event").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  variables: jsonb("variables").$type<string[]>().default([]),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplateSchema>;
export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;

// AI Scoring Weight Configuration
export const scoringWeightConfigs = pgTable("scoring_weight_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentCompleteness: integer("document_completeness").notNull().default(25),
  academicBackground: integer("academic_background").notNull().default(25),
  entranceTestScore: integer("entrance_test_score").notNull().default(25),
  interviewScore: integer("interview_score").notNull().default(25),
  customWeights: jsonb("custom_weights").$type<Record<string, number>>().default({}),
  isActive: text("is_active", { enum: ["true", "false"] }).notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScoringWeightConfigSchema = createInsertSchema(scoringWeightConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScoringWeightConfig = z.infer<typeof insertScoringWeightConfigSchema>;
export type ScoringWeightConfig = typeof scoringWeightConfigs.$inferSelect;

// Audit Action Types
export const auditActionEnum = [
  "create",
  "update",
  "delete",
  "status_change",
  "access",
  "login",
  "logout",
  "config_change",
] as const;

export type AuditAction = (typeof auditActionEnum)[number];

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  action: text("action", { enum: auditActionEnum }).notNull(),
  previousValue: jsonb("previous_value").$type<Record<string, any>>(),
  newValue: jsonb("new_value").$type<Record<string, any>>(),
  performedBy: text("performed_by"),
  performedAt: timestamp("performed_at").defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  performedAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
