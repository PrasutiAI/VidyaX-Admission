import { 
  users, type User, type InsertUser,
  admissionCycles, type AdmissionCycle, type InsertAdmissionCycle,
  gradeSeatConfigs, type GradeSeatConfig, type InsertGradeSeatConfig,
  admissionApplications, type AdmissionApplication, type InsertAdmissionApplication,
  applicationDocuments, type ApplicationDocument, type InsertApplicationDocument,
  applicationStatusHistory, type ApplicationStatusHistory, type InsertApplicationStatusHistory,
  seatReservations, type SeatReservation, type InsertSeatReservation,
  applicationCommunications, type ApplicationCommunication, type InsertApplicationCommunication,
  notifications, type Notification, type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Admission Cycles
  getAdmissionCycles(): Promise<AdmissionCycle[]>;
  getAdmissionCycle(id: string): Promise<AdmissionCycle | undefined>;
  getActiveAdmissionCycle(): Promise<AdmissionCycle | undefined>;
  createAdmissionCycle(cycle: InsertAdmissionCycle): Promise<AdmissionCycle>;
  updateAdmissionCycle(id: string, cycle: Partial<InsertAdmissionCycle>): Promise<AdmissionCycle | undefined>;
  updateAdmissionCycleStatus(id: string, status: string): Promise<AdmissionCycle | undefined>;
  deleteAdmissionCycle(id: string): Promise<boolean>;
  
  // Seat Configs
  getSeatConfigs(cycleId: string): Promise<GradeSeatConfig[]>;
  getSeatConfig(cycleId: string, gradeId: string): Promise<GradeSeatConfig | undefined>;
  createSeatConfig(config: InsertGradeSeatConfig): Promise<GradeSeatConfig>;
  updateSeatConfig(cycleId: string, gradeId: string, config: Partial<InsertGradeSeatConfig>): Promise<GradeSeatConfig | undefined>;
  
  // Applications
  getApplications(): Promise<AdmissionApplication[]>;
  getApplication(id: string): Promise<AdmissionApplication | undefined>;
  getApplicationWithRelations(id: string): Promise<any>;
  getRecentApplications(limit?: number): Promise<AdmissionApplication[]>;
  createApplication(application: InsertAdmissionApplication): Promise<AdmissionApplication>;
  updateApplication(id: string, application: Partial<InsertAdmissionApplication>): Promise<AdmissionApplication | undefined>;
  updateApplicationStatus(id: string, status: string, remarks?: string): Promise<AdmissionApplication | undefined>;
  generateApplicationNumber(cycleId: string): Promise<string>;
  
  // Documents
  getApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]>;
  createApplicationDocument(document: InsertApplicationDocument): Promise<ApplicationDocument>;
  updateDocumentVerification(id: string, status: "pending" | "verified" | "rejected", remarks?: string): Promise<ApplicationDocument | undefined>;
  deleteApplicationDocument(id: string): Promise<boolean>;
  
  // Status History
  getApplicationStatusHistory(applicationId: string): Promise<ApplicationStatusHistory[]>;
  createStatusHistoryEntry(entry: InsertApplicationStatusHistory): Promise<ApplicationStatusHistory>;
  
  // Dashboard Stats
  getDashboardStats(): Promise<{ totalApplications: number; pendingReviews: number; enrolled: number; enrollmentRate: number }>;
  
  // Seat Availability
  getSeatAvailability(cycleId: string): Promise<any[]>;
  
  // Scheduling
  scheduleEntranceTest(applicationId: string, date: string): Promise<AdmissionApplication | undefined>;
  scheduleInterview(applicationId: string, date: string): Promise<AdmissionApplication | undefined>;
  
  // Enrollment Workflow
  generateOffer(applicationId: string, remarks?: string): Promise<AdmissionApplication | undefined>;
  acceptOffer(applicationId: string): Promise<AdmissionApplication | undefined>;
  completeEnrollment(applicationId: string): Promise<AdmissionApplication | undefined>;
  
  // Reports
  getApplicationSummary(): Promise<any>;
  getEnrollmentReport(): Promise<any>;
  getDocumentVerificationReport(): Promise<any>;
  
  // Communications
  getApplicationCommunications(applicationId: string): Promise<ApplicationCommunication[]>;
  createCommunication(communication: InsertApplicationCommunication): Promise<ApplicationCommunication>;
  
  // Notifications
  getNotifications(): Promise<Notification[]>;
  getUnreadNotificationsCount(): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(): Promise<void>;
  
  // Analytics
  getApplicationsByStatus(): Promise<{ status: string; count: number }[]>;
  getApplicationTrends(): Promise<{ date: string; count: number }[]>;
  getScheduledEvents(): Promise<any[]>;
  
  // Additional Reports
  getEntranceTestResultsReport(): Promise<any>;
  getRejectionAnalysisReport(): Promise<any>;
  
  // Offer Letter
  generateOfferLetterData(applicationId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Admission Cycles
  async getAdmissionCycles(): Promise<AdmissionCycle[]> {
    return db.select().from(admissionCycles).orderBy(desc(admissionCycles.createdAt));
  }

  async getAdmissionCycle(id: string): Promise<AdmissionCycle | undefined> {
    const [cycle] = await db.select().from(admissionCycles).where(eq(admissionCycles.id, id));
    return cycle || undefined;
  }

  async getActiveAdmissionCycle(): Promise<AdmissionCycle | undefined> {
    const [cycle] = await db.select().from(admissionCycles).where(eq(admissionCycles.status, "open")).limit(1);
    return cycle || undefined;
  }

  async createAdmissionCycle(cycle: InsertAdmissionCycle): Promise<AdmissionCycle> {
    const [created] = await db.insert(admissionCycles).values(cycle).returning();
    return created;
  }

  async updateAdmissionCycle(id: string, cycle: Partial<InsertAdmissionCycle>): Promise<AdmissionCycle | undefined> {
    const [updated] = await db.update(admissionCycles)
      .set({ ...cycle, updatedAt: new Date() })
      .where(eq(admissionCycles.id, id))
      .returning();
    return updated || undefined;
  }

  async updateAdmissionCycleStatus(id: string, status: string): Promise<AdmissionCycle | undefined> {
    const [updated] = await db.update(admissionCycles)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(admissionCycles.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAdmissionCycle(id: string): Promise<boolean> {
    const result = await db.delete(admissionCycles).where(eq(admissionCycles.id, id));
    return true;
  }

  // Seat Configs
  async getSeatConfigs(cycleId: string): Promise<GradeSeatConfig[]> {
    return db.select().from(gradeSeatConfigs).where(eq(gradeSeatConfigs.admissionCycleId, cycleId));
  }

  async getSeatConfig(cycleId: string, gradeId: string): Promise<GradeSeatConfig | undefined> {
    const [config] = await db.select().from(gradeSeatConfigs)
      .where(and(eq(gradeSeatConfigs.admissionCycleId, cycleId), eq(gradeSeatConfigs.gradeId, gradeId)));
    return config || undefined;
  }

  async createSeatConfig(config: InsertGradeSeatConfig): Promise<GradeSeatConfig> {
    const [created] = await db.insert(gradeSeatConfigs).values(config).returning();
    return created;
  }

  async updateSeatConfig(cycleId: string, gradeId: string, config: Partial<InsertGradeSeatConfig>): Promise<GradeSeatConfig | undefined> {
    const [updated] = await db.update(gradeSeatConfigs)
      .set(config)
      .where(and(eq(gradeSeatConfigs.admissionCycleId, cycleId), eq(gradeSeatConfigs.gradeId, gradeId)))
      .returning();
    return updated || undefined;
  }

  // Applications
  async getApplications(): Promise<AdmissionApplication[]> {
    return db.select().from(admissionApplications).orderBy(desc(admissionApplications.createdAt));
  }

  async getApplication(id: string): Promise<AdmissionApplication | undefined> {
    const [application] = await db.select().from(admissionApplications).where(eq(admissionApplications.id, id));
    return application || undefined;
  }

  async getApplicationWithRelations(id: string): Promise<any> {
    const [application] = await db.select().from(admissionApplications).where(eq(admissionApplications.id, id));
    if (!application) return undefined;

    const documents = await db.select().from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, id));
    
    const statusHistory = await db.select().from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.applicationId, id))
      .orderBy(desc(applicationStatusHistory.changedAt));

    return {
      ...application,
      documents,
      statusHistory,
    };
  }

  async getRecentApplications(limit: number = 10): Promise<AdmissionApplication[]> {
    return db.select().from(admissionApplications)
      .orderBy(desc(admissionApplications.createdAt))
      .limit(limit);
  }

  async createApplication(application: InsertAdmissionApplication): Promise<AdmissionApplication> {
    const applicationNumber = await this.generateApplicationNumber(application.admissionCycleId);
    const [created] = await db.insert(admissionApplications)
      .values({ ...application, applicationNumber })
      .returning();
    
    // Create initial status history entry
    await this.createStatusHistoryEntry({
      applicationId: created.id,
      toStatus: created.status,
      remarks: "Application submitted",
    });

    return created;
  }

  async updateApplication(id: string, application: Partial<InsertAdmissionApplication>): Promise<AdmissionApplication | undefined> {
    const [updated] = await db.update(admissionApplications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(admissionApplications.id, id))
      .returning();
    return updated || undefined;
  }

  async updateApplicationStatus(id: string, status: string, remarks?: string): Promise<AdmissionApplication | undefined> {
    const current = await this.getApplication(id);
    if (!current) return undefined;

    const [updated] = await db.update(admissionApplications)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(admissionApplications.id, id))
      .returning();

    if (updated) {
      await this.createStatusHistoryEntry({
        applicationId: id,
        fromStatus: current.status,
        toStatus: status as any,
        remarks,
      });
    }

    return updated || undefined;
  }

  async generateApplicationNumber(cycleId: string): Promise<string> {
    const cycle = await this.getAdmissionCycle(cycleId);
    const year = cycle?.academicYear?.split("-")[0] || new Date().getFullYear().toString();
    
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(eq(admissionApplications.admissionCycleId, cycleId));
    
    const count = Number(countResult[0]?.count || 0) + 1;
    return `APP-${year}-${count.toString().padStart(5, "0")}`;
  }

  // Documents
  async getApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
    return db.select().from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId));
  }

  async createApplicationDocument(document: InsertApplicationDocument): Promise<ApplicationDocument> {
    const [created] = await db.insert(applicationDocuments).values(document).returning();
    return created;
  }

  async updateDocumentVerification(id: string, status: "pending" | "verified" | "rejected", remarks?: string): Promise<ApplicationDocument | undefined> {
    const updateData: any = { 
      verificationStatus: status,
      verifiedAt: status === "verified" ? new Date() : null,
    };
    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }
    const [updated] = await db.update(applicationDocuments)
      .set(updateData)
      .where(eq(applicationDocuments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteApplicationDocument(id: string): Promise<boolean> {
    await db.delete(applicationDocuments).where(eq(applicationDocuments.id, id));
    return true;
  }

  // Status History
  async getApplicationStatusHistory(applicationId: string): Promise<ApplicationStatusHistory[]> {
    return db.select().from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.applicationId, applicationId))
      .orderBy(desc(applicationStatusHistory.changedAt));
  }

  async createStatusHistoryEntry(entry: InsertApplicationStatusHistory): Promise<ApplicationStatusHistory> {
    const [created] = await db.insert(applicationStatusHistory).values(entry).returning();
    return created;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{ totalApplications: number; pendingReviews: number; enrolled: number; enrollmentRate: number }> {
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(admissionApplications);
    const total = Number(totalResult[0]?.count || 0);

    const pendingResult = await db.select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(sql`${admissionApplications.status} IN ('application_submitted', 'documents_pending', 'under_review')`);
    const pending = Number(pendingResult[0]?.count || 0);

    const enrolledResult = await db.select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(eq(admissionApplications.status, "enrolled"));
    const enrolled = Number(enrolledResult[0]?.count || 0);

    const enrollmentRate = total > 0 ? Math.round((enrolled / total) * 100) : 0;

    return {
      totalApplications: total,
      pendingReviews: pending,
      enrolled,
      enrollmentRate,
    };
  }

  // Seat Availability
  async getSeatAvailability(cycleId: string): Promise<any[]> {
    const configs = await this.getSeatConfigs(cycleId);
    const availability = await Promise.all(configs.map(async (config) => {
      const enrolledResult = await db.select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(and(
          eq(admissionApplications.admissionCycleId, cycleId),
          eq(admissionApplications.gradeAppliedFor, config.gradeId),
          eq(admissionApplications.status, "enrolled")
        ));
      const enrolled = Number(enrolledResult[0]?.count || 0);

      const offeredResult = await db.select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(and(
          eq(admissionApplications.admissionCycleId, cycleId),
          eq(admissionApplications.gradeAppliedFor, config.gradeId),
          inArray(admissionApplications.status, ["offer_extended", "offer_accepted"])
        ));
      const offered = Number(offeredResult[0]?.count || 0);

      return {
        ...config,
        enrolled,
        offered,
        available: config.totalSeats - enrolled - offered,
      };
    }));
    return availability;
  }

  // Scheduling
  async scheduleEntranceTest(applicationId: string, date: string): Promise<AdmissionApplication | undefined> {
    const [updated] = await db.update(admissionApplications)
      .set({ 
        entranceTestDate: date, 
        status: "entrance_test_scheduled" as any,
        updatedAt: new Date() 
      })
      .where(eq(admissionApplications.id, applicationId))
      .returning();
    
    if (updated) {
      await this.createStatusHistoryEntry({
        applicationId,
        fromStatus: "documents_verified",
        toStatus: "entrance_test_scheduled",
        remarks: `Entrance test scheduled for ${date}`,
      });
    }
    return updated || undefined;
  }

  async scheduleInterview(applicationId: string, date: string): Promise<AdmissionApplication | undefined> {
    const [updated] = await db.update(admissionApplications)
      .set({ 
        interviewDate: date, 
        status: "interview_scheduled" as any,
        updatedAt: new Date() 
      })
      .where(eq(admissionApplications.id, applicationId))
      .returning();
    
    if (updated) {
      await this.createStatusHistoryEntry({
        applicationId,
        fromStatus: "entrance_test_completed",
        toStatus: "interview_scheduled",
        remarks: `Interview scheduled for ${date}`,
      });
    }
    return updated || undefined;
  }

  // Enrollment Workflow
  async generateOffer(applicationId: string, remarks?: string): Promise<AdmissionApplication | undefined> {
    const current = await this.getApplication(applicationId);
    if (!current) return undefined;

    const [updated] = await db.update(admissionApplications)
      .set({ 
        status: "offer_extended" as any,
        decisionDate: new Date(),
        decisionRemarks: remarks,
        updatedAt: new Date() 
      })
      .where(eq(admissionApplications.id, applicationId))
      .returning();
    
    if (updated) {
      await this.createStatusHistoryEntry({
        applicationId,
        fromStatus: current.status,
        toStatus: "offer_extended",
        remarks: remarks || "Admission offer extended",
      });
    }
    return updated || undefined;
  }

  async acceptOffer(applicationId: string): Promise<AdmissionApplication | undefined> {
    const [updated] = await db.update(admissionApplications)
      .set({ 
        status: "offer_accepted" as any,
        updatedAt: new Date() 
      })
      .where(eq(admissionApplications.id, applicationId))
      .returning();
    
    if (updated) {
      await this.createStatusHistoryEntry({
        applicationId,
        fromStatus: "offer_extended",
        toStatus: "offer_accepted",
        remarks: "Admission offer accepted",
      });
    }
    return updated || undefined;
  }

  async completeEnrollment(applicationId: string): Promise<AdmissionApplication | undefined> {
    const [updated] = await db.update(admissionApplications)
      .set({ 
        status: "enrolled" as any,
        updatedAt: new Date() 
      })
      .where(eq(admissionApplications.id, applicationId))
      .returning();
    
    if (updated) {
      await this.createStatusHistoryEntry({
        applicationId,
        fromStatus: "offer_accepted",
        toStatus: "enrolled",
        remarks: "Enrollment completed",
      });
    }
    return updated || undefined;
  }

  // Reports
  async getApplicationSummary(): Promise<any> {
    const statusCounts = await db.select({
      status: admissionApplications.status,
      count: sql<number>`count(*)`,
    })
      .from(admissionApplications)
      .groupBy(admissionApplications.status);

    const gradeCounts = await db.select({
      grade: admissionApplications.gradeAppliedFor,
      count: sql<number>`count(*)`,
    })
      .from(admissionApplications)
      .groupBy(admissionApplications.gradeAppliedFor);

    return {
      byStatus: statusCounts.map(s => ({ status: s.status, count: Number(s.count) })),
      byGrade: gradeCounts.map(g => ({ grade: g.grade, count: Number(g.count) })),
    };
  }

  async getEnrollmentReport(): Promise<any> {
    // Get active admission cycle to scope the report
    const activeCycle = await this.getActiveAdmissionCycle();
    
    // Build enrolled query - filtered by active cycle if available
    const enrolledQuery = activeCycle
      ? db.select()
          .from(admissionApplications)
          .where(and(
            eq(admissionApplications.status, "enrolled"),
            eq(admissionApplications.admissionCycleId, activeCycle.id)
          ))
          .orderBy(desc(admissionApplications.updatedAt))
      : db.select()
          .from(admissionApplications)
          .where(eq(admissionApplications.status, "enrolled"))
          .orderBy(desc(admissionApplications.updatedAt));
    
    const enrolled = await enrolledQuery;

    // Get enrolled count per grade (scoped to active cycle)
    const enrolledByGradeQuery = activeCycle
      ? db.select({
          grade: admissionApplications.gradeAppliedFor,
          count: sql<number>`count(*)`,
        })
          .from(admissionApplications)
          .where(and(
            eq(admissionApplications.status, "enrolled"),
            eq(admissionApplications.admissionCycleId, activeCycle.id)
          ))
          .groupBy(admissionApplications.gradeAppliedFor)
      : db.select({
          grade: admissionApplications.gradeAppliedFor,
          count: sql<number>`count(*)`,
        })
          .from(admissionApplications)
          .where(eq(admissionApplications.status, "enrolled"))
          .groupBy(admissionApplications.gradeAppliedFor);
    
    const enrolledByGrade = await enrolledByGradeQuery;

    // Get total applications per grade (scoped to active cycle)
    const totalByGradeQuery = activeCycle
      ? db.select({
          grade: admissionApplications.gradeAppliedFor,
          count: sql<number>`count(*)`,
        })
          .from(admissionApplications)
          .where(eq(admissionApplications.admissionCycleId, activeCycle.id))
          .groupBy(admissionApplications.gradeAppliedFor)
      : db.select({
          grade: admissionApplications.gradeAppliedFor,
          count: sql<number>`count(*)`,
        })
          .from(admissionApplications)
          .groupBy(admissionApplications.gradeAppliedFor);
    
    const totalByGrade = await totalByGradeQuery;

    // Merge enrolled and total counts per grade
    const byGrade = totalByGrade.map(g => ({
      grade: g.grade,
      enrolled: enrolledByGrade.find(e => e.grade === g.grade)?.count || 0,
      total: Number(g.count),
    }));

    return {
      totalEnrolled: enrolled.length,
      enrolledStudents: enrolled,
      byGrade: byGrade.map(g => ({ grade: g.grade, enrolled: Number(g.enrolled), total: g.total })),
    };
  }

  async getDocumentVerificationReport(): Promise<any> {
    const pending = await db.select({ count: sql<number>`count(*)` })
      .from(applicationDocuments)
      .where(eq(applicationDocuments.verificationStatus, "pending"));
    
    const verified = await db.select({ count: sql<number>`count(*)` })
      .from(applicationDocuments)
      .where(eq(applicationDocuments.verificationStatus, "verified"));
    
    const rejected = await db.select({ count: sql<number>`count(*)` })
      .from(applicationDocuments)
      .where(eq(applicationDocuments.verificationStatus, "rejected"));

    const pendingCount = Number(pending[0]?.count || 0);
    const verifiedCount = Number(verified[0]?.count || 0);
    const rejectedCount = Number(rejected[0]?.count || 0);

    return {
      totalDocuments: pendingCount + verifiedCount + rejectedCount,
      pending: pendingCount,
      verified: verifiedCount,
      rejected: rejectedCount,
    };
  }

  // Communications
  async getApplicationCommunications(applicationId: string): Promise<ApplicationCommunication[]> {
    return db.select().from(applicationCommunications)
      .where(eq(applicationCommunications.applicationId, applicationId))
      .orderBy(desc(applicationCommunications.createdAt));
  }

  async createCommunication(communication: InsertApplicationCommunication): Promise<ApplicationCommunication> {
    const [created] = await db.insert(applicationCommunications).values(communication).returning();
    return created;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return db.select().from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async getUnreadNotificationsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.isRead, "false"));
    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: "true" })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsRead(): Promise<void> {
    await db.update(notifications).set({ isRead: "true" }).where(eq(notifications.isRead, "false"));
  }

  // Analytics
  async getApplicationsByStatus(): Promise<{ status: string; count: number }[]> {
    const results = await db.select({
      status: admissionApplications.status,
      count: sql<number>`count(*)`,
    })
      .from(admissionApplications)
      .groupBy(admissionApplications.status);
    return results.map(r => ({ status: r.status, count: Number(r.count) }));
  }

  async getApplicationTrends(): Promise<{ date: string; count: number }[]> {
    const results = await db.select({
      date: sql<string>`DATE(${admissionApplications.applicationDate})`,
      count: sql<number>`count(*)`,
    })
      .from(admissionApplications)
      .groupBy(sql`DATE(${admissionApplications.applicationDate})`)
      .orderBy(sql`DATE(${admissionApplications.applicationDate})`);
    return results.map(r => ({ date: r.date, count: Number(r.count) }));
  }

  async getScheduledEvents(): Promise<any[]> {
    const testsScheduled = await db.select()
      .from(admissionApplications)
      .where(and(
        eq(admissionApplications.status, "entrance_test_scheduled"),
        sql`${admissionApplications.entranceTestDate} IS NOT NULL`
      ));
    
    const interviewsScheduled = await db.select()
      .from(admissionApplications)
      .where(and(
        eq(admissionApplications.status, "interview_scheduled"),
        sql`${admissionApplications.interviewDate} IS NOT NULL`
      ));

    const events = [
      ...testsScheduled.map(app => ({
        id: app.id,
        type: "entrance_test",
        date: app.entranceTestDate,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        applicationNumber: app.applicationNumber,
        grade: app.gradeAppliedFor,
      })),
      ...interviewsScheduled.map(app => ({
        id: app.id,
        type: "interview",
        date: app.interviewDate,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        applicationNumber: app.applicationNumber,
        grade: app.gradeAppliedFor,
      })),
    ];
    return events.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  }

  // Entrance Test Results Report
  async getEntranceTestResultsReport(): Promise<any> {
    const testResults = await db.select()
      .from(admissionApplications)
      .where(sql`${admissionApplications.entranceTestScore} IS NOT NULL`)
      .orderBy(desc(admissionApplications.entranceTestDate));

    const byGrade = await db.select({
      grade: admissionApplications.gradeAppliedFor,
      avgScore: sql<number>`ROUND(AVG(CAST(${admissionApplications.entranceTestScore} AS numeric)), 1)`,
      minScore: sql<number>`MIN(CAST(${admissionApplications.entranceTestScore} AS numeric))`,
      maxScore: sql<number>`MAX(CAST(${admissionApplications.entranceTestScore} AS numeric))`,
      count: sql<number>`count(*)`,
    })
      .from(admissionApplications)
      .where(sql`${admissionApplications.entranceTestScore} IS NOT NULL`)
      .groupBy(admissionApplications.gradeAppliedFor);

    const passCount = await db.select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(sql`CAST(${admissionApplications.entranceTestScore} AS numeric) >= 40`);

    const failCount = await db.select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(sql`CAST(${admissionApplications.entranceTestScore} AS numeric) < 40 AND ${admissionApplications.entranceTestScore} IS NOT NULL`);

    return {
      totalTests: testResults.length,
      passed: Number(passCount[0]?.count || 0),
      failed: Number(failCount[0]?.count || 0),
      passRate: testResults.length > 0 
        ? Math.round((Number(passCount[0]?.count || 0) / testResults.length) * 100) 
        : 0,
      byGrade: byGrade.map(g => ({
        grade: g.grade,
        avgScore: Number(g.avgScore) || 0,
        minScore: Number(g.minScore) || 0,
        maxScore: Number(g.maxScore) || 0,
        count: Number(g.count),
      })),
      recentResults: testResults.slice(0, 10).map(app => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        grade: app.gradeAppliedFor,
        score: Number(app.entranceTestScore),
        date: app.entranceTestDate,
        passed: Number(app.entranceTestScore) >= 40,
      })),
    };
  }

  // Rejection Analysis Report
  async getRejectionAnalysisReport(): Promise<any> {
    const rejected = await db.select()
      .from(admissionApplications)
      .where(eq(admissionApplications.status, "rejected"))
      .orderBy(desc(admissionApplications.decisionDate));

    const byGrade = await db.select({
      grade: admissionApplications.gradeAppliedFor,
      count: sql<number>`count(*)`,
    })
      .from(admissionApplications)
      .where(eq(admissionApplications.status, "rejected"))
      .groupBy(admissionApplications.gradeAppliedFor);

    const rejectionHistory = await db.select({
      applicationId: applicationStatusHistory.applicationId,
      remarks: applicationStatusHistory.remarks,
      changedAt: applicationStatusHistory.changedAt,
    })
      .from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.toStatus, "rejected"))
      .orderBy(desc(applicationStatusHistory.changedAt));

    const reasonCounts: Record<string, number> = {};
    rejectionHistory.forEach(h => {
      const reason = h.remarks || "No reason specified";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const byReason = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const totalApplications = await db.select({ count: sql<number>`count(*)` }).from(admissionApplications);
    const rejectionRate = Number(totalApplications[0]?.count || 0) > 0 
      ? Math.round((rejected.length / Number(totalApplications[0]?.count)) * 100)
      : 0;

    return {
      totalRejected: rejected.length,
      rejectionRate,
      byGrade: byGrade.map(g => ({ grade: g.grade, count: Number(g.count) })),
      byReason: byReason.slice(0, 10),
      recentRejections: rejected.slice(0, 10).map(app => ({
        id: app.id,
        applicationNumber: app.applicationNumber,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        grade: app.gradeAppliedFor,
        decisionDate: app.decisionDate,
        remarks: app.decisionRemarks || "No reason specified",
      })),
    };
  }

  // Generate Offer Letter Data
  async generateOfferLetterData(applicationId: string): Promise<any> {
    const application = await this.getApplication(applicationId);
    if (!application) return undefined;

    const cycle = await this.getAdmissionCycle(application.admissionCycleId);
    
    const gradeLabel = application.gradeAppliedFor
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace("grade", "Grade ")
      .replace("lkg", "LKG")
      .replace("ukg", "UKG")
      .replace("nursery", "Nursery");

    const offerDate = application.decisionDate 
      ? new Date(application.decisionDate).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    return {
      applicationNumber: application.applicationNumber,
      studentName: `${application.studentFirstName} ${application.studentLastName}`,
      fatherName: application.fatherName,
      motherName: application.motherName,
      dateOfBirth: application.dateOfBirth,
      grade: gradeLabel,
      academicYear: cycle?.academicYear || "2024-2025",
      cycleName: cycle?.cycleName || "Admission Cycle",
      offerDate,
      status: application.status,
      address: application.currentAddress,
      fatherContact: application.fatherContact,
      fatherEmail: application.fatherEmail,
    };
  }
}

export const storage = new DatabaseStorage();
