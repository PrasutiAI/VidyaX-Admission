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
