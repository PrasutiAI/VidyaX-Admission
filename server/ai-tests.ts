import {
  getAIRecommendations,
  getAIEligibilityScore,
  getAIPredictiveOutcome,
  getAISentimentAnalysis,
  getAIDecisionSupport,
  getAIAuditLog,
  getAIConfig,
  isOpenAIConfigured,
  type AIRecommendation,
  type AIEligibilityScore,
  type AIPredictiveOutcome,
  type AISentimentAnalysis,
  type AIDecisionSupport,
} from "./openai";
import type { AdmissionApplication, ApplicationDocument } from "@shared/schema";

export interface AITestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  errors?: string[];
}

export interface AITestSuite {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: AITestResult[];
  executedAt: string;
  aiConfigured: boolean;
}

const syntheticApplications: Partial<AdmissionApplication>[] = [
  {
    id: "test-1",
    applicationNumber: "APP-2025-00001",
    studentFirstName: "Test",
    studentLastName: "Student",
    gradeAppliedFor: "grade5",
    status: "documents_verified",
    previousSchoolName: "ABC School",
    previousMarks: "85",
    entranceTestScore: null,
    interviewScore: null,
  },
  {
    id: "test-2",
    applicationNumber: "APP-2025-00002",
    studentFirstName: "Demo",
    studentLastName: "Applicant",
    gradeAppliedFor: "grade8",
    status: "interview_completed",
    previousSchoolName: "XYZ Academy",
    previousMarks: "72",
    entranceTestScore: "78",
    interviewScore: "82",
    interviewNotes: "The student showed excellent communication skills and was well prepared. Very confident and articulate.",
  },
  {
    id: "test-3",
    applicationNumber: "APP-2025-00003",
    studentFirstName: "Sample",
    studentLastName: "Candidate",
    gradeAppliedFor: "grade1",
    status: "application_submitted",
    previousSchoolName: null,
    previousMarks: null,
    entranceTestScore: null,
    interviewScore: null,
  },
];

const syntheticDocuments: Partial<ApplicationDocument>[][] = [
  [
    { id: "doc-1", documentType: "birth_certificate", verificationStatus: "verified" },
    { id: "doc-2", documentType: "address_proof", verificationStatus: "verified" },
    { id: "doc-3", documentType: "previous_report_card", verificationStatus: "verified" },
  ],
  [
    { id: "doc-4", documentType: "birth_certificate", verificationStatus: "verified" },
    { id: "doc-5", documentType: "address_proof", verificationStatus: "verified" },
    { id: "doc-6", documentType: "transfer_certificate", verificationStatus: "pending" },
    { id: "doc-7", documentType: "previous_report_card", verificationStatus: "verified" },
  ],
  [],
];

const defaultWeights = {
  documentCompleteness: 25,
  academicBackground: 25,
  entranceTestScore: 25,
  interviewScore: 25,
};

async function testRecommendations(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const app = syntheticApplications[0] as AdmissionApplication;
    const docs = syntheticDocuments[0] as ApplicationDocument[];
    
    const recommendations = await getAIRecommendations(app, docs);
    
    if (!Array.isArray(recommendations)) {
      errors.push("Recommendations should be an array");
    }
    
    if (recommendations.length === 0) {
      errors.push("Should return at least one recommendation");
    }
    
    for (const rec of recommendations) {
      if (!rec.type || !["action", "warning", "info"].includes(rec.type)) {
        errors.push(`Invalid recommendation type: ${rec.type}`);
      }
      if (!rec.priority || !["high", "medium", "low"].includes(rec.priority)) {
        errors.push(`Invalid recommendation priority: ${rec.priority}`);
      }
      if (!rec.title || rec.title.length === 0) {
        errors.push("Recommendation should have a title");
      }
      if (typeof rec.confidence !== "number" || rec.confidence < 0 || rec.confidence > 1) {
        errors.push(`Invalid confidence: ${rec.confidence}`);
      }
      if (!rec.aiModel) {
        errors.push("Recommendation should have aiModel identifier");
      }
    }
    
    return {
      testName: "AI Recommendations",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Generated ${recommendations.length} recommendations`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "AI Recommendations",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testEligibilityScore(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const app = syntheticApplications[1] as AdmissionApplication;
    const docs = syntheticDocuments[1] as ApplicationDocument[];
    
    const score = await getAIEligibilityScore(app, docs, defaultWeights);
    
    if (typeof score.totalScore !== "number") {
      errors.push("totalScore should be a number");
    }
    
    if (score.totalScore < 0 || score.totalScore > 100) {
      errors.push(`totalScore should be between 0-100: ${score.totalScore}`);
    }
    
    if (!score.breakdown) {
      errors.push("Score should have breakdown");
    } else {
      const breakdownKeys = ["documentCompleteness", "academicBackground", "entranceTestScore", "interviewScore"];
      for (const key of breakdownKeys) {
        if (typeof score.breakdown[key as keyof typeof score.breakdown] !== "number") {
          errors.push(`Breakdown should have ${key}`);
        }
      }
    }
    
    if (!score.recommendation || score.recommendation.length === 0) {
      errors.push("Score should have recommendation text");
    }
    
    if (typeof score.confidence !== "number") {
      errors.push("Score should have confidence");
    }
    
    if (!score.aiModel) {
      errors.push("Score should have aiModel identifier");
    }
    
    return {
      testName: "AI Eligibility Score",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Score: ${score.totalScore}/100, Confidence: ${(score.confidence * 100).toFixed(1)}%`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "AI Eligibility Score",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testPredictiveOutcome(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const app = syntheticApplications[1] as AdmissionApplication;
    const docs = syntheticDocuments[1] as ApplicationDocument[];
    
    const outcome = await getAIPredictiveOutcome(app, docs);
    
    if (typeof outcome.enrollmentProbability !== "number") {
      errors.push("enrollmentProbability should be a number");
    }
    
    if (outcome.enrollmentProbability < 0 || outcome.enrollmentProbability > 100) {
      errors.push(`enrollmentProbability should be 0-100: ${outcome.enrollmentProbability}`);
    }
    
    if (!["low", "medium", "high"].includes(outcome.riskLevel)) {
      errors.push(`Invalid riskLevel: ${outcome.riskLevel}`);
    }
    
    if (!Array.isArray(outcome.factors)) {
      errors.push("factors should be an array");
    }
    
    if (!outcome.recommendation) {
      errors.push("Should have recommendation text");
    }
    
    if (typeof outcome.confidence !== "number") {
      errors.push("Should have confidence");
    }
    
    if (!outcome.aiModel) {
      errors.push("Should have aiModel identifier");
    }
    
    return {
      testName: "AI Predictive Outcome",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Probability: ${outcome.enrollmentProbability}%, Risk: ${outcome.riskLevel}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "AI Predictive Outcome",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testSentimentAnalysis(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const positiveNotes = "The student was excellent and showed great enthusiasm. Very impressive communication skills.";
    const sentiment = await getAISentimentAnalysis(positiveNotes);
    
    if (!["positive", "neutral", "negative"].includes(sentiment.sentiment)) {
      errors.push(`Invalid sentiment: ${sentiment.sentiment}`);
    }
    
    if (typeof sentiment.score !== "number" || sentiment.score < -1 || sentiment.score > 1) {
      errors.push(`Invalid sentiment score: ${sentiment.score}`);
    }
    
    if (!Array.isArray(sentiment.keywords)) {
      errors.push("keywords should be an array");
    }
    
    if (!sentiment.summary) {
      errors.push("Should have summary");
    }
    
    if (typeof sentiment.confidence !== "number") {
      errors.push("Should have confidence");
    }
    
    if (!sentiment.aiModel) {
      errors.push("Should have aiModel identifier");
    }
    
    if (sentiment.sentiment !== "positive") {
      errors.push(`Expected positive sentiment for positive notes, got: ${sentiment.sentiment}`);
    }
    
    return {
      testName: "AI Sentiment Analysis",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Sentiment: ${sentiment.sentiment}, Score: ${sentiment.score.toFixed(2)}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "AI Sentiment Analysis",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testDecisionSupport(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const app = syntheticApplications[1] as AdmissionApplication;
    const docs = syntheticDocuments[1] as ApplicationDocument[];
    
    const decision = await getAIDecisionSupport(app, docs);
    
    if (!["approve", "reject", "waitlist", "review"].includes(decision.recommendation)) {
      errors.push(`Invalid recommendation: ${decision.recommendation}`);
    }
    
    if (!Array.isArray(decision.reasoning)) {
      errors.push("reasoning should be an array");
    }
    
    if (!Array.isArray(decision.strengths)) {
      errors.push("strengths should be an array");
    }
    
    if (!Array.isArray(decision.concerns)) {
      errors.push("concerns should be an array");
    }
    
    if (typeof decision.confidence !== "number") {
      errors.push("Should have confidence");
    }
    
    if (!decision.aiModel) {
      errors.push("Should have aiModel identifier");
    }
    
    return {
      testName: "AI Decision Support",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Recommendation: ${decision.recommendation}, Confidence: ${(decision.confidence * 100).toFixed(1)}%`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "AI Decision Support",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testFallbackSystem(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const app = syntheticApplications[2] as AdmissionApplication;
    const docs = syntheticDocuments[2] as ApplicationDocument[];
    
    const recommendations = await getAIRecommendations(app, docs);
    const score = await getAIEligibilityScore(app, docs, defaultWeights);
    const outcome = await getAIPredictiveOutcome(app, docs);
    
    if (recommendations.length === 0) {
      errors.push("Fallback should provide recommendations");
    }
    
    if (typeof score.totalScore !== "number") {
      errors.push("Fallback should provide eligibility score");
    }
    
    if (typeof outcome.enrollmentProbability !== "number") {
      errors.push("Fallback should provide predictive outcome");
    }
    
    const hasAiModel = recommendations.every(r => r.aiModel) && score.aiModel && outcome.aiModel;
    if (!hasAiModel) {
      errors.push("All results should have aiModel identifier");
    }
    
    const allFallback = recommendations.every(r => r.aiModel.includes("rule-based")) &&
                        score.aiModel.includes("rule-based") &&
                        outcome.aiModel.includes("rule-based");
    
    if (!isOpenAIConfigured && !allFallback) {
      errors.push("When OpenAI not configured, all results should use rule-based fallback");
    }
    
    for (const rec of recommendations) {
      if (rec.confidence < 0.5) {
        errors.push(`Fallback recommendation confidence too low: ${rec.confidence}`);
      }
    }
    if (score.confidence < 0.5) {
      errors.push(`Fallback score confidence too low: ${score.confidence}`);
    }
    if (outcome.confidence < 0.5) {
      errors.push(`Fallback outcome confidence too low: ${outcome.confidence}`);
    }
    
    return {
      testName: "Fallback System",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Fallback system: ${allFallback ? "rule-based" : "AI-powered"}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "Fallback System",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testAuditLogging(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const initialLogCount = getAIAuditLog().length;
    
    const app = syntheticApplications[0] as AdmissionApplication;
    const docs = syntheticDocuments[0] as ApplicationDocument[];
    
    await getAIRecommendations(app, docs);
    
    const finalLogCount = getAIAuditLog().length;
    
    if (finalLogCount <= initialLogCount) {
      errors.push("Audit log should have new entries after AI call");
    }
    
    const latestLog = getAIAuditLog()[getAIAuditLog().length - 1];
    
    if (!latestLog.timestamp) {
      errors.push("Audit entry should have timestamp");
    }
    
    if (!latestLog.feature) {
      errors.push("Audit entry should have feature name");
    }
    
    if (!latestLog.model) {
      errors.push("Audit entry should have model identifier");
    }
    
    if (typeof latestLog.confidence !== "number") {
      errors.push("Audit entry should have confidence");
    }
    
    if (typeof latestLog.latencyMs !== "number") {
      errors.push("Audit entry should have latency");
    }
    
    if (typeof latestLog.fallbackUsed !== "boolean") {
      errors.push("Audit entry should have fallbackUsed flag");
    }
    
    return {
      testName: "Audit Logging",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Audit log entries: ${finalLogCount}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "Audit Logging",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

async function testConfigAccess(): Promise<AITestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    const config = getAIConfig();
    
    if (!config.model) {
      errors.push("Config should have model");
    }
    
    if (!config.version) {
      errors.push("Config should have version");
    }
    
    if (!config.confidenceThresholds) {
      errors.push("Config should have confidenceThresholds");
    }
    
    if (typeof config.fallbackEnabled !== "boolean") {
      errors.push("Config should have fallbackEnabled");
    }
    
    if (typeof config.auditEnabled !== "boolean") {
      errors.push("Config should have auditEnabled");
    }
    
    if (typeof config.piiProtection !== "boolean") {
      errors.push("Config should have piiProtection");
    }
    
    return {
      testName: "Config Access",
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      details: `Model: ${config.model}, Version: ${config.version}`,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      testName: "Config Access",
      passed: false,
      duration: Date.now() - startTime,
      details: "Test failed with exception",
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

export async function runAITestSuite(): Promise<AITestSuite> {
  const startTime = Date.now();
  
  const results = await Promise.all([
    testRecommendations(),
    testEligibilityScore(),
    testPredictiveOutcome(),
    testSentimentAnalysis(),
    testDecisionSupport(),
    testFallbackSystem(),
    testAuditLogging(),
    testConfigAccess(),
  ]);
  
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  
  return {
    suiteName: "AI Feature Test Suite",
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    executedAt: new Date().toISOString(),
    aiConfigured: isOpenAIConfigured,
  };
}

export function getAIHealthStatus(): {
  status: "healthy" | "degraded" | "unavailable";
  aiConfigured: boolean;
  fallbackAvailable: boolean;
  auditEnabled: boolean;
  config: ReturnType<typeof getAIConfig>;
  recentAuditEntries: number;
} {
  const config = getAIConfig();
  const auditLog = getAIAuditLog();
  const recentEntries = auditLog.filter(
    entry => new Date(entry.timestamp) > new Date(Date.now() - 3600000)
  ).length;
  
  let status: "healthy" | "degraded" | "unavailable" = "healthy";
  
  if (!isOpenAIConfigured) {
    status = "degraded";
  }
  
  const recentFallbacks = auditLog.filter(
    entry => 
      new Date(entry.timestamp) > new Date(Date.now() - 3600000) &&
      entry.fallbackUsed
  ).length;
  
  if (recentFallbacks > recentEntries * 0.5) {
    status = "degraded";
  }
  
  return {
    status,
    aiConfigured: isOpenAIConfigured,
    fallbackAvailable: config.fallbackEnabled,
    auditEnabled: config.auditEnabled,
    config,
    recentAuditEntries: recentEntries,
  };
}
