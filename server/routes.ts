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

  // AI Smart Status Transitions
  app.get("/api/ai/smart-transitions/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const transitions = generateSmartStatusTransitions(application);
      res.json(transitions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Communication Templates
  app.get("/api/ai/communication-templates/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const templates = generateCommunicationTemplates(application);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Application Comparison
  app.post("/api/ai/compare-applications", async (req, res) => {
    try {
      const { applicationIds } = req.body;
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length < 2) {
        return res.status(400).json({ message: "Provide at least 2 application IDs to compare" });
      }
      const applications = await Promise.all(
        applicationIds.map((id: string) => storage.getApplicationWithRelations(id))
      );
      const comparison = compareApplications(applications.filter(Boolean));
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Deadline Alerts
  app.get("/api/ai/deadline-alerts", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const alerts = generateDeadlineAlerts(applications);
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Application Quality Score
  app.get("/api/ai/quality-score/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const qualityScore = calculateApplicationQuality(application);
      res.json(qualityScore);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Grade-wise Analytics
  app.get("/api/ai/grade-analytics", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const analytics = generateGradeAnalytics(applications);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Document Batch Scoring
  app.get("/api/ai/document-batch-score", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const applicationsWithDocs = await Promise.all(
        applications.map(async (app) => {
          const documents = await storage.getApplicationDocuments(app.id);
          return { ...app, documents };
        })
      );
      const batchScores = generateDocumentBatchScores(applicationsWithDocs);
      res.json(batchScores);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Interview Preparation
  app.get("/api/ai/interview-preparation/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const preparation = generateInterviewPreparation(application);
      res.json(preparation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Decision Support
  app.get("/api/ai/decision-support/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const decision = generateDecisionSupport(application);
      res.json(decision);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Anomaly Detection (v2.5.0)
  app.get("/api/ai/anomaly-detection", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const applicationsWithDocs = await Promise.all(
        applications.map(async (app) => {
          const documents = await storage.getApplicationDocuments(app.id);
          return { ...app, documents };
        })
      );
      const anomalies = detectAnomalies(applicationsWithDocs);
      res.json(anomalies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Trend Forecasting (v2.5.0)
  app.get("/api/ai/trend-forecast", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const cycles = await storage.getAdmissionCycles();
      const forecast = generateTrendForecast(applications, cycles);
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Smart Auto-fill (v2.5.0)
  app.get("/api/ai/smart-autofill/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const autofill = generateSmartAutofill(application);
      res.json(autofill);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Risk Assessment (v2.5.0)
  app.get("/api/ai/risk-assessment/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const risk = assessApplicationRisk(application);
      res.json(risk);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Capacity Planning (v2.5.0)
  app.get("/api/ai/capacity-planning", async (req, res) => {
    try {
      const activeCycle = await storage.getActiveAdmissionCycle();
      if (!activeCycle) {
        return res.json({ grades: [], overallRecommendation: "No active admission cycle", projectedEnrollment: 0 });
      }
      const applications = await storage.getApplications();
      const seatConfigs = await storage.getSeatConfigs(activeCycle.id);
      const planning = generateCapacityPlanning(applications, seatConfigs);
      res.json(planning);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI NLP Search (v2.6.0)
  const nlpSearchSchema = z.object({
    query: z.string().min(1),
  });

  app.post("/api/ai/nlp-search", async (req, res) => {
    try {
      const validation = validateBody(nlpSearchSchema, req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error });
      }
      const applications = await storage.getApplications();
      const result = performNLPSearch(validation.data.query, applications);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Sentiment Analysis (v2.6.0)
  app.get("/api/ai/sentiment-analysis/:id", async (req, res) => {
    try {
      const application = await storage.getApplicationWithRelations(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const sentiment = analyzeInterviewSentiment(application);
      res.json(sentiment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Smart Scheduling (v2.6.0)
  app.get("/api/ai/smart-scheduling", async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const scheduling = generateSmartScheduling(applications);
      res.json(scheduling);
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

// AI Smart Status Transitions
interface SmartTransition {
  targetStatus: string;
  label: string;
  confidence: number;
  reasoning: string;
  requiresInput: boolean;
  inputFields?: string[];
}

function generateSmartStatusTransitions(application: any): { transitions: SmartTransition[], currentStatus: string } {
  const status = application.status;
  const transitions: SmartTransition[] = [];
  const documents = application.documents || [];
  const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
  const pendingDocs = documents.filter((d: any) => d.verificationStatus === "pending").length;

  switch (status) {
    case "inquiry":
      transitions.push({
        targetStatus: "application_submitted",
        label: "Submit Application",
        confidence: 100,
        reasoning: "Move inquiry to formal application",
        requiresInput: false
      });
      break;

    case "application_submitted":
      transitions.push({
        targetStatus: "documents_pending",
        label: "Request Documents",
        confidence: 90,
        reasoning: "Application received, documents needed",
        requiresInput: false
      });
      break;

    case "documents_pending":
      if (verifiedDocs >= 3 && pendingDocs === 0) {
        transitions.push({
          targetStatus: "documents_verified",
          label: "Mark Documents Verified",
          confidence: 95,
          reasoning: `${verifiedDocs} documents verified, no pending`,
          requiresInput: false
        });
      }
      if (pendingDocs > 0) {
        transitions.push({
          targetStatus: "documents_pending",
          label: "Continue Document Review",
          confidence: 70,
          reasoning: `${pendingDocs} documents still pending verification`,
          requiresInput: false
        });
      }
      break;

    case "documents_verified":
      transitions.push({
        targetStatus: "entrance_test_scheduled",
        label: "Schedule Entrance Test",
        confidence: 95,
        reasoning: "Documents complete, ready for testing",
        requiresInput: true,
        inputFields: ["testDate"]
      });
      break;

    case "entrance_test_scheduled":
      transitions.push({
        targetStatus: "entrance_test_completed",
        label: "Record Test Results",
        confidence: 90,
        reasoning: "Test scheduled, ready to record results",
        requiresInput: true,
        inputFields: ["score", "testDate"]
      });
      break;

    case "entrance_test_completed":
      const testScore = parseFloat(application.entranceTestScore || "0");
      if (testScore >= 40) {
        transitions.push({
          targetStatus: "interview_scheduled",
          label: "Schedule Interview",
          confidence: 90,
          reasoning: `Passed test with ${testScore}%, ready for interview`,
          requiresInput: true,
          inputFields: ["interviewDate"]
        });
      } else {
        transitions.push({
          targetStatus: "rejected",
          label: "Reject Application",
          confidence: 60,
          reasoning: `Test score ${testScore}% below passing threshold`,
          requiresInput: true,
          inputFields: ["remarks"]
        });
        transitions.push({
          targetStatus: "waitlisted",
          label: "Add to Waitlist",
          confidence: 40,
          reasoning: "Consider for waitlist pending seat availability",
          requiresInput: false
        });
      }
      break;

    case "interview_scheduled":
      transitions.push({
        targetStatus: "interview_completed",
        label: "Record Interview Results",
        confidence: 90,
        reasoning: "Interview scheduled, record results",
        requiresInput: true,
        inputFields: ["score", "notes"]
      });
      break;

    case "interview_completed":
      const intScore = parseFloat(application.interviewScore || "0");
      const entScore = parseFloat(application.entranceTestScore || "0");
      const avgScore = (intScore + entScore) / 2;
      
      if (avgScore >= 50) {
        transitions.push({
          targetStatus: "offer_extended",
          label: "Extend Offer",
          confidence: 85,
          reasoning: `Combined score ${avgScore.toFixed(1)}% - strong candidate`,
          requiresInput: false
        });
      }
      transitions.push({
        targetStatus: "under_review",
        label: "Send for Review",
        confidence: 70,
        reasoning: "Requires additional review before decision",
        requiresInput: false
      });
      if (avgScore < 40) {
        transitions.push({
          targetStatus: "rejected",
          label: "Reject Application",
          confidence: 60,
          reasoning: `Low combined score: ${avgScore.toFixed(1)}%`,
          requiresInput: true,
          inputFields: ["remarks"]
        });
      }
      break;

    case "under_review":
      transitions.push({
        targetStatus: "offer_extended",
        label: "Extend Offer",
        confidence: 70,
        reasoning: "After review, extend admission offer",
        requiresInput: false
      });
      transitions.push({
        targetStatus: "waitlisted",
        label: "Add to Waitlist",
        confidence: 50,
        reasoning: "Pending seat availability",
        requiresInput: false
      });
      transitions.push({
        targetStatus: "rejected",
        label: "Reject Application",
        confidence: 30,
        reasoning: "Does not meet requirements",
        requiresInput: true,
        inputFields: ["remarks"]
      });
      break;

    case "waitlisted":
      transitions.push({
        targetStatus: "offer_extended",
        label: "Extend Offer (Seat Available)",
        confidence: 60,
        reasoning: "Seat became available",
        requiresInput: false
      });
      transitions.push({
        targetStatus: "rejected",
        label: "Remove from Waitlist",
        confidence: 30,
        reasoning: "No seats available this cycle",
        requiresInput: true,
        inputFields: ["remarks"]
      });
      break;

    case "offer_extended":
      transitions.push({
        targetStatus: "offer_accepted",
        label: "Accept Offer",
        confidence: 80,
        reasoning: "Parent/guardian accepts admission offer",
        requiresInput: false
      });
      transitions.push({
        targetStatus: "withdrawn",
        label: "Decline Offer",
        confidence: 20,
        reasoning: "Parent/guardian declines admission",
        requiresInput: false
      });
      break;

    case "offer_accepted":
      transitions.push({
        targetStatus: "enrolled",
        label: "Complete Enrollment",
        confidence: 95,
        reasoning: "Finalize enrollment after fee payment",
        requiresInput: false
      });
      break;
  }

  return { transitions, currentStatus: status };
}

// AI Communication Templates
interface CommunicationTemplate {
  type: "email" | "sms" | "call";
  purpose: string;
  subject: string;
  content: string;
  priority: "high" | "medium" | "low";
}

function generateCommunicationTemplates(application: any): { templates: CommunicationTemplate[] } {
  const templates: CommunicationTemplate[] = [];
  const studentName = `${application.studentFirstName} ${application.studentLastName}`;
  const guardianName = application.fatherName;
  const status = application.status;

  switch (status) {
    case "application_submitted":
      templates.push({
        type: "email",
        purpose: "Acknowledge Application",
        subject: `Application Received - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nThank you for submitting the admission application for ${studentName}. Your application number is ${application.applicationNumber}.\n\nPlease upload the required documents to proceed with the admission process.\n\nRequired Documents:\n- Birth Certificate\n- Passport Photo\n- Address Proof\n- Previous Report Card (if applicable)\n\nRegards,\nAdmission Office`,
        priority: "high"
      });
      break;

    case "documents_pending":
      const pendingDocs = (application.documents || []).filter((d: any) => d.verificationStatus === "pending");
      templates.push({
        type: "email",
        purpose: "Document Reminder",
        subject: `Documents Required - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nThis is a reminder regarding the pending documents for ${studentName}'s admission application.\n\nPlease ensure all required documents are submitted for verification.\n\nRegards,\nAdmission Office`,
        priority: "medium"
      });
      break;

    case "documents_verified":
      templates.push({
        type: "email",
        purpose: "Test Scheduling",
        subject: `Entrance Test Scheduled - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nWe are pleased to inform you that the documents for ${studentName}'s application have been verified.\n\nThe entrance test has been scheduled. Please check the portal for the date and time.\n\nTest Guidelines:\n- Please arrive 15 minutes before the scheduled time\n- Bring a valid ID proof\n- Carry pencils and erasers\n\nRegards,\nAdmission Office`,
        priority: "high"
      });
      break;

    case "entrance_test_completed":
      const testScore = application.entranceTestScore ? parseFloat(application.entranceTestScore) : 0;
      templates.push({
        type: "email",
        purpose: "Test Results",
        subject: `Entrance Test Results - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\n${studentName} has completed the entrance test.\n\nScore: ${testScore}%\n\n${testScore >= 40 ? "Congratulations! An interview will be scheduled shortly." : "We will contact you regarding the next steps."}\n\nRegards,\nAdmission Office`,
        priority: "high"
      });
      break;

    case "interview_scheduled":
      const interviewDateStr = application.interviewDate 
        ? new Date(application.interviewDate).toLocaleDateString() 
        : "TBC";
      templates.push({
        type: "email",
        purpose: "Interview Reminder",
        subject: `Interview Scheduled - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nThe interview for ${studentName}'s admission has been scheduled.\n\nPlease ensure both parent/guardian and student are present.\n\nInterview Date: ${interviewDateStr}\n\nRegards,\nAdmission Office`,
        priority: "high"
      });
      templates.push({
        type: "sms",
        purpose: "Interview SMS Reminder",
        subject: "Interview",
        content: `Interview: ${interviewDateStr}. ${application.applicationNumber}`,
        priority: "medium"
      });
      break;

    case "offer_extended":
      templates.push({
        type: "email",
        purpose: "Offer Letter",
        subject: `Admission Offer - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nCongratulations! We are pleased to offer admission to ${studentName} for Grade ${application.gradeAppliedFor}.\n\nPlease accept this offer and complete the enrollment process within 7 days.\n\nTo accept:\n1. Log in to the admission portal\n2. Accept the offer\n3. Pay the admission fee\n\nWe look forward to welcoming ${studentName} to our school.\n\nRegards,\nAdmission Office`,
        priority: "high"
      });
      break;

    case "offer_accepted":
      templates.push({
        type: "email",
        purpose: "Enrollment Instructions",
        subject: `Complete Enrollment - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nThank you for accepting the admission offer for ${studentName}.\n\nTo complete the enrollment:\n1. Pay the admission fee\n2. Submit original documents for verification\n3. Collect the admission kit\n\nWe look forward to seeing ${studentName} on the first day of school.\n\nRegards,\nAdmission Office`,
        priority: "high"
      });
      break;

    case "enrolled":
      templates.push({
        type: "email",
        purpose: "Welcome Email",
        subject: `Welcome to Our School - ${studentName}`,
        content: `Dear ${guardianName},\n\nCongratulations on ${studentName}'s enrollment!\n\nWe are excited to welcome ${studentName} to Grade ${application.gradeAppliedFor}.\n\nImportant Information:\n- School starts on [Start Date]\n- Orientation will be held on [Orientation Date]\n- Uniform and books list will be shared separately\n\nWelcome to our school family!\n\nRegards,\nAdmission Office`,
        priority: "medium"
      });
      break;

    case "rejected":
      templates.push({
        type: "email",
        purpose: "Rejection Notification",
        subject: `Application Status - ${application.applicationNumber}`,
        content: `Dear ${guardianName},\n\nThank you for your interest in our school and for applying for ${studentName}'s admission.\n\nAfter careful consideration, we regret to inform you that we are unable to offer admission at this time.\n\n${application.decisionRemarks ? `Reason: ${application.decisionRemarks}` : ""}\n\nWe encourage you to apply again in the next admission cycle.\n\nRegards,\nAdmission Office`,
        priority: "medium"
      });
      break;
  }

  return { templates };
}

// AI Application Comparison
interface ApplicationComparison {
  applications: {
    id: string;
    applicationNumber: string;
    studentName: string;
    grade: string;
    status: string;
    scores: {
      eligibility: number;
      entranceTest: number | null;
      interview: number | null;
      documentCompleteness: number;
    };
  }[];
  winner: string | null;
  analysis: string;
}

function compareApplications(applications: any[]): ApplicationComparison {
  const comparedApps = applications.map(app => {
    const documents = app.documents || [];
    const totalDocs = documents.length;
    const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
    const rejectedDocs = documents.filter((d: any) => d.verificationStatus === "rejected").length;
    const docCompleteness = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0;
    
    const entranceTest = app.entranceTestScore ? parseFloat(app.entranceTestScore) : null;
    const interview = app.interviewScore ? parseFloat(app.interviewScore) : null;
    const previousMarks = app.previousMarks ? parseFloat(app.previousMarks) : null;
    
    let eligibility = 20;
    
    if (totalDocs >= 3 && rejectedDocs === 0) eligibility += 15;
    else if (verifiedDocs >= 2) eligibility += 10;
    else if (verifiedDocs >= 1) eligibility += 5;
    
    if (entranceTest !== null) {
      if (entranceTest >= 70) eligibility += 25;
      else if (entranceTest >= 50) eligibility += 20;
      else if (entranceTest >= 40) eligibility += 15;
      else eligibility += 5;
    }
    
    if (interview !== null) {
      if (interview >= 70) eligibility += 20;
      else if (interview >= 50) eligibility += 15;
      else if (interview >= 40) eligibility += 10;
      else eligibility += 3;
    }
    
    if (previousMarks !== null) {
      if (previousMarks >= 80) eligibility += 15;
      else if (previousMarks >= 60) eligibility += 10;
      else if (previousMarks >= 40) eligibility += 5;
    }
    
    const statusBonus: Record<string, number> = {
      enrolled: 5, offer_accepted: 4, offer_extended: 3, 
      interview_completed: 2, entrance_test_completed: 1
    };
    eligibility += statusBonus[app.status] || 0;
    
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      studentName: `${app.studentFirstName} ${app.studentLastName}`,
      grade: app.gradeAppliedFor,
      status: app.status,
      scores: {
        eligibility: Math.min(100, Math.round(eligibility)),
        entranceTest,
        interview,
        documentCompleteness: docCompleteness
      }
    };
  });

  const sorted = [...comparedApps].sort((a, b) => b.scores.eligibility - a.scores.eligibility);
  const winner = sorted.length > 0 ? sorted[0].id : null;
  
  let analysis = "Comparison complete. ";
  if (sorted.length >= 2) {
    const diff = sorted[0].scores.eligibility - sorted[1].scores.eligibility;
    if (diff > 20) {
      analysis += `${sorted[0].studentName} is clearly the stronger candidate with ${diff}% higher eligibility score.`;
    } else if (diff > 10) {
      analysis += `${sorted[0].studentName} has a moderate advantage with ${diff}% higher eligibility.`;
    } else {
      analysis += `Both candidates are closely matched. Consider other factors.`;
    }
  }

  return {
    applications: comparedApps,
    winner,
    analysis
  };
}

// AI Deadline Alerts
interface DeadlineAlert {
  type: "overdue" | "due_soon" | "reminder";
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  deadline: string;
  daysRemaining: number;
  action: string;
}

function generateDeadlineAlerts(applications: any[]): { alerts: DeadlineAlert[], summary: string } {
  const alerts: DeadlineAlert[] = [];
  const now = new Date();

  applications.forEach(app => {
    const appDate = new Date(app.applicationDate);
    const daysSince = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    const studentName = `${app.studentFirstName} ${app.studentLastName}`;

    if (app.status === "documents_pending" && daysSince > 14) {
      alerts.push({
        type: daysSince > 21 ? "overdue" : "due_soon",
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName,
        deadline: "Document submission",
        daysRemaining: -(daysSince - 14),
        action: "Request documents urgently"
      });
    }

    if (app.status === "offer_extended") {
      const offerDate = app.decisionDate ? new Date(app.decisionDate) : appDate;
      const daysSinceOffer = Math.floor((now.getTime() - offerDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = 7 - daysSinceOffer;
      
      if (daysRemaining <= 3) {
        alerts.push({
          type: daysRemaining <= 0 ? "overdue" : "due_soon",
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          studentName,
          deadline: "Offer acceptance",
          daysRemaining,
          action: daysRemaining <= 0 ? "Follow up immediately" : "Send reminder"
        });
      }
    }

    if (app.status === "entrance_test_scheduled" && app.entranceTestDate) {
      const testDate = new Date(app.entranceTestDate);
      const daysUntilTest = Math.floor((testDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilTest <= 3 && daysUntilTest >= 0) {
        alerts.push({
          type: "reminder",
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          studentName,
          deadline: "Entrance test",
          daysRemaining: daysUntilTest,
          action: "Confirm test attendance"
        });
      }
    }

    if (app.status === "interview_scheduled" && app.interviewDate) {
      const intDate = new Date(app.interviewDate);
      const daysUntilInt = Math.floor((intDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilInt <= 3 && daysUntilInt >= 0) {
        alerts.push({
          type: "reminder",
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          studentName,
          deadline: "Interview",
          daysRemaining: daysUntilInt,
          action: "Confirm interview attendance"
        });
      }
    }
  });

  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  
  const overdueCount = alerts.filter(a => a.type === "overdue").length;
  const dueSoonCount = alerts.filter(a => a.type === "due_soon").length;
  
  let summary = "No immediate deadlines.";
  if (overdueCount > 0) {
    summary = `${overdueCount} overdue item(s) require immediate attention!`;
  } else if (dueSoonCount > 0) {
    summary = `${dueSoonCount} deadline(s) coming up soon.`;
  }

  return { alerts, summary };
}

// AI Application Quality Score
interface QualityScore {
  overallQuality: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    feedback: string;
  }[];
  improvements: string[];
}

function calculateApplicationQuality(application: any): QualityScore {
  const breakdown: { category: string; score: number; maxScore: number; feedback: string }[] = [];
  const improvements: string[] = [];
  const documents = application.documents || [];

  // Information Completeness (30 points)
  let infoScore = 10;
  if (application.studentFirstName && application.studentLastName) infoScore += 5;
  if (application.dateOfBirth) infoScore += 3;
  if (application.fatherName && application.fatherContact && application.fatherEmail) infoScore += 5;
  if (application.motherName) infoScore += 3;
  if (application.currentAddress) infoScore += 4;
  breakdown.push({
    category: "Information Completeness",
    score: Math.min(30, infoScore),
    maxScore: 30,
    feedback: infoScore >= 25 ? "Complete profile" : "Some information missing"
  });
  if (infoScore < 25) improvements.push("Complete all guardian contact details");

  // Document Quality (30 points)
  const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
  const docScore = Math.min(30, verifiedDocs * 6);
  breakdown.push({
    category: "Document Quality",
    score: docScore,
    maxScore: 30,
    feedback: `${verifiedDocs}/5 required documents verified`
  });
  if (verifiedDocs < 5) improvements.push("Upload and verify all required documents");

  // Academic Profile (20 points)
  let academicScore = 10;
  if (application.previousSchoolName) academicScore += 5;
  if (application.previousMarks) {
    const marks = parseFloat(application.previousMarks);
    if (marks >= 75) academicScore += 5;
    else if (marks >= 50) academicScore += 3;
  }
  breakdown.push({
    category: "Academic Profile",
    score: Math.min(20, academicScore),
    maxScore: 20,
    feedback: application.previousMarks ? `Previous marks: ${application.previousMarks}%` : "No previous academic record"
  });
  if (!application.previousMarks) improvements.push("Provide previous academic records");

  // Screening Completion (20 points)
  let screeningScore = 0;
  if (application.entranceTestScore) {
    const testScore = parseFloat(application.entranceTestScore);
    screeningScore += testScore >= 40 ? 10 : 5;
  }
  if (application.interviewScore) {
    const intScore = parseFloat(application.interviewScore);
    screeningScore += intScore >= 40 ? 10 : 5;
  }
  breakdown.push({
    category: "Screening Completion",
    score: Math.min(20, screeningScore),
    maxScore: 20,
    feedback: screeningScore === 20 ? "All screenings complete" : "Screenings pending"
  });
  if (screeningScore < 20) improvements.push("Complete entrance test and interview");

  const overallQuality = breakdown.reduce((sum, b) => sum + b.score, 0);
  
  let grade: "A" | "B" | "C" | "D" | "F";
  if (overallQuality >= 90) grade = "A";
  else if (overallQuality >= 75) grade = "B";
  else if (overallQuality >= 60) grade = "C";
  else if (overallQuality >= 45) grade = "D";
  else grade = "F";

  return { overallQuality, grade, breakdown, improvements };
}

// AI Grade-wise Analytics
interface GradeAnalytics {
  grades: {
    gradeId: string;
    gradeName: string;
    totalApplications: number;
    enrolled: number;
    rejected: number;
    pending: number;
    conversionRate: number;
    avgEntranceScore: number | null;
    avgInterviewScore: number | null;
    competitionLevel: "high" | "medium" | "low";
  }[];
  summary: string;
  insights: string[];
}

function generateGradeAnalytics(applications: any[]): GradeAnalytics {
  const gradeMap = new Map<string, any[]>();
  
  applications.forEach(app => {
    const grade = app.gradeAppliedFor;
    if (!gradeMap.has(grade)) {
      gradeMap.set(grade, []);
    }
    gradeMap.get(grade)!.push(app);
  });

  const grades = Array.from(gradeMap.entries()).map(([gradeId, apps]) => {
    const enrolled = apps.filter(a => a.status === "enrolled").length;
    const rejected = apps.filter(a => a.status === "rejected").length;
    const pending = apps.filter(a => !["enrolled", "rejected", "withdrawn"].includes(a.status)).length;
    
    const entranceScores = apps
      .filter(a => a.entranceTestScore)
      .map(a => parseFloat(a.entranceTestScore));
    const avgEntranceScore = entranceScores.length > 0 
      ? Math.round(entranceScores.reduce((a, b) => a + b, 0) / entranceScores.length)
      : null;

    const interviewScores = apps
      .filter(a => a.interviewScore)
      .map(a => parseFloat(a.interviewScore));
    const avgInterviewScore = interviewScores.length > 0
      ? Math.round(interviewScores.reduce((a, b) => a + b, 0) / interviewScores.length)
      : null;

    const conversionRate = apps.length > 0 ? Math.round((enrolled / apps.length) * 100) : 0;
    
    let competitionLevel: "high" | "medium" | "low" = "low";
    if (apps.length > 20) competitionLevel = "high";
    else if (apps.length > 10) competitionLevel = "medium";

    return {
      gradeId,
      gradeName: gradeId.charAt(0).toUpperCase() + gradeId.slice(1).replace(/(\d+)/g, " $1"),
      totalApplications: apps.length,
      enrolled,
      rejected,
      pending,
      conversionRate,
      avgEntranceScore,
      avgInterviewScore,
      competitionLevel
    };
  }).sort((a, b) => b.totalApplications - a.totalApplications);

  const insights: string[] = [];
  const highCompetition = grades.filter(g => g.competitionLevel === "high");
  if (highCompetition.length > 0) {
    insights.push(`High competition in: ${highCompetition.map(g => g.gradeName).join(", ")}`);
  }

  const lowConversion = grades.filter(g => g.conversionRate < 30 && g.totalApplications > 5);
  if (lowConversion.length > 0) {
    insights.push(`Low conversion rates in: ${lowConversion.map(g => g.gradeName).join(", ")}`);
  }

  const totalApps = applications.length;
  const totalEnrolled = grades.reduce((sum, g) => sum + g.enrolled, 0);
  const overallRate = totalApps > 0 ? Math.round((totalEnrolled / totalApps) * 100) : 0;

  return {
    grades,
    summary: `${grades.length} grades with ${totalApps} total applications, ${overallRate}% overall conversion`,
    insights
  };
}

// AI Document Batch Scoring
interface DocumentBatchScore {
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  documentScore: number;
  documentsAnalysis: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    missingRequired: string[];
  };
  recommendation: string;
  priority: "high" | "medium" | "low";
}

function generateDocumentBatchScores(applications: any[]): { scores: DocumentBatchScore[], summary: string } {
  const requiredDocs = ["birth_certificate", "passport_photo", "address_proof"];
  
  const scores = applications
    .filter(app => app.status === "documents_pending" || app.status === "application_submitted")
    .map(app => {
      const documents = app.documents || [];
      const total = documents.length;
      const verified = documents.filter((d: any) => d.verificationStatus === "verified").length;
      const pending = documents.filter((d: any) => d.verificationStatus === "pending").length;
      const rejected = documents.filter((d: any) => d.verificationStatus === "rejected").length;
      
      const uploadedTypes = documents.map((d: any) => d.documentType);
      const missingRequired = requiredDocs.filter(doc => !uploadedTypes.includes(doc));
      
      let documentScore = 0;
      if (total > 0) {
        documentScore += Math.min(30, (total / 5) * 30);
        documentScore += (verified / Math.max(1, total)) * 40;
        documentScore -= rejected * 10;
        if (missingRequired.length === 0) documentScore += 20;
        else documentScore -= missingRequired.length * 5;
      }
      documentScore = Math.max(0, Math.min(100, Math.round(documentScore)));
      
      let recommendation = "";
      let priority: "high" | "medium" | "low" = "medium";
      
      if (missingRequired.length > 0) {
        recommendation = `Missing ${missingRequired.length} required document(s). Request submission.`;
        priority = "high";
      } else if (pending > 0) {
        recommendation = `${pending} document(s) pending verification. Review now.`;
        priority = pending > 2 ? "high" : "medium";
      } else if (rejected > 0) {
        recommendation = `${rejected} document(s) rejected. Request re-submission.`;
        priority = "high";
      } else if (verified === total && total >= 3) {
        recommendation = "All documents verified. Ready for next stage.";
        priority = "low";
      } else {
        recommendation = "Request additional documents to strengthen application.";
        priority = "medium";
      }
      
      return {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        documentScore,
        documentsAnalysis: {
          total,
          verified,
          pending,
          rejected,
          missingRequired
        },
        recommendation,
        priority
      };
    })
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  
  const highPriority = scores.filter(s => s.priority === "high").length;
  const summary = `${scores.length} applications need document review. ${highPriority} require immediate attention.`;
  
  return { scores, summary };
}

// AI Interview Preparation
interface InterviewPreparation {
  applicationId: string;
  studentName: string;
  grade: string;
  suggestedQuestions: {
    category: string;
    question: string;
    purpose: string;
  }[];
  focusAreas: string[];
  redFlags: string[];
  tips: string[];
}

function generateInterviewPreparation(application: any): InterviewPreparation {
  const studentName = `${application.studentFirstName} ${application.studentLastName}`;
  const grade = application.gradeAppliedFor;
  const entranceScore = application.entranceTestScore ? parseFloat(application.entranceTestScore) : null;
  const previousMarks = application.previousMarks ? parseFloat(application.previousMarks) : null;
  
  const suggestedQuestions: InterviewPreparation["suggestedQuestions"] = [];
  const focusAreas: string[] = [];
  const redFlags: string[] = [];
  const tips: string[] = [];
  
  // Basic questions for all applicants
  suggestedQuestions.push({
    category: "Introduction",
    question: "Tell us about yourself and why you want to join our school.",
    purpose: "Assess communication skills and motivation"
  });
  
  suggestedQuestions.push({
    category: "Academic Interest",
    question: "What is your favorite subject and why?",
    purpose: "Understand academic interests and enthusiasm"
  });
  
  // Grade-specific questions
  if (grade.includes("grade1") || grade === "lkg" || grade === "ukg" || grade === "nursery") {
    suggestedQuestions.push({
      category: "Readiness",
      question: "Can you tell us about your daily routine at home?",
      purpose: "Assess school readiness and routine familiarity"
    });
    focusAreas.push("Social interaction skills", "Basic motor skills", "Following simple instructions");
    tips.push("Keep questions simple and engaging for young children");
    tips.push("Observe body language and comfort level");
  } else {
    suggestedQuestions.push({
      category: "Problem Solving",
      question: "Describe a challenging situation you faced and how you handled it.",
      purpose: "Evaluate problem-solving and resilience"
    });
    suggestedQuestions.push({
      category: "Goals",
      question: "What are your goals for the next academic year?",
      purpose: "Assess maturity and future orientation"
    });
  }
  
  // Entrance test based questions
  if (entranceScore !== null) {
    if (entranceScore < 50) {
      suggestedQuestions.push({
        category: "Academic Support",
        question: "What areas do you find difficult in your studies? How do you plan to improve?",
        purpose: "Understand awareness of weaknesses and improvement mindset"
      });
      focusAreas.push("Learning ability and willingness to improve");
      redFlags.push(`Entrance test score (${entranceScore}%) below average - assess learning potential`);
    } else if (entranceScore >= 80) {
      suggestedQuestions.push({
        category: "Excellence",
        question: "What extracurricular activities are you interested in?",
        purpose: "Explore well-roundedness beyond academics"
      });
      focusAreas.push("Leadership potential", "Extracurricular interests");
    }
  }
  
  // Previous academic record
  if (previousMarks !== null && previousMarks < 50) {
    redFlags.push(`Previous marks (${previousMarks}%) are low - verify reasons`);
    suggestedQuestions.push({
      category: "Academic History",
      question: "Were there any challenges that affected your previous academic performance?",
      purpose: "Understand context behind lower grades"
    });
  }
  
  // Previous school transfer
  if (application.previousSchoolName) {
    suggestedQuestions.push({
      category: "Transition",
      question: "Why are you leaving your current school?",
      purpose: "Understand reasons for transfer and expectations"
    });
    focusAreas.push("Reason for school change");
  }
  
  // Parent interaction
  suggestedQuestions.push({
    category: "Parent Discussion",
    question: "(For parents) How do you support your child's education at home?",
    purpose: "Assess parental involvement and support system"
  });
  
  suggestedQuestions.push({
    category: "Parent Discussion",
    question: "(For parents) What are your expectations from our school?",
    purpose: "Align expectations and school offerings"
  });
  
  // General tips
  tips.push("Allow the student to answer before parents intervene");
  tips.push("Create a comfortable atmosphere to reduce nervousness");
  tips.push("Note both verbal responses and non-verbal cues");
  tips.push("Give opportunity for the family to ask questions");
  
  return {
    applicationId: application.id,
    studentName,
    grade,
    suggestedQuestions,
    focusAreas,
    redFlags,
    tips
  };
}

// AI Decision Support
interface DecisionSupport {
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  recommendedDecision: "admit" | "waitlist" | "reject" | "needs_review";
  confidenceScore: number;
  reasoning: {
    category: string;
    assessment: string;
    impact: "positive" | "negative" | "neutral";
    score: number;
  }[];
  strengths: string[];
  concerns: string[];
  finalRecommendation: string;
}

function generateDecisionSupport(application: any): DecisionSupport {
  const studentName = `${application.studentFirstName} ${application.studentLastName}`;
  const reasoning: DecisionSupport["reasoning"] = [];
  const strengths: string[] = [];
  const concerns: string[] = [];
  let totalScore = 0;
  let maxScore = 0;
  
  // Document Assessment (20 points)
  maxScore += 20;
  const documents = application.documents || [];
  const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
  const rejectedDocs = documents.filter((d: any) => d.verificationStatus === "rejected").length;
  let docScore = 0;
  
  if (verifiedDocs >= 4) {
    docScore = 20;
    strengths.push("Complete and verified documentation");
  } else if (verifiedDocs >= 3) {
    docScore = 15;
    strengths.push("Good documentation with most required documents verified");
  } else if (verifiedDocs >= 1) {
    docScore = 10;
  } else {
    docScore = 5;
    concerns.push("Limited documentation submitted");
  }
  
  if (rejectedDocs > 0) {
    docScore -= 5;
    concerns.push(`${rejectedDocs} document(s) were rejected`);
  }
  totalScore += docScore;
  
  reasoning.push({
    category: "Documentation",
    assessment: `${verifiedDocs} verified, ${rejectedDocs} rejected documents`,
    impact: docScore >= 15 ? "positive" : docScore >= 10 ? "neutral" : "negative",
    score: docScore
  });
  
  // Entrance Test Assessment (30 points)
  maxScore += 30;
  let testScore = 0;
  
  if (application.entranceTestScore) {
    const score = parseFloat(application.entranceTestScore);
    if (score >= 80) {
      testScore = 30;
      strengths.push(`Excellent entrance test performance (${score}%)`);
    } else if (score >= 60) {
      testScore = 25;
      strengths.push(`Good entrance test performance (${score}%)`);
    } else if (score >= 40) {
      testScore = 15;
    } else {
      testScore = 5;
      concerns.push(`Low entrance test score (${score}%)`);
    }
    
    reasoning.push({
      category: "Entrance Test",
      assessment: `Scored ${score}%`,
      impact: score >= 60 ? "positive" : score >= 40 ? "neutral" : "negative",
      score: testScore
    });
  } else {
    reasoning.push({
      category: "Entrance Test",
      assessment: "Not yet completed",
      impact: "neutral",
      score: 0
    });
  }
  totalScore += testScore;
  
  // Interview Assessment (30 points)
  maxScore += 30;
  let interviewScore = 0;
  
  if (application.interviewScore) {
    const score = parseFloat(application.interviewScore);
    if (score >= 80) {
      interviewScore = 30;
      strengths.push(`Outstanding interview performance (${score}%)`);
    } else if (score >= 60) {
      interviewScore = 25;
      strengths.push(`Positive interview impression (${score}%)`);
    } else if (score >= 40) {
      interviewScore = 15;
    } else {
      interviewScore = 5;
      concerns.push(`Interview performance below expectations (${score}%)`);
    }
    
    reasoning.push({
      category: "Interview",
      assessment: `Scored ${score}%`,
      impact: score >= 60 ? "positive" : score >= 40 ? "neutral" : "negative",
      score: interviewScore
    });
  } else {
    reasoning.push({
      category: "Interview",
      assessment: "Not yet completed",
      impact: "neutral",
      score: 0
    });
  }
  totalScore += interviewScore;
  
  // Previous Academic Record (20 points)
  maxScore += 20;
  let academicScore = 10; // Base score
  
  if (application.previousMarks) {
    const marks = parseFloat(application.previousMarks);
    if (marks >= 80) {
      academicScore = 20;
      strengths.push(`Strong previous academic record (${marks}%)`);
    } else if (marks >= 60) {
      academicScore = 15;
    } else if (marks >= 40) {
      academicScore = 10;
    } else {
      academicScore = 5;
      concerns.push(`Previous academic performance needs attention (${marks}%)`);
    }
    
    reasoning.push({
      category: "Previous Academics",
      assessment: `${marks}% in previous grade`,
      impact: marks >= 60 ? "positive" : marks >= 40 ? "neutral" : "negative",
      score: academicScore
    });
  } else {
    reasoning.push({
      category: "Previous Academics",
      assessment: "No previous records (new student)",
      impact: "neutral",
      score: 10
    });
  }
  totalScore += academicScore;
  
  // Calculate percentage and decision
  const percentage = Math.round((totalScore / maxScore) * 100);
  let recommendedDecision: DecisionSupport["recommendedDecision"];
  let finalRecommendation: string;
  
  if (percentage >= 75) {
    recommendedDecision = "admit";
    finalRecommendation = "Strong candidate. Recommend admission with confidence.";
  } else if (percentage >= 60) {
    recommendedDecision = "admit";
    finalRecommendation = "Good candidate. Recommend admission.";
  } else if (percentage >= 45) {
    recommendedDecision = "waitlist";
    finalRecommendation = "Average profile. Consider for waitlist pending seat availability.";
  } else if (percentage >= 30) {
    recommendedDecision = "needs_review";
    finalRecommendation = "Below average. Requires detailed committee review before decision.";
  } else {
    recommendedDecision = "reject";
    finalRecommendation = "Does not meet minimum admission criteria.";
  }
  
  // Adjust if screening is incomplete
  if (!application.entranceTestScore || !application.interviewScore) {
    recommendedDecision = "needs_review";
    finalRecommendation = "Screening incomplete. Complete entrance test and interview before final decision.";
  }
  
  return {
    applicationId: application.id,
    applicationNumber: application.applicationNumber,
    studentName,
    recommendedDecision,
    confidenceScore: percentage,
    reasoning,
    strengths,
    concerns,
    finalRecommendation
  };
}

// AI Anomaly Detection (v2.5.0)
interface AnomalyDetection {
  anomalies: {
    type: "data_quality" | "pattern" | "outlier" | "duplicate";
    severity: "high" | "medium" | "low";
    applicationId: string;
    applicationNumber: string;
    studentName: string;
    description: string;
    recommendation: string;
  }[];
  summary: string;
  dataQualityScore: number;
}

function detectAnomalies(applications: any[]): AnomalyDetection {
  const anomalies: AnomalyDetection["anomalies"] = [];
  let qualityIssues = 0;
  const totalApps = applications.length;

  applications.forEach(app => {
    const studentName = `${app.studentFirstName} ${app.studentLastName}`;
    
    // Data Quality Checks
    if (!app.dateOfBirth) {
      anomalies.push({
        type: "data_quality",
        severity: "high",
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName,
        description: "Missing date of birth - required field",
        recommendation: "Contact parent to provide date of birth"
      });
      qualityIssues++;
    }

    if (!app.fatherContact && !app.motherContact) {
      anomalies.push({
        type: "data_quality",
        severity: "high",
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName,
        description: "No guardian contact information provided",
        recommendation: "Urgently obtain parent/guardian contact details"
      });
      qualityIssues++;
    }

    // Pattern Anomalies
    if (app.entranceTestScore && app.interviewScore) {
      const testScore = parseFloat(app.entranceTestScore);
      const intScore = parseFloat(app.interviewScore);
      const diff = Math.abs(testScore - intScore);
      
      if (diff > 40) {
        anomalies.push({
          type: "pattern",
          severity: "medium",
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          studentName,
          description: `Large discrepancy between test (${testScore}%) and interview (${intScore}%) scores`,
          recommendation: "Review scores for data entry errors or consider re-evaluation"
        });
      }
    }

    // Outlier Detection
    if (app.previousMarks) {
      const marks = parseFloat(app.previousMarks);
      if (marks > 100 || marks < 0) {
        anomalies.push({
          type: "outlier",
          severity: "high",
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          studentName,
          description: `Invalid previous marks value: ${marks}%`,
          recommendation: "Correct the previous marks data"
        });
        qualityIssues++;
      }
    }

    // Check for very old pending applications
    const appDate = new Date(app.applicationDate);
    const daysSince = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 60 && !["enrolled", "rejected", "withdrawn"].includes(app.status)) {
      anomalies.push({
        type: "pattern",
        severity: "medium",
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName,
        description: `Application stalled for ${daysSince} days`,
        recommendation: "Investigate processing delays and take action"
      });
    }

    // Document anomalies
    const documents = app.documents || [];
    const rejectedDocs = documents.filter((d: any) => d.verificationStatus === "rejected");
    if (rejectedDocs.length > 2) {
      anomalies.push({
        type: "data_quality",
        severity: "medium",
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName,
        description: `Multiple documents rejected (${rejectedDocs.length})`,
        recommendation: "Verify document authenticity concerns with applicant"
      });
    }
  });

  // Check for potential duplicates by name
  const nameMap = new Map<string, any[]>();
  applications.forEach(app => {
    const fullName = `${app.studentFirstName} ${app.studentLastName}`.toLowerCase();
    if (!nameMap.has(fullName)) {
      nameMap.set(fullName, []);
    }
    nameMap.get(fullName)!.push(app);
  });

  nameMap.forEach((apps, name) => {
    if (apps.length > 1) {
      apps.forEach(app => {
        anomalies.push({
          type: "duplicate",
          severity: "medium",
          applicationId: app.id,
          applicationNumber: app.applicationNumber,
          studentName: `${app.studentFirstName} ${app.studentLastName}`,
          description: `Potential duplicate - ${apps.length} applications with same name`,
          recommendation: "Verify if these are different students or duplicate applications"
        });
      });
    }
  });

  const dataQualityScore = totalApps > 0 
    ? Math.max(0, Math.round(100 - (qualityIssues / totalApps) * 100))
    : 100;

  const highSeverity = anomalies.filter(a => a.severity === "high").length;
  const summary = anomalies.length === 0 
    ? "No anomalies detected. Data quality is excellent."
    : `${anomalies.length} anomalies detected. ${highSeverity} require immediate attention.`;

  return { anomalies, summary, dataQualityScore };
}

// AI Trend Forecasting (v2.5.0)
interface TrendForecast {
  currentPeriod: {
    applications: number;
    enrollments: number;
    conversionRate: number;
  };
  forecast: {
    period: string;
    expectedApplications: number;
    expectedEnrollments: number;
    confidence: number;
  }[];
  trends: {
    metric: string;
    direction: "up" | "down" | "stable";
    changePercent: number;
    insight: string;
  }[];
  recommendations: string[];
}

function generateTrendForecast(applications: any[], cycles: any[]): TrendForecast {
  const now = new Date();
  const currentMonth = now.getMonth();
  
  // Calculate current period stats
  const thisMonthApps = applications.filter(app => {
    const appDate = new Date(app.applicationDate);
    return appDate.getMonth() === currentMonth && appDate.getFullYear() === now.getFullYear();
  });
  
  const enrolledCount = applications.filter(app => app.status === "enrolled").length;
  const totalApps = applications.length;
  const conversionRate = totalApps > 0 ? Math.round((enrolledCount / totalApps) * 100) : 0;

  const currentPeriod = {
    applications: thisMonthApps.length,
    enrollments: enrolledCount,
    conversionRate
  };

  // Generate forecast for next 3 months
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const forecast: TrendForecast["forecast"] = [];
  
  // Simple projection based on current trends
  const avgMonthlyApps = totalApps > 0 ? Math.round(totalApps / Math.max(1, cycles.length)) : 0;
  
  for (let i = 1; i <= 3; i++) {
    const futureMonth = (currentMonth + i) % 12;
    const year = now.getFullYear() + Math.floor((currentMonth + i) / 12);
    
    // Seasonal adjustment (peak admissions typically in first half of year)
    let seasonalMultiplier = 1;
    if (futureMonth >= 0 && futureMonth <= 3) seasonalMultiplier = 1.3; // Peak season
    else if (futureMonth >= 4 && futureMonth <= 6) seasonalMultiplier = 1.1;
    else if (futureMonth >= 7 && futureMonth <= 9) seasonalMultiplier = 0.8;
    else seasonalMultiplier = 0.9;

    const expectedApps = Math.round(avgMonthlyApps * seasonalMultiplier);
    const expectedEnrollments = Math.round(expectedApps * (conversionRate / 100));

    forecast.push({
      period: `${monthNames[futureMonth]} ${year}`,
      expectedApplications: expectedApps,
      expectedEnrollments: expectedEnrollments,
      confidence: Math.round(80 - (i * 10)) // Confidence decreases over time
    });
  }

  // Analyze trends
  const trends: TrendForecast["trends"] = [];
  
  // Application volume trend
  const recentApps = applications.filter(app => {
    const appDate = new Date(app.applicationDate);
    const daysSince = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 30;
  }).length;
  
  const previousApps = applications.filter(app => {
    const appDate = new Date(app.applicationDate);
    const daysSince = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 30 && daysSince <= 60;
  }).length;

  let direction: "up" | "down" | "stable" = "stable";
  let changePercent = 0;
  
  if (previousApps > 0) {
    changePercent = Math.round(((recentApps - previousApps) / previousApps) * 100);
    if (changePercent > 10) direction = "up";
    else if (changePercent < -10) direction = "down";
  }

  trends.push({
    metric: "Application Volume",
    direction,
    changePercent: Math.abs(changePercent),
    insight: direction === "up" 
      ? "Applications increasing - consider preparing for higher volume"
      : direction === "down"
        ? "Application volume declining - may need outreach efforts"
        : "Application volume stable"
  });

  // Conversion trend
  const recentEnrolled = applications.filter(app => {
    const appDate = new Date(app.applicationDate);
    const daysSince = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 60 && app.status === "enrolled";
  }).length;
  
  const recentTotal = applications.filter(app => {
    const appDate = new Date(app.applicationDate);
    const daysSince = Math.floor((now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 60;
  }).length;

  const recentConversion = recentTotal > 0 ? Math.round((recentEnrolled / recentTotal) * 100) : 0;
  
  trends.push({
    metric: "Conversion Rate",
    direction: recentConversion > conversionRate ? "up" : recentConversion < conversionRate ? "down" : "stable",
    changePercent: Math.abs(recentConversion - conversionRate),
    insight: `Recent conversion: ${recentConversion}% vs overall: ${conversionRate}%`
  });

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (direction === "up") {
    recommendations.push("Prepare additional screening capacity for expected volume increase");
  }
  if (conversionRate < 50) {
    recommendations.push("Review and optimize admission process to improve conversion rate");
  }
  if (forecast.some(f => f.expectedApplications > avgMonthlyApps * 1.2)) {
    recommendations.push("Peak season approaching - ensure adequate staff and resources");
  }
  if (enrolledCount > 0 && totalApps > enrolledCount * 3) {
    recommendations.push("Large pipeline exists - focus on moving pending applications forward");
  }

  return { currentPeriod, forecast, trends, recommendations };
}

// AI Smart Auto-fill (v2.5.0)
interface SmartAutofill {
  applicationId: string;
  suggestions: {
    field: string;
    currentValue: string | null;
    suggestedValue: string;
    confidence: number;
    source: string;
  }[];
  completenessScore: number;
  missingFields: string[];
}

function generateSmartAutofill(application: any): SmartAutofill {
  const suggestions: SmartAutofill["suggestions"] = [];
  const missingFields: string[] = [];
  let completedFields = 0;
  let totalFields = 0;

  const fieldChecks = [
    { field: "studentFirstName", label: "Student First Name", value: application.studentFirstName },
    { field: "studentLastName", label: "Student Last Name", value: application.studentLastName },
    { field: "dateOfBirth", label: "Date of Birth", value: application.dateOfBirth },
    { field: "gender", label: "Gender", value: application.gender },
    { field: "nationality", label: "Nationality", value: application.nationality },
    { field: "bloodGroup", label: "Blood Group", value: application.bloodGroup },
    { field: "fatherName", label: "Father's Name", value: application.fatherName },
    { field: "fatherOccupation", label: "Father's Occupation", value: application.fatherOccupation },
    { field: "fatherContact", label: "Father's Contact", value: application.fatherContact },
    { field: "fatherEmail", label: "Father's Email", value: application.fatherEmail },
    { field: "motherName", label: "Mother's Name", value: application.motherName },
    { field: "motherOccupation", label: "Mother's Occupation", value: application.motherOccupation },
    { field: "motherContact", label: "Mother's Contact", value: application.motherContact },
    { field: "currentAddress", label: "Current Address", value: application.currentAddress },
    { field: "previousSchoolName", label: "Previous School", value: application.previousSchoolName },
  ];

  fieldChecks.forEach(({ field, label, value }) => {
    totalFields++;
    if (value) {
      completedFields++;
    } else {
      missingFields.push(label);
    }
  });

  // Generate smart suggestions for missing fields
  if (!application.nationality) {
    suggestions.push({
      field: "nationality",
      currentValue: null,
      suggestedValue: "Indian",
      confidence: 75,
      source: "Most common nationality in applications"
    });
  }

  if (!application.bloodGroup) {
    suggestions.push({
      field: "bloodGroup",
      currentValue: null,
      suggestedValue: "O+",
      confidence: 35,
      source: "Most common blood group - verification required"
    });
  }

  if (application.fatherContact && !application.motherContact) {
    suggestions.push({
      field: "motherContact",
      currentValue: null,
      suggestedValue: "Same as father's contact",
      confidence: 50,
      source: "Common pattern - single contact family"
    });
  }

  // Suggest permanent address from current address
  if (application.currentAddress && !application.permanentAddress) {
    suggestions.push({
      field: "permanentAddress",
      currentValue: null,
      suggestedValue: application.currentAddress,
      confidence: 60,
      source: "Copy from current address"
    });
  }

  // Email domain suggestions
  if (application.fatherContact && !application.fatherEmail) {
    suggestions.push({
      field: "fatherEmail",
      currentValue: null,
      suggestedValue: "Request email from guardian",
      confidence: 90,
      source: "Email required for communications"
    });
  }

  const completenessScore = Math.round((completedFields / totalFields) * 100);

  return {
    applicationId: application.id,
    suggestions,
    completenessScore,
    missingFields
  };
}

// AI Risk Assessment (v2.5.0)
interface RiskAssessment {
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  overallRiskLevel: "high" | "medium" | "low";
  riskScore: number;
  riskFactors: {
    factor: string;
    riskLevel: "high" | "medium" | "low";
    description: string;
    mitigation: string;
  }[];
  recommendation: string;
}

function assessApplicationRisk(application: any): RiskAssessment {
  const studentName = `${application.studentFirstName} ${application.studentLastName}`;
  const riskFactors: RiskAssessment["riskFactors"] = [];
  let riskScore = 0;

  // Document Risk
  const documents = application.documents || [];
  const verifiedDocs = documents.filter((d: any) => d.verificationStatus === "verified").length;
  const rejectedDocs = documents.filter((d: any) => d.verificationStatus === "rejected").length;
  
  if (rejectedDocs > 0) {
    riskScore += 25;
    riskFactors.push({
      factor: "Document Issues",
      riskLevel: "high",
      description: `${rejectedDocs} document(s) rejected`,
      mitigation: "Request re-submission of rejected documents"
    });
  } else if (verifiedDocs < 3) {
    riskScore += 15;
    riskFactors.push({
      factor: "Incomplete Documentation",
      riskLevel: "medium",
      description: `Only ${verifiedDocs} documents verified`,
      mitigation: "Follow up for remaining required documents"
    });
  }

  // Academic Risk
  if (application.previousMarks) {
    const marks = parseFloat(application.previousMarks);
    if (marks < 40) {
      riskScore += 20;
      riskFactors.push({
        factor: "Academic Performance",
        riskLevel: "high",
        description: `Previous marks (${marks}%) below passing threshold`,
        mitigation: "Consider additional academic support requirements"
      });
    } else if (marks < 60) {
      riskScore += 10;
      riskFactors.push({
        factor: "Academic Performance",
        riskLevel: "medium",
        description: `Previous marks (${marks}%) below average`,
        mitigation: "Monitor academic progress after admission"
      });
    }
  }

  // Screening Risk
  if (application.entranceTestScore) {
    const testScore = parseFloat(application.entranceTestScore);
    if (testScore < 35) {
      riskScore += 20;
      riskFactors.push({
        factor: "Entrance Test Performance",
        riskLevel: "high",
        description: `Test score (${testScore}%) significantly below standard`,
        mitigation: "Re-evaluate admission eligibility"
      });
    } else if (testScore < 50) {
      riskScore += 10;
      riskFactors.push({
        factor: "Entrance Test Performance",
        riskLevel: "medium",
        description: `Test score (${testScore}%) below average`,
        mitigation: "Consider remedial support if admitted"
      });
    }
  }

  // Process Risk - Application Age
  const appDate = new Date(application.applicationDate);
  const daysSince = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSince > 45 && !["enrolled", "rejected", "withdrawn"].includes(application.status)) {
    riskScore += 15;
    riskFactors.push({
      factor: "Process Delay",
      riskLevel: "medium",
      description: `Application pending for ${daysSince} days`,
      mitigation: "Expedite processing to prevent dropout"
    });
  }

  // Communication Risk
  if (!application.fatherEmail && !application.motherContact) {
    riskScore += 15;
    riskFactors.push({
      factor: "Communication Gap",
      riskLevel: "medium",
      description: "Limited contact information available",
      mitigation: "Obtain additional contact details"
    });
  }

  // Determine overall risk level
  let overallRiskLevel: RiskAssessment["overallRiskLevel"];
  if (riskScore >= 50) {
    overallRiskLevel = "high";
  } else if (riskScore >= 25) {
    overallRiskLevel = "medium";
  } else {
    overallRiskLevel = "low";
  }

  let recommendation = "";
  if (overallRiskLevel === "high") {
    recommendation = "High-risk application requiring careful review. Address critical factors before proceeding.";
  } else if (overallRiskLevel === "medium") {
    recommendation = "Moderate risk factors present. Monitor and address issues proactively.";
  } else {
    recommendation = "Low-risk application. Standard processing recommended.";
  }

  return {
    applicationId: application.id,
    applicationNumber: application.applicationNumber,
    studentName,
    overallRiskLevel,
    riskScore: Math.min(100, riskScore),
    riskFactors,
    recommendation
  };
}

// AI Capacity Planning (v2.5.0)
interface CapacityPlanning {
  grades: {
    gradeId: string;
    gradeName: string;
    totalSeats: number;
    currentOccupancy: number;
    projectedDemand: number;
    recommendation: "increase" | "maintain" | "decrease";
    suggestedSeats: number;
    reasoning: string;
  }[];
  overallRecommendation: string;
  projectedEnrollment: number;
}

function generateCapacityPlanning(applications: any[], seatConfigs: any[]): CapacityPlanning {
  const grades: CapacityPlanning["grades"] = [];
  let totalProjectedEnrollment = 0;

  // Group applications by grade
  const appsByGrade = new Map<string, any[]>();
  applications.forEach(app => {
    const grade = app.gradeAppliedFor;
    if (!appsByGrade.has(grade)) {
      appsByGrade.set(grade, []);
    }
    appsByGrade.get(grade)!.push(app);
  });

  seatConfigs.forEach(config => {
    const gradeApps = appsByGrade.get(config.gradeId) || [];
    const enrolled = gradeApps.filter(a => a.status === "enrolled").length;
    const pending = gradeApps.filter(a => 
      !["enrolled", "rejected", "withdrawn"].includes(a.status)
    ).length;
    
    // Calculate demand based on applications and pipeline
    const projectedDemand = enrolled + Math.round(pending * 0.6); // 60% conversion assumption
    const occupancyRate = (enrolled / config.totalSeats) * 100;
    const demandRate = (projectedDemand / config.totalSeats) * 100;

    let recommendation: "increase" | "maintain" | "decrease";
    let suggestedSeats = config.totalSeats;
    let reasoning = "";

    if (demandRate > 90) {
      recommendation = "increase";
      suggestedSeats = Math.ceil(projectedDemand * 1.2);
      reasoning = `High demand (${Math.round(demandRate)}%) - increase capacity to accommodate waitlist`;
    } else if (demandRate < 50 && occupancyRate < 50) {
      recommendation = "decrease";
      suggestedSeats = Math.max(10, Math.ceil(projectedDemand * 1.1));
      reasoning = `Low demand (${Math.round(demandRate)}%) - consider reducing capacity`;
    } else {
      recommendation = "maintain";
      suggestedSeats = config.totalSeats;
      reasoning = `Balanced demand (${Math.round(demandRate)}%) - current capacity adequate`;
    }

    grades.push({
      gradeId: config.gradeId,
      gradeName: config.gradeName,
      totalSeats: config.totalSeats,
      currentOccupancy: enrolled,
      projectedDemand,
      recommendation,
      suggestedSeats,
      reasoning
    });

    totalProjectedEnrollment += projectedDemand;
  });

  // Overall recommendation
  const highDemandGrades = grades.filter(g => g.recommendation === "increase").length;
  const lowDemandGrades = grades.filter(g => g.recommendation === "decrease").length;

  let overallRecommendation = "Capacity is well-balanced across grades.";
  if (highDemandGrades > grades.length / 2) {
    overallRecommendation = "Multiple grades showing high demand. Consider overall capacity expansion.";
  } else if (lowDemandGrades > grades.length / 2) {
    overallRecommendation = "Demand is lower than capacity. Focus on marketing and outreach.";
  }

  return {
    grades,
    overallRecommendation,
    projectedEnrollment: totalProjectedEnrollment
  };
}

// AI NLP Search (v2.6.0)
interface NLPSearchResult {
  query: string;
  interpretation: string;
  applications: {
    id: string;
    applicationNumber: string;
    studentName: string;
    grade: string;
    status: string;
    relevanceScore: number;
    matchedFields: string[];
  }[];
  suggestions: string[];
  totalMatches: number;
}

function performNLPSearch(query: string, applications: any[]): NLPSearchResult {
  const lowerQuery = query.toLowerCase().trim();
  const matchedApplications: NLPSearchResult["applications"] = [];
  let interpretation = "";
  const suggestions: string[] = [];

  // Parse query intent
  const statusKeywords: Record<string, string[]> = {
    enrolled: ["enrolled", "admitted", "accepted students", "finalized"],
    pending: ["pending", "waiting", "in progress", "processing"],
    rejected: ["rejected", "declined", "not accepted", "failed"],
    waitlisted: ["waitlist", "waiting list", "on hold"],
    interview_completed: ["interviewed", "interview done", "interview completed"],
    entrance_test_completed: ["tested", "test done", "exam completed"],
    offer_extended: ["offered", "got offer", "offer sent"],
    documents_pending: ["documents needed", "docs pending", "missing documents"],
  };

  const gradeKeywords: Record<string, string[]> = {
    nursery: ["nursery", "pre-school", "playgroup"],
    lkg: ["lkg", "lower kg", "junior kg"],
    ukg: ["ukg", "upper kg", "senior kg"],
    grade1: ["grade 1", "class 1", "first grade", "1st grade"],
    grade2: ["grade 2", "class 2", "second grade", "2nd grade"],
    grade3: ["grade 3", "class 3", "third grade", "3rd grade"],
    grade4: ["grade 4", "class 4", "fourth grade", "4th grade"],
    grade5: ["grade 5", "class 5", "fifth grade", "5th grade"],
  };

  // Detect status filter
  let statusFilter: string | null = null;
  for (const [status, keywords] of Object.entries(statusKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      statusFilter = status;
      interpretation += `Status: ${status}. `;
      break;
    }
  }

  // Detect grade filter
  let gradeFilter: string | null = null;
  for (const [grade, keywords] of Object.entries(gradeKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      gradeFilter = grade;
      interpretation += `Grade: ${grade}. `;
      break;
    }
  }

  // Detect name search
  const namePatterns = [
    /(?:find|search|show|get)\s+(?:student\s+)?(?:named?\s+)?(\w+)/i,
    /(?:applications?\s+for)\s+(\w+)/i,
    /(\w+)'s?\s+application/i,
  ];

  let nameSearch: string | null = null;
  for (const pattern of namePatterns) {
    const match = lowerQuery.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      nameSearch = match[1].toLowerCase();
      interpretation += `Name contains: "${nameSearch}". `;
      break;
    }
  }

  // Detect score-based queries
  let scoreFilter: { type: "high" | "low" | null; threshold: number } = { type: null, threshold: 0 };
  if (lowerQuery.includes("high score") || lowerQuery.includes("top performer")) {
    scoreFilter = { type: "high", threshold: 70 };
    interpretation += "High performers (score > 70%). ";
  } else if (lowerQuery.includes("low score") || lowerQuery.includes("struggling")) {
    scoreFilter = { type: "low", threshold: 40 };
    interpretation += "Low performers (score < 40%). ";
  }

  // Filter and score applications
  applications.forEach(app => {
    let relevanceScore = 0;
    const matchedFields: string[] = [];
    const studentName = `${app.studentFirstName} ${app.studentLastName}`.toLowerCase();

    // Status match
    if (statusFilter && app.status === statusFilter) {
      relevanceScore += 40;
      matchedFields.push("status");
    }

    // Grade match
    if (gradeFilter && app.gradeAppliedFor === gradeFilter) {
      relevanceScore += 30;
      matchedFields.push("grade");
    }

    // Name match
    if (nameSearch && (studentName.includes(nameSearch) || 
        app.applicationNumber.toLowerCase().includes(nameSearch))) {
      relevanceScore += 50;
      matchedFields.push("name");
    }

    // Score match
    if (scoreFilter.type) {
      const testScore = parseFloat(app.entranceTestScore || "0");
      if (scoreFilter.type === "high" && testScore >= scoreFilter.threshold) {
        relevanceScore += 30;
        matchedFields.push("entranceTestScore");
      } else if (scoreFilter.type === "low" && testScore > 0 && testScore < scoreFilter.threshold) {
        relevanceScore += 30;
        matchedFields.push("entranceTestScore");
      }
    }

    // General text search fallback
    if (relevanceScore === 0) {
      const searchableText = `${studentName} ${app.applicationNumber} ${app.fatherName} ${app.motherName} ${app.gradeAppliedFor}`.toLowerCase();
      const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
      queryWords.forEach(word => {
        if (searchableText.includes(word)) {
          relevanceScore += 15;
          matchedFields.push("general");
        }
      });
    }

    if (relevanceScore > 0) {
      matchedApplications.push({
        id: app.id,
        applicationNumber: app.applicationNumber,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        grade: app.gradeAppliedFor,
        status: app.status,
        relevanceScore: Math.min(100, relevanceScore),
        matchedFields: [...new Set(matchedFields)]
      });
    }
  });

  // Sort by relevance
  matchedApplications.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Generate suggestions
  if (matchedApplications.length === 0) {
    suggestions.push("Try searching by student name, status, or grade");
    suggestions.push("Example: 'show enrolled students in grade 5'");
    suggestions.push("Example: 'find applications for John'");
  } else if (matchedApplications.length > 10) {
    suggestions.push("Try adding more filters to narrow results");
  }

  if (!interpretation) {
    interpretation = "General search across all application fields.";
  }

  return {
    query,
    interpretation: interpretation.trim(),
    applications: matchedApplications.slice(0, 20),
    suggestions,
    totalMatches: matchedApplications.length
  };
}

// AI Sentiment Analysis (v2.6.0)
interface SentimentAnalysis {
  applicationId: string;
  studentName: string;
  overallSentiment: "positive" | "neutral" | "negative" | "mixed";
  sentimentScore: number;
  analysis: {
    aspect: string;
    sentiment: "positive" | "neutral" | "negative";
    confidence: number;
    excerpt: string;
  }[];
  insights: string[];
  hasInterviewNotes: boolean;
}

function analyzeInterviewSentiment(application: any): SentimentAnalysis {
  const studentName = `${application.studentFirstName} ${application.studentLastName}`;
  const analysis: SentimentAnalysis["analysis"] = [];
  const insights: string[] = [];
  let sentimentScore = 50; // Neutral baseline

  const interviewNotes = application.interviewNotes || "";
  const hasInterviewNotes = interviewNotes.length > 0;

  if (!hasInterviewNotes) {
    return {
      applicationId: application.id,
      studentName,
      overallSentiment: "neutral",
      sentimentScore: 50,
      analysis: [],
      insights: ["No interview notes available for sentiment analysis"],
      hasInterviewNotes: false
    };
  }

  const lowerNotes = interviewNotes.toLowerCase();

  // Positive indicators
  const positiveWords = [
    "excellent", "outstanding", "impressive", "confident", "articulate",
    "enthusiastic", "bright", "capable", "polite", "respectful",
    "engaged", "curious", "well-prepared", "mature", "focused",
    "cooperative", "friendly", "positive", "strong", "good"
  ];

  // Negative indicators  
  const negativeWords = [
    "poor", "weak", "struggling", "nervous", "shy", "reluctant",
    "unprepared", "distracted", "confused", "disinterested", "rude",
    "immature", "unfocused", "uncooperative", "concern", "issue",
    "problem", "difficult", "challenge", "lacking"
  ];

  // Neutral indicators
  const neutralWords = [
    "average", "moderate", "okay", "satisfactory", "acceptable",
    "normal", "standard", "typical"
  ];

  // Analyze presence of sentiment words
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  positiveWords.forEach(word => {
    if (lowerNotes.includes(word)) {
      positiveCount++;
      const excerptMatch = interviewNotes.match(new RegExp(`.{0,30}${word}.{0,30}`, "i"));
      if (excerptMatch && analysis.filter(a => a.aspect === "Communication").length < 3) {
        analysis.push({
          aspect: "Communication",
          sentiment: "positive",
          confidence: 85,
          excerpt: excerptMatch[0].trim()
        });
      }
    }
  });

  negativeWords.forEach(word => {
    if (lowerNotes.includes(word)) {
      negativeCount++;
      const excerptMatch = interviewNotes.match(new RegExp(`.{0,30}${word}.{0,30}`, "i"));
      if (excerptMatch && analysis.filter(a => a.aspect === "Concerns").length < 3) {
        analysis.push({
          aspect: "Concerns",
          sentiment: "negative",
          confidence: 80,
          excerpt: excerptMatch[0].trim()
        });
      }
    }
  });

  neutralWords.forEach(word => {
    if (lowerNotes.includes(word)) {
      neutralCount++;
    }
  });

  // Calculate sentiment score
  const totalWords = positiveCount + negativeCount + neutralCount;
  if (totalWords > 0) {
    sentimentScore = Math.round(
      ((positiveCount * 100) + (neutralCount * 50) + (negativeCount * 0)) / totalWords
    );
  }

  // Analyze academic indicators
  if (lowerNotes.includes("academically strong") || lowerNotes.includes("good grades") || 
      lowerNotes.includes("excellent student")) {
    analysis.push({
      aspect: "Academic Potential",
      sentiment: "positive",
      confidence: 90,
      excerpt: "Shows strong academic potential"
    });
    sentimentScore += 10;
  }

  // Analyze parent engagement
  if (lowerNotes.includes("parent") || lowerNotes.includes("family")) {
    if (lowerNotes.includes("supportive") || lowerNotes.includes("involved") || 
        lowerNotes.includes("engaged parents")) {
      analysis.push({
        aspect: "Family Support",
        sentiment: "positive",
        confidence: 85,
        excerpt: "Strong family engagement indicated"
      });
      sentimentScore += 5;
    }
  }

  // Determine overall sentiment
  let overallSentiment: SentimentAnalysis["overallSentiment"];
  if (sentimentScore >= 70) {
    overallSentiment = "positive";
    insights.push("Interview notes indicate a positive impression of the candidate");
  } else if (sentimentScore <= 30) {
    overallSentiment = "negative";
    insights.push("Interview notes suggest concerns about the candidate");
  } else if (positiveCount > 0 && negativeCount > 0) {
    overallSentiment = "mixed";
    insights.push("Interview notes show both positive and negative aspects");
  } else {
    overallSentiment = "neutral";
    insights.push("Interview notes are mostly neutral in tone");
  }

  // Add score-based insights
  if (application.interviewScore) {
    const score = parseFloat(application.interviewScore);
    if (score >= 70 && overallSentiment === "positive") {
      insights.push("High interview score aligns with positive notes - strong candidate");
    } else if (score < 50 && overallSentiment === "negative") {
      insights.push("Low score reflects concerns noted in interview");
    } else if (score >= 70 && overallSentiment === "negative") {
      insights.push("Discrepancy: high score but negative notes - review recommended");
    }
  }

  return {
    applicationId: application.id,
    studentName,
    overallSentiment,
    sentimentScore: Math.min(100, Math.max(0, sentimentScore)),
    analysis: analysis.slice(0, 5),
    insights,
    hasInterviewNotes: true
  };
}

// AI Smart Scheduling (v2.6.0)
interface SmartScheduling {
  recommendations: {
    applicationId: string;
    applicationNumber: string;
    studentName: string;
    eventType: "entrance_test" | "interview";
    suggestedDate: string;
    suggestedTime: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
  }[];
  optimalSlots: {
    date: string;
    timeSlots: string[];
    capacity: number;
    available: number;
  }[];
  insights: string[];
  pendingCount: {
    entranceTests: number;
    interviews: number;
  };
}

function generateSmartScheduling(applications: any[]): SmartScheduling {
  const recommendations: SmartScheduling["recommendations"] = [];
  const insights: string[] = [];

  // Find applications needing scheduling
  const needsTest = applications.filter(a => a.status === "documents_verified");
  const needsInterview = applications.filter(a => a.status === "entrance_test_completed");

  // Generate next 7 days for scheduling
  const optimalSlots: SmartScheduling["optimalSlots"] = [];
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = date.toISOString().split("T")[0];
    
    // Check how many events already scheduled for this date
    const scheduledTests = applications.filter(a => 
      a.entranceTestDate === dateStr && a.status === "entrance_test_scheduled"
    ).length;
    
    const scheduledInterviews = applications.filter(a => 
      a.interviewDate === dateStr && a.status === "interview_scheduled"
    ).length;
    
    const capacity = 10; // Max events per day
    const used = scheduledTests + scheduledInterviews;
    
    optimalSlots.push({
      date: dateStr,
      timeSlots: ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"],
      capacity,
      available: Math.max(0, capacity - used)
    });
  }

  // Sort optimal slots by availability
  const bestSlots = optimalSlots.filter(s => s.available > 0).sort((a, b) => b.available - a.available);

  // Generate recommendations for entrance tests
  needsTest.forEach((app, index) => {
    const appDate = new Date(app.applicationDate);
    const daysSinceApp = Math.floor((Date.now() - appDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let priority: "high" | "medium" | "low" = "medium";
    let reasoning = "Ready for entrance test scheduling";
    
    if (daysSinceApp > 14) {
      priority = "high";
      reasoning = `Application pending ${daysSinceApp} days - prioritize scheduling`;
    } else if (daysSinceApp > 7) {
      priority = "medium";
      reasoning = "Documents verified, schedule within this week";
    } else {
      priority = "low";
      reasoning = "Recently verified, can schedule at convenience";
    }

    const slotIndex = Math.min(index, bestSlots.length - 1);
    const suggestedSlot = bestSlots[slotIndex] || optimalSlots[0];
    
    if (suggestedSlot) {
      recommendations.push({
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        eventType: "entrance_test",
        suggestedDate: suggestedSlot.date,
        suggestedTime: suggestedSlot.timeSlots[index % suggestedSlot.timeSlots.length],
        reasoning,
        priority
      });
    }
  });

  // Generate recommendations for interviews
  needsInterview.forEach((app, index) => {
    const testScore = parseFloat(app.entranceTestScore || "0");
    
    let priority: "high" | "medium" | "low" = "medium";
    let reasoning = "Test completed, ready for interview";
    
    if (testScore >= 70) {
      priority = "high";
      reasoning = `High test score (${testScore}%) - prioritize interview scheduling`;
    } else if (testScore >= 50) {
      priority = "medium";
      reasoning = `Good test score (${testScore}%) - schedule interview soon`;
    } else {
      priority = "low";
      reasoning = `Test score (${testScore}%) - schedule when slots available`;
    }

    const slotIndex = Math.min(index + needsTest.length, bestSlots.length - 1);
    const suggestedSlot = bestSlots[slotIndex] || optimalSlots[1] || optimalSlots[0];
    
    if (suggestedSlot) {
      recommendations.push({
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        studentName: `${app.studentFirstName} ${app.studentLastName}`,
        eventType: "interview",
        suggestedDate: suggestedSlot.date,
        suggestedTime: suggestedSlot.timeSlots[(index + 3) % suggestedSlot.timeSlots.length],
        reasoning,
        priority
      });
    }
  });

  // Sort by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Generate insights
  if (needsTest.length > 5) {
    insights.push(`${needsTest.length} applications awaiting entrance tests - consider batch scheduling`);
  }
  if (needsInterview.length > 3) {
    insights.push(`${needsInterview.length} students ready for interviews - allocate interview panel`);
  }
  if (bestSlots.length === 0) {
    insights.push("All upcoming slots fully booked - consider extending hours or adding days");
  } else {
    const totalAvailable = bestSlots.reduce((sum, s) => sum + s.available, 0);
    insights.push(`${totalAvailable} slots available across ${bestSlots.length} days`);
  }

  const highPriorityCount = recommendations.filter(r => r.priority === "high").length;
  if (highPriorityCount > 0) {
    insights.push(`${highPriorityCount} high-priority scheduling items need immediate attention`);
  }

  return {
    recommendations: recommendations.slice(0, 20),
    optimalSlots,
    insights,
    pendingCount: {
      entranceTests: needsTest.length,
      interviews: needsInterview.length
    }
  };
}
