import { 
  users, type User, type InsertUser,
  admissionCycles, type AdmissionCycle, type InsertAdmissionCycle,
  gradeSeatConfigs, type GradeSeatConfig, type InsertGradeSeatConfig,
  admissionApplications, type AdmissionApplication, type InsertAdmissionApplication,
  applicationDocuments, type ApplicationDocument, type InsertApplicationDocument,
  applicationStatusHistory, type ApplicationStatusHistory, type InsertApplicationStatusHistory,
  seatReservations, type SeatReservation, type InsertSeatReservation,
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

    const pendingStatuses = ["application_submitted", "documents_pending", "under_review"] as const;
    const pendingResult = await db.select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(inArray(admissionApplications.status, pendingStatuses));
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
}

export const storage = new DatabaseStorage();
