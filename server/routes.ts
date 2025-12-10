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
      
      const oldApp = await storage.getApplication(req.params.id);
      
      const application = await storage.updateApplicationStatus(
        req.params.id, 
        validation.data.status, 
        validation.data.remarks
      );
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const statusMessages: Record<string, { title: string; message: string }> = {
        documents_verified: { 
          title: "Documents Verified", 
          message: `Documents for ${application.studentFirstName} ${application.studentLastName} have been verified.` 
        },
        entrance_test_scheduled: { 
          title: "Entrance Test Scheduled", 
          message: `Entrance test scheduled for ${application.studentFirstName} ${application.studentLastName}.` 
        },
        entrance_test_completed: { 
          title: "Entrance Test Completed", 
          message: `${application.studentFirstName} ${application.studentLastName} has completed the entrance test.` 
        },
        interview_scheduled: { 
          title: "Interview Scheduled", 
          message: `Interview scheduled for ${application.studentFirstName} ${application.studentLastName}.` 
        },
        interview_completed: { 
          title: "Interview Completed", 
          message: `Interview completed for ${application.studentFirstName} ${application.studentLastName}.` 
        },
        offer_extended: { 
          title: "Offer Extended", 
          message: `Admission offer extended to ${application.studentFirstName} ${application.studentLastName}.` 
        },
        offer_accepted: { 
          title: "Offer Accepted", 
          message: `${application.studentFirstName} ${application.studentLastName} has accepted the admission offer.` 
        },
        enrolled: { 
          title: "Student Enrolled", 
          message: `${application.studentFirstName} ${application.studentLastName} has been successfully enrolled.` 
        },
        rejected: { 
          title: "Application Rejected", 
          message: `Application for ${application.studentFirstName} ${application.studentLastName} has been rejected.` 
        },
        waitlisted: { 
          title: "Application Waitlisted", 
          message: `${application.studentFirstName} ${application.studentLastName} has been added to the waitlist.` 
        },
        withdrawn: { 
          title: "Application Withdrawn", 
          message: `Application for ${application.studentFirstName} ${application.studentLastName} has been withdrawn.` 
        },
      };
      
      const notifInfo = statusMessages[validation.data.status];
      if (notifInfo) {
        await storage.createNotification({
          title: notifInfo.title,
          message: notifInfo.message,
          type: validation.data.status === "rejected" || validation.data.status === "withdrawn" ? "warning" : 
                validation.data.status === "enrolled" || validation.data.status === "offer_accepted" ? "success" : "info",
          relatedEntityType: "application",
          relatedEntityId: application.id,
          isRead: "false",
        });
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

  // Reports - Entrance Test Results Report
  app.get("/api/reports/entrance-test-results", async (req, res) => {
    try {
      const report = await storage.getEntranceTestResultsReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reports - Rejection Analysis Report
  app.get("/api/reports/rejection-analysis", async (req, res) => {
    try {
      const report = await storage.getRejectionAnalysisReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Offer Letter Download
  app.get("/api/admission/applications/:id/offer-letter", async (req, res) => {
    try {
      const offerData = await storage.generateOfferLetterData(req.params.id);
      if (!offerData) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (!["offer_extended", "offer_accepted", "enrolled"].includes(offerData.status)) {
        return res.status(400).json({ message: "Offer letter is only available for applications with extended, accepted, or enrolled status" });
      }
      res.json(offerData);
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

  // AI-First Features

  // AI Recommendations for Application Processing
  app.get("/api/ai/recommendations/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const recommendations = generateAIRecommendations(application);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Eligibility Score
  app.get("/api/ai/eligibility-score/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const eligibilityScore = calculateEligibilityScore(application);
      res.json(eligibilityScore);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Document Suggestions
  app.get("/api/ai/document-suggestions/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const suggestions = generateDocumentSuggestions(application);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Waitlist Prioritization
  app.get("/api/ai/waitlist-priority", async (req, res) => {
    try {
      const waitlistedApps = await storage.getWaitlistedApplications();
      const prioritizedList = calculateWaitlistPriority(waitlistedApps);
      res.json(prioritizedList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Auto-Suggest Next Steps
  app.get("/api/ai/next-steps/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const nextSteps = generateNextSteps(application);
      res.json(nextSteps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Predictive Outcome Score
  app.get("/api/ai/predictive-score/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const prediction = calculatePredictiveOutcome(application);
      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Dashboard Insights
  app.get("/api/ai/dashboard-insights", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const stats = await storage.getDashboardStats();
      const insights = generateDashboardInsights(applications, stats);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Bulk Recommendations
  app.get("/api/ai/bulk-recommendations", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const recommendations = generateBulkRecommendations(applications);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

// AI Helper Functions

interface AIRecommendation {
  type: "action" | "warning" | "info";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestedAction?: string;
}

function generateAIRecommendations(application: any): { recommendations: AIRecommendation[], summary: string } {
  const recommendations: AIRecommendation[] = [];
  
  const status = application.status;
  const documents = application.documents || [];
  const hasEntranceTest = !!application.entranceTestScore;
  const hasInterview = !!application.interviewScore;
  
  // Check for pending documents
  const pendingDocs = documents.filter((d: any) => d.verificationStatus === "pending");
  if (pendingDocs.length > 0) {
    recommendations.push({
      type: "action",
      priority: "high",
      title: "Documents Pending Verification",
      description: `${pendingDocs.length} document(s) need verification before proceeding.`,
      suggestedAction: "Review and verify pending documents"
    });
  }

  // Check for rejected documents
  const rejectedDocs = documents.filter((d: any) => d.verificationStatus === "rejected");
  if (rejectedDocs.length > 0) {
    recommendations.push({
      type: "warning",
      priority: "high",
      title: "Rejected Documents Need Attention",
      description: `${rejectedDocs.length} document(s) were rejected. Request resubmission from the applicant.`,
      suggestedAction: "Contact parent/guardian for document resubmission"
    });
  }

  // Status-specific recommendations
  if (status === "documents_verified" && !hasEntranceTest) {
    recommendations.push({
      type: "action",
      priority: "medium",
      title: "Schedule Entrance Test",
      description: "Documents are verified. The application is ready for entrance test scheduling.",
      suggestedAction: "Schedule entrance test for the student"
    });
  }

  if (status === "entrance_test_completed" && !hasInterview) {
    const score = parseFloat(application.entranceTestScore || "0");
    if (score >= 40) {
      recommendations.push({
        type: "action",
        priority: "medium",
        title: "Schedule Interview",
        description: `Student scored ${score}% in entrance test. Ready for interview scheduling.`,
        suggestedAction: "Schedule interview with student and parents"
      });
    } else {
      recommendations.push({
        type: "warning",
        priority: "high",
        title: "Low Entrance Test Score",
        description: `Student scored ${score}% which is below the passing threshold (40%). Consider waitlisting or rejection.`,
        suggestedAction: "Review application for waitlist or rejection"
      });
    }
  }

  if (status === "interview_completed") {
    const testScore = parseFloat(application.entranceTestScore || "0");
    const interviewScore = parseFloat(application.interviewScore || "0");
    const avgScore = (testScore + interviewScore) / 2;
    
    if (avgScore >= 60) {
      recommendations.push({
        type: "action",
        priority: "high",
        title: "Strong Candidate - Extend Offer",
        description: `Combined score of ${avgScore.toFixed(1)}% suggests this is a strong candidate.`,
        suggestedAction: "Consider extending admission offer"
      });
    } else if (avgScore >= 40) {
      recommendations.push({
        type: "info",
        priority: "medium",
        title: "Average Performance",
        description: `Combined score of ${avgScore.toFixed(1)}%. Consider seat availability before deciding.`,
        suggestedAction: "Review against other applications"
      });
    }
  }

  if (status === "offer_extended") {
    recommendations.push({
      type: "info",
      priority: "medium",
      title: "Awaiting Offer Acceptance",
      description: "Offer has been extended. Follow up if no response within 7 days.",
      suggestedAction: "Send reminder if needed"
    });
  }

  if (status === "offer_accepted") {
    recommendations.push({
      type: "action",
      priority: "high",
      title: "Complete Enrollment",
      description: "Offer has been accepted. Complete the enrollment process.",
      suggestedAction: "Process enrollment and collect admission fee"
    });
  }

  // Check application age
  const appDate = new Date(application.applicationDate);
  const daysSinceApplication = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceApplication > 30 && !["enrolled", "rejected", "withdrawn"].includes(status)) {
    recommendations.push({
      type: "warning",
      priority: "medium",
      title: "Application Aging",
      description: `This application is ${daysSinceApplication} days old. Consider expediting processing.`,
      suggestedAction: "Prioritize this application"
    });
  }

  // Generate summary
  const highPriorityCount = recommendations.filter(r => r.priority === "high").length;
  const actionCount = recommendations.filter(r => r.type === "action").length;
  
  let summary = "No immediate actions required.";
  if (highPriorityCount > 0) {
    summary = `${highPriorityCount} high-priority item(s) need attention.`;
  } else if (actionCount > 0) {
    summary = `${actionCount} action(s) recommended for this application.`;
  }

  return { recommendations, summary };
}

interface EligibilityScore {
  overallScore: number;
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    notes: string;
  }[];
  recommendation: string;
  confidence: "high" | "medium" | "low";
}

function calculateEligibilityScore(application: any): EligibilityScore {
  const breakdown: { category: string; score: number; maxScore: number; notes: string }[] = [];
  
  // Document completeness (25 points)
  const documents = application.documents || [];
  const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
  const requiredDocs = 5;
  const docScore = Math.min(25, (verifiedDocs / requiredDocs) * 25);
  breakdown.push({
    category: "Document Completeness",
    score: Math.round(docScore),
    maxScore: 25,
    notes: `${verifiedDocs}/${requiredDocs} required documents verified`
  });

  // Academic performance (25 points)
  let academicScore = 15; // Base score
  if (application.previousMarks) {
    const marks = parseFloat(application.previousMarks);
    if (marks >= 80) academicScore = 25;
    else if (marks >= 60) academicScore = 20;
    else if (marks >= 40) academicScore = 15;
    else academicScore = 10;
  }
  breakdown.push({
    category: "Academic Background",
    score: academicScore,
    maxScore: 25,
    notes: application.previousMarks ? `Previous marks: ${application.previousMarks}%` : "Previous academic records not provided"
  });

  // Entrance test (25 points)
  let testScore = 0;
  if (application.entranceTestScore) {
    const score = parseFloat(application.entranceTestScore);
    testScore = Math.round((score / 100) * 25);
  }
  breakdown.push({
    category: "Entrance Test",
    score: testScore,
    maxScore: 25,
    notes: application.entranceTestScore ? `Score: ${application.entranceTestScore}%` : "Not yet completed"
  });

  // Interview (25 points)
  let interviewScore = 0;
  if (application.interviewScore) {
    const score = parseFloat(application.interviewScore);
    interviewScore = Math.round((score / 100) * 25);
  }
  breakdown.push({
    category: "Interview",
    score: interviewScore,
    maxScore: 25,
    notes: application.interviewScore ? `Score: ${application.interviewScore}%` : "Not yet completed"
  });

  const overallScore = breakdown.reduce((sum, b) => sum + b.score, 0);
  
  // Determine recommendation
  let recommendation = "";
  let confidence: "high" | "medium" | "low" = "medium";
  
  if (overallScore >= 75) {
    recommendation = "Strongly recommend admission. Excellent candidate.";
    confidence = "high";
  } else if (overallScore >= 60) {
    recommendation = "Recommend admission. Good candidate with solid profile.";
    confidence = "high";
  } else if (overallScore >= 45) {
    recommendation = "Consider for admission. Average profile, check seat availability.";
    confidence = "medium";
  } else if (overallScore >= 30) {
    recommendation = "May consider for waitlist. Additional evaluation recommended.";
    confidence = "medium";
  } else {
    recommendation = "Does not meet minimum requirements. Consider rejection.";
    confidence = "low";
  }

  return { overallScore, breakdown, recommendation, confidence };
}

interface DocumentSuggestion {
  documentType: string;
  status: "missing" | "pending" | "verified" | "rejected";
  suggestion: string;
  priority: "required" | "recommended" | "optional";
}

function generateDocumentSuggestions(application: any): { suggestions: DocumentSuggestion[], completeness: number } {
  const documents = application.documents || [];
  const docMap = new Map(documents.map((d: any) => [d.documentType, d]));
  
  const requiredDocs = [
    { type: "birth_certificate", label: "Birth Certificate", priority: "required" as const },
    { type: "passport_photo", label: "Passport Photo", priority: "required" as const },
    { type: "address_proof", label: "Address Proof", priority: "required" as const },
  ];

  const optionalDocs = [
    { type: "transfer_certificate", label: "Transfer Certificate", priority: "recommended" as const },
    { type: "previous_report_card", label: "Previous Report Card", priority: "recommended" as const },
    { type: "category_certificate", label: "Category Certificate", priority: "optional" as const },
    { type: "medical_certificate", label: "Medical Certificate", priority: "optional" as const },
  ];

  const allDocs = [...requiredDocs, ...optionalDocs];
  const suggestions: DocumentSuggestion[] = [];

  for (const docSpec of allDocs) {
    const doc = docMap.get(docSpec.type);
    
    if (!doc) {
      suggestions.push({
        documentType: docSpec.label,
        status: "missing",
        suggestion: docSpec.priority === "required" 
          ? "This document is required. Request from parent/guardian."
          : "Consider requesting this document for a complete application.",
        priority: docSpec.priority
      });
    } else if (doc.verificationStatus === "pending") {
      suggestions.push({
        documentType: docSpec.label,
        status: "pending",
        suggestion: "Review and verify this document.",
        priority: docSpec.priority
      });
    } else if (doc.verificationStatus === "rejected") {
      suggestions.push({
        documentType: docSpec.label,
        status: "rejected",
        suggestion: "Document was rejected. Request resubmission with corrections.",
        priority: docSpec.priority
      });
    } else {
      suggestions.push({
        documentType: docSpec.label,
        status: "verified",
        suggestion: "Document verified.",
        priority: docSpec.priority
      });
    }
  }

  const verifiedCount = suggestions.filter(s => s.status === "verified").length;
  const requiredCount = requiredDocs.length;
  const completeness = Math.round((verifiedCount / allDocs.length) * 100);

  return { suggestions, completeness };
}

interface WaitlistEntry {
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  grade: string;
  priorityScore: number;
  waitlistedDate: string;
  factors: string[];
}

function calculateWaitlistPriority(applications: any[]): WaitlistEntry[] {
  return applications.map(app => {
    let priorityScore = 50; // Base score
    const factors: string[] = [];

    // Entrance test performance
    if (app.entranceTestScore) {
      const score = parseFloat(app.entranceTestScore);
      if (score >= 60) {
        priorityScore += 20;
        factors.push("Strong entrance test performance");
      } else if (score >= 45) {
        priorityScore += 10;
        factors.push("Above average entrance test");
      }
    }

    // Interview performance
    if (app.interviewScore) {
      const score = parseFloat(app.interviewScore);
      if (score >= 60) {
        priorityScore += 20;
        factors.push("Strong interview performance");
      } else if (score >= 45) {
        priorityScore += 10;
        factors.push("Good interview performance");
      }
    }

    // Previous academic record
    if (app.previousMarks) {
      const marks = parseFloat(app.previousMarks);
      if (marks >= 75) {
        priorityScore += 10;
        factors.push("Excellent previous academics");
      }
    }

    // Early application bonus
    const appDate = new Date(app.applicationDate);
    const daysSinceApplication = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceApplication > 60) {
      priorityScore += 5;
      factors.push("Early applicant");
    }

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber,
      studentName: `${app.studentFirstName} ${app.studentLastName}`,
      grade: app.gradeAppliedFor,
      priorityScore: Math.min(100, priorityScore),
      waitlistedDate: app.updatedAt?.toString() || app.applicationDate?.toString() || "",
      factors
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

// AI Next Steps Generator
interface NextStep {
  step: number;
  action: string;
  description: string;
  estimatedTime: string;
  priority: "immediate" | "soon" | "later";
  automated: boolean;
}

function generateNextSteps(application: any): { steps: NextStep[], currentPhase: string, progressPercent: number } {
  const status = application.status;
  const steps: NextStep[] = [];
  let currentPhase = "Application Review";
  let progressPercent = 0;

  const statusProgress: Record<string, number> = {
    inquiry: 5,
    application_submitted: 10,
    documents_pending: 20,
    documents_verified: 30,
    entrance_test_scheduled: 40,
    entrance_test_completed: 50,
    interview_scheduled: 60,
    interview_completed: 70,
    under_review: 80,
    waitlisted: 85,
    offer_extended: 90,
    offer_accepted: 95,
    enrolled: 100,
    rejected: 100,
    withdrawn: 100,
  };

  progressPercent = statusProgress[status] || 0;

  switch (status) {
    case "inquiry":
      currentPhase = "Initial Inquiry";
      steps.push({
        step: 1,
        action: "Complete Application Form",
        description: "Request parent/guardian to submit the full application with all required details.",
        estimatedTime: "1-2 days",
        priority: "immediate",
        automated: false
      });
      break;

    case "application_submitted":
      currentPhase = "Document Collection";
      steps.push({
        step: 1,
        action: "Review Application Details",
        description: "Verify all submitted information for completeness and accuracy.",
        estimatedTime: "15-30 minutes",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Request Documents",
        description: "Send list of required documents to parent/guardian.",
        estimatedTime: "1-3 days",
        priority: "soon",
        automated: true
      });
      break;

    case "documents_pending":
      currentPhase = "Document Verification";
      steps.push({
        step: 1,
        action: "Verify Uploaded Documents",
        description: "Review each document for authenticity and completeness.",
        estimatedTime: "1-2 hours",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Request Missing Documents",
        description: "Contact parent if any required documents are missing.",
        estimatedTime: "1-3 days",
        priority: "soon",
        automated: true
      });
      break;

    case "documents_verified":
      currentPhase = "Entrance Test Preparation";
      steps.push({
        step: 1,
        action: "Schedule Entrance Test",
        description: "Assign a test date based on grade and available slots.",
        estimatedTime: "Immediate",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Send Test Details",
        description: "Notify parent about test date, time, and syllabus.",
        estimatedTime: "Automatic",
        priority: "soon",
        automated: true
      });
      break;

    case "entrance_test_scheduled":
      currentPhase = "Awaiting Test";
      steps.push({
        step: 1,
        action: "Conduct Entrance Test",
        description: "Administer the test on the scheduled date.",
        estimatedTime: "On scheduled date",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Record Test Score",
        description: "Enter the test results after evaluation.",
        estimatedTime: "1-2 days after test",
        priority: "soon",
        automated: false
      });
      break;

    case "entrance_test_completed":
      currentPhase = "Interview Preparation";
      const testScore = parseFloat(application.entranceTestScore || "0");
      if (testScore >= 40) {
        steps.push({
          step: 1,
          action: "Schedule Interview",
          description: "Set up an interview with the student and parents.",
          estimatedTime: "Immediate",
          priority: "immediate",
          automated: false
        });
      } else {
        steps.push({
          step: 1,
          action: "Review Application",
          description: "Low test score. Consider waitlisting or rejection.",
          estimatedTime: "Immediate",
          priority: "immediate",
          automated: false
        });
      }
      break;

    case "interview_scheduled":
      currentPhase = "Awaiting Interview";
      steps.push({
        step: 1,
        action: "Conduct Interview",
        description: "Meet with student and parents on scheduled date.",
        estimatedTime: "On scheduled date",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Record Interview Results",
        description: "Enter interview score and notes.",
        estimatedTime: "Same day",
        priority: "soon",
        automated: false
      });
      break;

    case "interview_completed":
      currentPhase = "Final Review";
      steps.push({
        step: 1,
        action: "Make Admission Decision",
        description: "Review all scores and make final decision.",
        estimatedTime: "1-2 days",
        priority: "immediate",
        automated: false
      });
      break;

    case "under_review":
      currentPhase = "Decision Pending";
      steps.push({
        step: 1,
        action: "Complete Review",
        description: "Finalize admission decision based on all criteria.",
        estimatedTime: "1-3 days",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Extend Offer or Waitlist",
        description: "Based on seat availability and candidate quality.",
        estimatedTime: "After review",
        priority: "soon",
        automated: false
      });
      break;

    case "waitlisted":
      currentPhase = "Waitlist Management";
      steps.push({
        step: 1,
        action: "Monitor Seat Availability",
        description: "Track if seats become available from declined offers.",
        estimatedTime: "Ongoing",
        priority: "later",
        automated: true
      });
      steps.push({
        step: 2,
        action: "Notify When Available",
        description: "Contact applicant when seat becomes available.",
        estimatedTime: "When triggered",
        priority: "immediate",
        automated: true
      });
      break;

    case "offer_extended":
      currentPhase = "Awaiting Response";
      steps.push({
        step: 1,
        action: "Wait for Response",
        description: "Allow time for parent to accept or decline offer.",
        estimatedTime: "7 days deadline",
        priority: "soon",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Follow Up",
        description: "Send reminder if no response within 5 days.",
        estimatedTime: "After 5 days",
        priority: "later",
        automated: true
      });
      break;

    case "offer_accepted":
      currentPhase = "Enrollment";
      steps.push({
        step: 1,
        action: "Collect Admission Fee",
        description: "Process admission fee payment.",
        estimatedTime: "Immediate",
        priority: "immediate",
        automated: false
      });
      steps.push({
        step: 2,
        action: "Complete Enrollment",
        description: "Finalize enrollment and generate admission number.",
        estimatedTime: "After fee payment",
        priority: "immediate",
        automated: false
      });
      break;

    case "enrolled":
      currentPhase = "Completed";
      steps.push({
        step: 1,
        action: "Enrollment Complete",
        description: "Student successfully enrolled. Create student profile.",
        estimatedTime: "Completed",
        priority: "later",
        automated: true
      });
      break;

    case "rejected":
    case "withdrawn":
      currentPhase = "Closed";
      steps.push({
        step: 1,
        action: "Archive Application",
        description: "Application closed. No further action required.",
        estimatedTime: "Completed",
        priority: "later",
        automated: true
      });
      break;
  }

  return { steps, currentPhase, progressPercent };
}

// AI Predictive Outcome Calculator
interface PredictiveOutcome {
  enrollmentProbability: number;
  predictedOutcome: "likely_enroll" | "moderate_chance" | "unlikely" | "undetermined";
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    weight: number;
    description: string;
  }[];
  insights: string[];
}

function calculatePredictiveOutcome(application: any): PredictiveOutcome {
  const factors: PredictiveOutcome["factors"] = [];
  const insights: string[] = [];
  let probability = 50; // Base probability

  // Document Status Factor
  const documents = application.documents || [];
  const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
  const pendingDocs = documents.filter((d: any) => d.verificationStatus === "pending").length;
  const rejectedDocs = documents.filter((d: any) => d.verificationStatus === "rejected").length;

  if (verifiedDocs >= 3) {
    probability += 10;
    factors.push({
      factor: "Document Completion",
      impact: "positive",
      weight: 10,
      description: `${verifiedDocs} documents verified`
    });
  } else if (rejectedDocs > 0) {
    probability -= 15;
    factors.push({
      factor: "Document Issues",
      impact: "negative",
      weight: -15,
      description: `${rejectedDocs} document(s) rejected`
    });
  }

  // Entrance Test Performance
  if (application.entranceTestScore) {
    const score = parseFloat(application.entranceTestScore);
    if (score >= 70) {
      probability += 20;
      factors.push({
        factor: "Entrance Test",
        impact: "positive",
        weight: 20,
        description: `Excellent score: ${score}%`
      });
      insights.push("Strong entrance test performance increases admission likelihood");
    } else if (score >= 50) {
      probability += 10;
      factors.push({
        factor: "Entrance Test",
        impact: "positive",
        weight: 10,
        description: `Good score: ${score}%`
      });
    } else if (score < 40) {
      probability -= 20;
      factors.push({
        factor: "Entrance Test",
        impact: "negative",
        weight: -20,
        description: `Below threshold: ${score}%`
      });
      insights.push("Low entrance test score may result in rejection or waitlist");
    }
  }

  // Interview Performance
  if (application.interviewScore) {
    const score = parseFloat(application.interviewScore);
    if (score >= 70) {
      probability += 15;
      factors.push({
        factor: "Interview",
        impact: "positive",
        weight: 15,
        description: `Excellent interview: ${score}%`
      });
      insights.push("Strong interview performance is a positive indicator");
    } else if (score >= 50) {
      probability += 5;
      factors.push({
        factor: "Interview",
        impact: "positive",
        weight: 5,
        description: `Good interview: ${score}%`
      });
    } else if (score < 40) {
      probability -= 15;
      factors.push({
        factor: "Interview",
        impact: "negative",
        weight: -15,
        description: `Below expectations: ${score}%`
      });
    }
  }

  // Previous Academic Record
  if (application.previousMarks) {
    const marks = parseFloat(application.previousMarks);
    if (marks >= 80) {
      probability += 10;
      factors.push({
        factor: "Previous Academics",
        impact: "positive",
        weight: 10,
        description: `Outstanding: ${marks}%`
      });
    } else if (marks >= 60) {
      probability += 5;
      factors.push({
        factor: "Previous Academics",
        impact: "positive",
        weight: 5,
        description: `Good: ${marks}%`
      });
    }
  }

  // Application Timeline
  const appDate = new Date(application.applicationDate);
  const daysSince = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince > 45) {
    factors.push({
      factor: "Application Age",
      impact: "neutral",
      weight: 0,
      description: `${daysSince} days since submission`
    });
    insights.push("Long processing time may affect parent interest");
  }

  // Current Status Impact
  const statusProbability: Record<string, number> = {
    offer_accepted: 95,
    offer_extended: 75,
    interview_completed: 60,
    entrance_test_completed: 50,
    documents_verified: 45,
    documents_pending: 35,
    application_submitted: 30,
    waitlisted: 25,
    under_review: 55,
  };

  if (statusProbability[application.status] !== undefined) {
    probability = (probability + statusProbability[application.status]) / 2;
  }

  // Cap probability between 5 and 95
  probability = Math.min(95, Math.max(5, probability));

  // Determine predicted outcome
  let predictedOutcome: PredictiveOutcome["predictedOutcome"];
  if (["enrolled", "offer_accepted"].includes(application.status)) {
    predictedOutcome = "likely_enroll";
    probability = 95;
  } else if (["rejected", "withdrawn"].includes(application.status)) {
    predictedOutcome = "unlikely";
    probability = 5;
  } else if (probability >= 65) {
    predictedOutcome = "likely_enroll";
  } else if (probability >= 40) {
    predictedOutcome = "moderate_chance";
  } else if (probability >= 20) {
    predictedOutcome = "unlikely";
  } else {
    predictedOutcome = "undetermined";
  }

  return {
    enrollmentProbability: Math.round(probability),
    predictedOutcome,
    factors,
    insights
  };
}

// AI Dashboard Insights Generator
interface DashboardInsight {
  type: "alert" | "trend" | "recommendation" | "success";
  title: string;
  description: string;
  metric?: string;
  action?: string;
}

function generateDashboardInsights(applications: any[], stats: any): { insights: DashboardInsight[], summary: string } {
  const insights: DashboardInsight[] = [];

  // Analyze pending applications
  const pendingReview = applications.filter(a => 
    ["application_submitted", "documents_pending", "under_review"].includes(a.status)
  );
  if (pendingReview.length > 10) {
    insights.push({
      type: "alert",
      title: "High Pending Applications",
      description: `${pendingReview.length} applications need attention`,
      metric: `${pendingReview.length} pending`,
      action: "Consider batch processing"
    });
  }

  // Check for aging applications
  const agingApps = applications.filter(a => {
    const daysSince = Math.floor((Date.now() - new Date(a.applicationDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 30 && !["enrolled", "rejected", "withdrawn"].includes(a.status);
  });
  if (agingApps.length > 0) {
    insights.push({
      type: "alert",
      title: "Aging Applications",
      description: `${agingApps.length} application(s) older than 30 days need expediting`,
      metric: `${agingApps.length} overdue`,
      action: "Prioritize oldest applications"
    });
  }

  // Enrollment rate trend
  if (stats.enrollmentRate >= 70) {
    insights.push({
      type: "success",
      title: "Strong Enrollment Rate",
      description: `${stats.enrollmentRate}% enrollment conversion rate`,
      metric: `${stats.enrollmentRate}%`
    });
  } else if (stats.enrollmentRate < 30) {
    insights.push({
      type: "trend",
      title: "Low Conversion Rate",
      description: "Enrollment rate below target. Review rejection reasons.",
      metric: `${stats.enrollmentRate}%`,
      action: "Analyze rejection patterns"
    });
  }

  // Waitlist management
  const waitlisted = applications.filter(a => a.status === "waitlisted");
  if (waitlisted.length > 5) {
    insights.push({
      type: "recommendation",
      title: "Review Waitlist",
      description: `${waitlisted.length} students on waitlist. Check for seat availability.`,
      metric: `${waitlisted.length} waitlisted`,
      action: "Promote from waitlist if seats available"
    });
  }

  // Document verification backlog
  const docsPending = applications.filter(a => a.status === "documents_pending");
  if (docsPending.length > 5) {
    insights.push({
      type: "alert",
      title: "Document Verification Backlog",
      description: `${docsPending.length} applications awaiting document verification`,
      metric: `${docsPending.length} pending`,
      action: "Schedule verification session"
    });
  }

  // Interview scheduling
  const readyForInterview = applications.filter(a => a.status === "entrance_test_completed");
  if (readyForInterview.length > 0) {
    insights.push({
      type: "recommendation",
      title: "Schedule Interviews",
      description: `${readyForInterview.length} student(s) ready for interviews`,
      metric: `${readyForInterview.length} ready`,
      action: "Set up interview slots"
    });
  }

  // Offers pending response
  const offersPending = applications.filter(a => a.status === "offer_extended");
  if (offersPending.length > 0) {
    insights.push({
      type: "trend",
      title: "Offers Awaiting Response",
      description: `${offersPending.length} offer(s) pending parent acceptance`,
      metric: `${offersPending.length} pending`,
      action: "Send follow-up reminders"
    });
  }

  // Generate summary
  const alertCount = insights.filter(i => i.type === "alert").length;
  let summary = "System operating normally.";
  if (alertCount > 2) {
    summary = `${alertCount} items need immediate attention.`;
  } else if (alertCount > 0) {
    summary = `${alertCount} alert(s) to review.`;
  }

  return { insights, summary };
}

// AI Bulk Recommendations Generator
interface BulkRecommendation {
  category: string;
  count: number;
  applicationIds: string[];
  suggestedAction: string;
  priority: "high" | "medium" | "low";
}

function generateBulkRecommendations(applications: any[]): { recommendations: BulkRecommendation[], totalActions: number } {
  const recommendations: BulkRecommendation[] = [];

  // Group applications by status for bulk actions
  const docsPending = applications.filter(a => a.status === "documents_pending");
  if (docsPending.length > 0) {
    recommendations.push({
      category: "Document Verification",
      count: docsPending.length,
      applicationIds: docsPending.map(a => a.id),
      suggestedAction: "Batch verify documents",
      priority: "high"
    });
  }

  const testReady = applications.filter(a => a.status === "documents_verified");
  if (testReady.length > 0) {
    recommendations.push({
      category: "Schedule Entrance Tests",
      count: testReady.length,
      applicationIds: testReady.map(a => a.id),
      suggestedAction: "Schedule tests for all verified applications",
      priority: "medium"
    });
  }

  const interviewReady = applications.filter(a => a.status === "entrance_test_completed");
  if (interviewReady.length > 0) {
    recommendations.push({
      category: "Schedule Interviews",
      count: interviewReady.length,
      applicationIds: interviewReady.map(a => a.id),
      suggestedAction: "Schedule interview slots",
      priority: "medium"
    });
  }

  const decisionReady = applications.filter(a => a.status === "interview_completed");
  if (decisionReady.length > 0) {
    recommendations.push({
      category: "Make Decisions",
      count: decisionReady.length,
      applicationIds: decisionReady.map(a => a.id),
      suggestedAction: "Review and decide on applications",
      priority: "high"
    });
  }

  const enrollmentReady = applications.filter(a => a.status === "offer_accepted");
  if (enrollmentReady.length > 0) {
    recommendations.push({
      category: "Complete Enrollments",
      count: enrollmentReady.length,
      applicationIds: enrollmentReady.map(a => a.id),
      suggestedAction: "Process enrollments and collect fees",
      priority: "high"
    });
  }

  const totalActions = recommendations.reduce((sum, r) => sum + r.count, 0);
  return { recommendations, totalActions };
}
