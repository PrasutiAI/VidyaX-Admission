import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
  insertAdmissionCycleSchema,
  insertGradeSeatConfigSchema,
  insertAdmissionApplicationSchema,
  insertApplicationDocumentSchema,
} from "@shared/schema";

function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: fromError(result.error).toString() };
  }
  return { success: true, data: result.data };
}

const cycleStatusSchema = z.object({
  status: z.enum(["draft", "open", "closed", "archived"]),
});

const applicationStatusSchema = z.object({
  status: z.enum([
    "inquiry", "application_submitted", "documents_pending", "documents_verified",
    "entrance_test_scheduled", "entrance_test_completed", "interview_scheduled",
    "interview_completed", "under_review", "waitlisted", "offer_extended",
    "offer_accepted", "enrolled", "rejected", "withdrawn"
  ]),
  remarks: z.string().optional(),
});

const entranceTestSchema = z.object({
  date: z.string(),
  score: z.string(),
});

const interviewResultSchema = z.object({
  date: z.string(),
  score: z.string(),
  notes: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admission Cycles
  app.get("/api/admission/cycles", async (req, res) => {
    try {
      const cycles = await storage.getAdmissionCycles();
      res.json(cycles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admission/cycles/active", async (req, res) => {
    try {
      const cycle = await storage.getActiveAdmissionCycle();
      if (!cycle) {
        return res.status(404).json({ message: "No active cycle found" });
      }
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admission/cycles/:id", async (req, res) => {
    try {
      const cycle = await storage.getAdmissionCycle(req.params.id);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admission/cycles", async (req, res) => {
    try {
      const validation = validateBody(insertAdmissionCycleSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const cycle = await storage.createAdmissionCycle(validation.data);
      res.status(201).json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admission/cycles/:id", async (req, res) => {
    try {
      const validation = validateBody(insertAdmissionCycleSchema.partial(), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const cycle = await storage.updateAdmissionCycle(req.params.id, validation.data);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admission/cycles/:id/status", async (req, res) => {
    try {
      const validation = validateBody(cycleStatusSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const cycle = await storage.updateAdmissionCycleStatus(req.params.id, validation.data.status);
      if (!cycle) {
        return res.status(404).json({ message: "Cycle not found" });
      }
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admission/cycles/:id", async (req, res) => {
    try {
      await storage.deleteAdmissionCycle(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seat Configurations
  app.get("/api/admission/cycles/:id/seats", async (req, res) => {
    try {
      const configs = await storage.getSeatConfigs(req.params.id);
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admission/cycles/:id/seats", async (req, res) => {
    try {
      const bodyWithCycleId = { ...req.body, admissionCycleId: req.params.id };
      const validation = validateBody(insertGradeSeatConfigSchema, bodyWithCycleId);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const config = await storage.createSeatConfig(validation.data);
      res.status(201).json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admission/cycles/:cycleId/seats/:gradeId", async (req, res) => {
    try {
      const validation = validateBody(insertGradeSeatConfigSchema.partial(), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const config = await storage.updateSeatConfig(req.params.cycleId, req.params.gradeId, validation.data);
      if (!config) {
        return res.status(404).json({ message: "Seat config not found" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Applications
  app.get("/api/admission/applications", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      res.json(applications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admission/applications/recent", async (req, res) => {
    try {
      const applications = await storage.getRecentApplications(10);
      res.json(applications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admission/applications/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admission/applications", async (req, res) => {
    try {
      const validation = validateBody(insertAdmissionApplicationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.createApplication(validation.data);
      res.status(201).json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admission/applications/:id", async (req, res) => {
    try {
      const validation = validateBody(insertAdmissionApplicationSchema.partial(), req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.updateApplication(req.params.id, validation.data);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admission/applications/:id/status", async (req, res) => {
    try {
      const validation = validateBody(applicationStatusSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.updateApplicationStatus(
        req.params.id, 
        validation.data.status, 
        validation.data.remarks
      );
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admission/applications/:id/status-history", async (req, res) => {
    try {
      const history = await storage.getApplicationStatusHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Screening - Entrance Test
  app.put("/api/admission/applications/:id/entrance-test/score", async (req, res) => {
    try {
      const validation = validateBody(entranceTestSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.updateApplication(req.params.id, {
        entranceTestDate: validation.data.date,
        entranceTestScore: validation.data.score,
      });
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Screening - Interview
  app.put("/api/admission/applications/:id/interview/result", async (req, res) => {
    try {
      const validation = validateBody(interviewResultSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.updateApplication(req.params.id, {
        interviewDate: validation.data.date,
        interviewScore: validation.data.score,
        interviewNotes: validation.data.notes,
      });
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Documents
  app.get("/api/admission/applications/:id/documents", async (req, res) => {
    try {
      const documents = await storage.getApplicationDocuments(req.params.id);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admission/applications/:id/documents", async (req, res) => {
    try {
      const bodyWithAppId = { ...req.body, applicationId: req.params.id };
      const validation = validateBody(insertApplicationDocumentSchema, bodyWithAppId);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const document = await storage.createApplicationDocument(validation.data);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admission/applications/:appId/documents/:docId", async (req, res) => {
    try {
      await storage.deleteApplicationDocument(req.params.docId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Document Verification
  const documentVerificationSchema = z.object({
    status: z.enum(["pending", "verified", "rejected"]),
    remarks: z.string().optional(),
  });

  app.patch("/api/admission/applications/:appId/documents/:docId/verify", async (req, res) => {
    try {
      const validation = validateBody(documentVerificationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const document = await storage.updateDocumentVerification(
        req.params.docId, 
        validation.data.status,
        validation.data.remarks
      );
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seat Availability
  app.get("/api/admission/cycles/:id/seats/availability", async (req, res) => {
    try {
      const availability = await storage.getSeatAvailability(req.params.id);
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Schedule Entrance Test
  const scheduleTestSchema = z.object({
    date: z.string(),
  });

  app.post("/api/admission/applications/:id/entrance-test", async (req, res) => {
    try {
      const validation = validateBody(scheduleTestSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.scheduleEntranceTest(req.params.id, validation.data.date);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Schedule Interview
  const scheduleInterviewSchema = z.object({
    date: z.string(),
  });

  app.post("/api/admission/applications/:id/interview", async (req, res) => {
    try {
      const validation = validateBody(scheduleInterviewSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.scheduleInterview(req.params.id, validation.data.date);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enrollment Workflow - Generate Offer
  const generateOfferSchema = z.object({
    remarks: z.string().optional(),
  });

  app.post("/api/admission/applications/:id/offer", async (req, res) => {
    try {
      const validation = validateBody(generateOfferSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const application = await storage.generateOffer(req.params.id, validation.data.remarks);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enrollment Workflow - Accept Offer
  app.post("/api/admission/applications/:id/accept-offer", async (req, res) => {
    try {
      const application = await storage.acceptOffer(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Enrollment Workflow - Complete Enrollment
  app.post("/api/admission/applications/:id/enroll", async (req, res) => {
    try {
      const application = await storage.completeEnrollment(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reports - Application Summary
  app.get("/api/reports/application-summary", async (req, res) => {
    try {
      const summary = await storage.getApplicationSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reports - Enrollment Report
  app.get("/api/reports/enrollment", async (req, res) => {
    try {
      const report = await storage.getEnrollmentReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reports - Document Verification Report
  app.get("/api/reports/document-verification", async (req, res) => {
    try {
      const report = await storage.getDocumentVerificationReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationsCount();
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notification = await storage.markNotificationRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/notifications/mark-all-read", async (req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Communications/Notes
  const createCommunicationSchema = z.object({
    type: z.enum(["call", "email", "meeting", "sms", "note"]),
    subject: z.string().optional(),
    content: z.string(),
    contactPerson: z.string().optional(),
    createdBy: z.string().optional(),
  });

  app.get("/api/admission/applications/:id/communications", async (req, res) => {
    try {
      const communications = await storage.getApplicationCommunications(req.params.id);
      res.json(communications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admission/applications/:id/communications", async (req, res) => {
    try {
      const validation = validateBody(createCommunicationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const communication = await storage.createCommunication({
        ...validation.data,
        applicationId: req.params.id,
      });
      res.status(201).json(communication);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Analytics
  app.get("/api/analytics/applications-by-status", async (req, res) => {
    try {
      const data = await storage.getApplicationsByStatus();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/application-trends", async (req, res) => {
    try {
      const data = await storage.getApplicationTrends();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/scheduled-events", async (req, res) => {
    try {
      const events = await storage.getScheduledEvents();
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
