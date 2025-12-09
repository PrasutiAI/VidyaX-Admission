import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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
      const cycle = await storage.createAdmissionCycle(req.body);
      res.status(201).json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admission/cycles/:id", async (req, res) => {
    try {
      const cycle = await storage.updateAdmissionCycle(req.params.id, req.body);
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
      const { status } = req.body;
      const cycle = await storage.updateAdmissionCycleStatus(req.params.id, status);
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
      const config = await storage.createSeatConfig({
        ...req.body,
        admissionCycleId: req.params.id,
      });
      res.status(201).json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admission/cycles/:cycleId/seats/:gradeId", async (req, res) => {
    try {
      const config = await storage.updateSeatConfig(req.params.cycleId, req.params.gradeId, req.body);
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
      const application = await storage.createApplication(req.body);
      res.status(201).json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/admission/applications/:id", async (req, res) => {
    try {
      const application = await storage.updateApplication(req.params.id, req.body);
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
      const { status, remarks } = req.body;
      const application = await storage.updateApplicationStatus(req.params.id, status, remarks);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Screening - Entrance Test
  app.put("/api/admission/applications/:id/entrance-test/score", async (req, res) => {
    try {
      const { date, score } = req.body;
      const application = await storage.updateApplication(req.params.id, {
        entranceTestDate: date,
        entranceTestScore: score,
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
      const { date, score, notes } = req.body;
      const application = await storage.updateApplication(req.params.id, {
        interviewDate: date,
        interviewScore: score,
        interviewNotes: notes,
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
      const document = await storage.createApplicationDocument({
        ...req.body,
        applicationId: req.params.id,
      });
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

  return httpServer;
}
