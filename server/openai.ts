import OpenAI from "openai";
import type { AdmissionApplication, ApplicationDocument } from "@shared/schema";

const AI_CONFIG = {
  model: "gpt-4o-mini",
  version: "3.2.1",
  maxTokens: 512,
  temperature: 0.3,
  confidenceThresholds: {
    recommendations: 0.70,
    eligibility: 0.75,
    prediction: 0.65,
    decision: 0.80,
    sentiment: 0.70,
  },
  fallbackEnabled: true,
  auditEnabled: true,
  piiProtection: true,
  cacheEnabled: true,
  cacheTTLMs: 5 * 60 * 1000,
  maxCacheEntries: 500,
  batchSize: 10,
};

interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

let cacheHitCount = 0;
let cacheMissCount = 0;

export function getCacheStats(): CacheStats {
  let oldestTimestamp = Infinity;
  let newestTimestamp = 0;
  let oldestKey: string | null = null;
  let newestKey: string | null = null;
  
  for (const [key, entry] of aiCache.entries()) {
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
      oldestKey = key;
    }
    if (entry.timestamp > newestTimestamp) {
      newestTimestamp = entry.timestamp;
      newestKey = key;
    }
  }
  
  const totalRequests = cacheHitCount + cacheMissCount;
  return {
    totalEntries: aiCache.size,
    hitCount: cacheHitCount,
    missCount: cacheMissCount,
    hitRate: totalRequests > 0 ? Math.round((cacheHitCount / totalRequests) * 100) : 0,
    oldestEntry: oldestKey,
    newestEntry: newestKey,
  };
}

const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;

const openai = isOpenAIConfigured 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const aiCache = new Map<string, CacheEntry<any>>();

function getCacheKey(feature: string, applicationId?: string, dataHash?: string): string {
  return `${feature}:${applicationId || 'global'}:${dataHash || 'default'}`;
}

function getFromCache<T>(key: string): T | null {
  if (!AI_CONFIG.cacheEnabled) {
    cacheMissCount++;
    return null;
  }
  const entry = aiCache.get(key);
  if (!entry) {
    cacheMissCount++;
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    aiCache.delete(key);
    cacheMissCount++;
    return null;
  }
  cacheHitCount++;
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  if (!AI_CONFIG.cacheEnabled) return;
  const now = Date.now();
  aiCache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + AI_CONFIG.cacheTTLMs,
  });
  if (aiCache.size > 500) {
    const keysToDelete: string[] = [];
    for (const [k, v] of aiCache.entries()) {
      if (Date.now() > v.expiresAt) keysToDelete.push(k);
    }
    keysToDelete.forEach(k => aiCache.delete(k));
  }
}

function createAppSummary(app: AdmissionApplication): string {
  return `${app.studentFirstName} ${app.studentLastName}|${app.gradeAppliedFor}|${app.status}|test:${app.entranceTestScore || 'N'}|int:${app.interviewScore || 'N'}|prev:${app.previousMarks || 'N'}%`;
}

function createDocSummary(docs: ApplicationDocument[]): string {
  const v = docs.filter(d => d.verificationStatus === 'verified').length;
  const p = docs.filter(d => d.verificationStatus === 'pending').length;
  return `${v}v/${p}p/${docs.length}t`;
}

function getDocUpdateHash(docs: ApplicationDocument[]): number {
  if (!docs.length) return 0;
  return Math.max(...docs.map(d => d.updatedAt ? new Date(d.updatedAt).getTime() : 0));
}

export interface AIRecommendation {
  type: "action" | "warning" | "info";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestedAction?: string;
  confidence: number;
  aiModel: string;
}

export interface AIEligibilityScore {
  totalScore: number;
  breakdown: {
    documentCompleteness: number;
    academicBackground: number;
    entranceTestScore: number;
    interviewScore: number;
  };
  recommendation: string;
  confidence: number;
  aiModel: string;
}

export interface AIPredictiveOutcome {
  enrollmentProbability: number;
  riskLevel: "low" | "medium" | "high";
  factors: { factor: string; impact: "positive" | "negative" | "neutral"; weight: number }[];
  recommendation: string;
  confidence: number;
  aiModel: string;
}

export interface AISentimentAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  keywords: string[];
  summary: string;
  confidence: number;
  aiModel: string;
}

export interface AIDecisionSupport {
  recommendation: "approve" | "reject" | "waitlist" | "review";
  reasoning: string[];
  strengths: string[];
  concerns: string[];
  confidence: number;
  aiModel: string;
}

export interface AIAuditEntry {
  timestamp: string;
  feature: string;
  applicationId?: string;
  model: string;
  inputSummary: string;
  outputSummary: string;
  confidence: number;
  latencyMs: number;
  fallbackUsed: boolean;
  error?: string;
}

const aiAuditLog: AIAuditEntry[] = [];

function sanitizePII(text: string): string {
  if (!AI_CONFIG.piiProtection) return text;
  
  let sanitized = text;
  
  sanitized = sanitized.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]");
  
  sanitized = sanitized.replace(/\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, "[PHONE_REDACTED]");
  sanitized = sanitized.replace(/\b\d{10}\b/g, "[PHONE_REDACTED]");
  
  sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[AADHAAR_REDACTED]");
  
  sanitized = sanitized.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, "[PAN_REDACTED]");
  
  sanitized = sanitized.replace(/\bpassport\s*[:\s]?\s*[A-Z]{1,2}\d{6,8}\b/gi, "[PASSPORT_REDACTED]");
  
  sanitized = sanitized.replace(/\b\d{6}\b/g, "[PINCODE_REDACTED]");
  
  sanitized = sanitized.replace(/guardian[^:]*:\s*[^,\n]+/gi, "[GUARDIAN_INFO_REDACTED]");
  sanitized = sanitized.replace(/father[^:]*:\s*[^,\n]+/gi, "[PARENT_INFO_REDACTED]");
  sanitized = sanitized.replace(/mother[^:]*:\s*[^,\n]+/gi, "[PARENT_INFO_REDACTED]");
  sanitized = sanitized.replace(/parent[^:]*:\s*[^,\n]+/gi, "[PARENT_INFO_REDACTED]");
  
  sanitized = sanitized.replace(/address[^:]*:\s*[^,\n]+/gi, "[ADDRESS_REDACTED]");
  
  return sanitized;
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizePII(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    const sensitiveKeys = ['email', 'phone', 'mobile', 'address', 'guardian', 'father', 'mother', 'parent', 'aadhaar', 'pan', 'passport'];
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  return obj;
}

function logAICall(entry: AIAuditEntry): void {
  if (!AI_CONFIG.auditEnabled) return;
  
  aiAuditLog.push(entry);
  
  if (aiAuditLog.length > 1000) {
    aiAuditLog.splice(0, 100);
  }
  
  console.log(`[AI Audit] ${entry.feature} | Model: ${entry.model} | Confidence: ${(entry.confidence * 100).toFixed(1)}% | Latency: ${entry.latencyMs}ms${entry.fallbackUsed ? ' | FALLBACK' : ''}`);
}

export function getAIAuditLog(): AIAuditEntry[] {
  return [...aiAuditLog];
}

export function getAIConfig(): typeof AI_CONFIG {
  return { ...AI_CONFIG };
}

async function callOpenAI<T>(
  prompt: string, 
  systemPrompt: string,
  feature: string,
  applicationId?: string
): Promise<{ result: T | null; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  
  if (!isOpenAIConfigured || !openai) {
    return { result: null, latencyMs: Date.now() - startTime, error: "OpenAI not configured" };
  }

  try {
    const sanitizedPrompt = sanitizePII(prompt);
    
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sanitizedPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const content = response.choices[0].message.content;
    const latencyMs = Date.now() - startTime;
    
    if (!content) {
      return { result: null, latencyMs, error: "Empty response from OpenAI" };
    }
    
    const parsed = JSON.parse(content) as T;
    return { result: parsed, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[AI Error] ${feature}: ${errorMessage}`);
    return { result: null, latencyMs, error: errorMessage };
  }
}

export async function getAIRecommendations(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): Promise<AIRecommendation[]> {
  const startTime = Date.now();
  const feature = "recommendations";
  
  const appUpdated = application.updatedAt ? new Date(application.updatedAt).getTime() : 0;
  const docUpdated = getDocUpdateHash(documents);
  const dataHash = `${application.status}:${createDocSummary(documents)}:${application.entranceTestScore}:${application.interviewScore}:${appUpdated}:${docUpdated}`;
  const cacheKey = getCacheKey(feature, application.id, dataHash);
  const cached = getFromCache<AIRecommendation[]>(cacheKey);
  if (cached) {
    logAICall({
      timestamp: new Date().toISOString(),
      feature,
      applicationId: application.id,
      model: "cache",
      inputSummary: `Application ${application.applicationNumber} (cached)`,
      outputSummary: `${cached.length} recommendations from cache`,
      confidence: 0.95,
      latencyMs: Date.now() - startTime,
      fallbackUsed: false,
    });
    return cached;
  }
  
  const systemPrompt = `You are an AI admission counselor. Analyze applications and provide actionable recommendations. Output JSON: {"recommendations":[{"type":"action|warning|info","priority":"high|medium|low","title":"brief title","description":"detailed explanation","suggestedAction":"next step"}],"confidence":0.85}`;

  const prompt = `Student: ${application.studentFirstName} ${application.studentLastName}
Grade: ${application.gradeAppliedFor} | Status: ${application.status}
Test: ${application.entranceTestScore || 'N/A'} | Interview: ${application.interviewScore || 'N/A'}
Docs: ${createDocSummary(documents)} | Previous: ${application.previousSchoolName || 'N/A'}
Provide 3-5 actionable recommendations for this admission application.`;

  const { result, latencyMs, error } = await callOpenAI<{ recommendations: AIRecommendation[]; confidence?: number }>(
    prompt, 
    systemPrompt,
    feature,
    application.id
  );
  
  let recommendations: AIRecommendation[];
  let confidence = 0.85;
  let usedFallback = false;
  
  if (result?.recommendations) {
    confidence = result.confidence || 0.85;
    if (confidence >= AI_CONFIG.confidenceThresholds.recommendations) {
      recommendations = result.recommendations.map(r => ({
        ...r,
        confidence,
        aiModel: `${AI_CONFIG.model}-v${AI_CONFIG.version}`
      }));
    } else {
      recommendations = generateFallbackRecommendations(application, documents);
      usedFallback = true;
    }
  } else {
    recommendations = generateFallbackRecommendations(application, documents);
    usedFallback = true;
    confidence = 0.75;
  }

  setCache(cacheKey, recommendations);

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    applicationId: application.id,
    model: usedFallback ? "rule-based" : AI_CONFIG.model,
    inputSummary: `Application ${application.applicationNumber}, Status: ${application.status}`,
    outputSummary: `${recommendations.length} recommendations generated`,
    confidence,
    latencyMs,
    fallbackUsed: usedFallback,
    error,
  });

  return recommendations;
}

export async function getAIEligibilityScore(
  application: AdmissionApplication,
  documents: ApplicationDocument[],
  weights: { documentCompleteness: number; academicBackground: number; entranceTestScore: number; interviewScore: number }
): Promise<AIEligibilityScore> {
  const startTime = Date.now();
  const feature = "eligibility-score";
  
  const appUpdated = application.updatedAt ? new Date(application.updatedAt).getTime() : 0;
  const docUpdated = getDocUpdateHash(documents);
  const dataHash = `${createDocSummary(documents)}:${application.previousMarks}:${application.entranceTestScore}:${application.interviewScore}:${JSON.stringify(weights)}:${appUpdated}:${docUpdated}`;
  const cacheKey = getCacheKey(feature, application.id, dataHash);
  const cached = getFromCache<AIEligibilityScore>(cacheKey);
  if (cached) {
    logAICall({
      timestamp: new Date().toISOString(),
      feature,
      applicationId: application.id,
      model: "cache",
      inputSummary: `Application ${application.applicationNumber} (cached)`,
      outputSummary: `Score: ${cached.totalScore}/100 from cache`,
      confidence: 0.95,
      latencyMs: Date.now() - startTime,
      fallbackUsed: false,
    });
    return cached;
  }
  
  const systemPrompt = `You are an AI eligibility scoring system. Calculate weighted eligibility score 0-100. Output JSON: {"totalScore":N,"breakdown":{"documentCompleteness":N,"academicBackground":N,"entranceTestScore":N,"interviewScore":N},"recommendation":"assessment text","confidence":0.9}`;

  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  const totalDocs = documents.length;
  
  const prompt = `Calculate eligibility for: ${application.studentFirstName} ${application.studentLastName}
Grade: ${application.gradeAppliedFor} | Docs: ${verifiedDocs}/${totalDocs} verified
Previous Marks: ${application.previousMarks || 'N/A'}% | Test: ${application.entranceTestScore || 'N/A'} | Interview: ${application.interviewScore || 'N/A'}
Weights: doc=${weights.documentCompleteness}, acad=${weights.academicBackground}, test=${weights.entranceTestScore}, int=${weights.interviewScore}`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    totalScore: number; 
    breakdown: any; 
    recommendation: string;
    confidence?: number;
  }>(prompt, systemPrompt, feature, application.id);
  
  let score: AIEligibilityScore;
  let usedFallback = false;
  let confidence = 0.90;
  
  if (result) {
    confidence = result.confidence || 0.90;
    if (confidence >= AI_CONFIG.confidenceThresholds.eligibility) {
      score = {
        ...result,
        confidence,
        aiModel: `${AI_CONFIG.model}-v${AI_CONFIG.version}`
      };
    } else {
      score = generateFallbackEligibilityScore(application, documents, weights);
      usedFallback = true;
    }
  } else {
    score = generateFallbackEligibilityScore(application, documents, weights);
    usedFallback = true;
    confidence = 0.75;
  }

  setCache(cacheKey, score);

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    applicationId: application.id,
    model: usedFallback ? "rule-based" : AI_CONFIG.model,
    inputSummary: `Application ${application.applicationNumber}`,
    outputSummary: `Score: ${score.totalScore}/100`,
    confidence,
    latencyMs,
    fallbackUsed: usedFallback,
    error,
  });

  return score;
}

export async function getAIPredictiveOutcome(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): Promise<AIPredictiveOutcome> {
  const startTime = Date.now();
  const feature = "predictive-outcome";
  
  const appUpdated = application.updatedAt ? new Date(application.updatedAt).getTime() : 0;
  const docUpdated = getDocUpdateHash(documents);
  const dataHash = `${application.status}:${createDocSummary(documents)}:${application.entranceTestScore}:${application.interviewScore}:${appUpdated}:${docUpdated}`;
  const cacheKey = getCacheKey(feature, application.id, dataHash);
  const cached = getFromCache<AIPredictiveOutcome>(cacheKey);
  if (cached) {
    logAICall({
      timestamp: new Date().toISOString(),
      feature,
      applicationId: application.id,
      model: "cache",
      inputSummary: `Application ${application.applicationNumber} (cached)`,
      outputSummary: `Probability: ${cached.enrollmentProbability}% from cache`,
      confidence: 0.95,
      latencyMs: Date.now() - startTime,
      fallbackUsed: false,
    });
    return cached;
  }
  
  const systemPrompt = `You are an AI enrollment predictor. Analyze application data to predict enrollment probability. Output JSON: {"enrollmentProbability":0-100,"riskLevel":"low|medium|high","factors":[{"factor":"description","impact":"positive|negative|neutral","weight":1-10}],"recommendation":"action text","confidence":0.82}`;

  const prompt = `Predict enrollment probability for: ${application.studentFirstName} ${application.studentLastName}
Grade: ${application.gradeAppliedFor} | Status: ${application.status}
Docs: ${createDocSummary(documents)} | Test: ${application.entranceTestScore || 'N/A'} | Interview: ${application.interviewScore || 'N/A'}
Analyze factors and predict likelihood of successful enrollment.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    enrollmentProbability: number; 
    riskLevel: "low" | "medium" | "high"; 
    factors: any[]; 
    recommendation: string;
    confidence?: number;
  }>(prompt, systemPrompt, feature, application.id);
  
  let outcome: AIPredictiveOutcome;
  let usedFallback = false;
  let confidence = 0.82;
  
  if (result) {
    confidence = result.confidence || 0.82;
    if (confidence >= AI_CONFIG.confidenceThresholds.prediction) {
      outcome = {
        ...result,
        confidence,
        aiModel: `${AI_CONFIG.model}-v${AI_CONFIG.version}`
      };
    } else {
      outcome = generateFallbackPredictiveOutcome(application, documents);
      usedFallback = true;
    }
  } else {
    outcome = generateFallbackPredictiveOutcome(application, documents);
    usedFallback = true;
    confidence = 0.70;
  }

  setCache(cacheKey, outcome);

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    applicationId: application.id,
    model: usedFallback ? "rule-based" : AI_CONFIG.model,
    inputSummary: `Application ${application.applicationNumber}, Status: ${application.status}`,
    outputSummary: `Probability: ${outcome.enrollmentProbability}%, Risk: ${outcome.riskLevel}`,
    confidence,
    latencyMs,
    fallbackUsed: usedFallback,
    error,
  });

  return outcome;
}

export async function getAISentimentAnalysis(
  interviewNotes: string
): Promise<AISentimentAnalysis> {
  const startTime = Date.now();
  const feature = "sentiment-analysis";
  
  const systemPrompt = `You are an AI sentiment analysis expert for admissions. Analyze interview notes to determine sentiment. Output JSON: {"sentiment":"positive|neutral|negative","score":-1 to 1,"keywords":["key","words"],"summary":"brief analysis","confidence":0.88}`;

  const sanitizedNotes = sanitizePII(interviewNotes);
  
  const prompt = `Analyze sentiment of these interview notes (truncated to 500 chars):
"${sanitizedNotes.slice(0, 500)}"
Identify sentiment, key indicators, and summarize the overall impression.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    sentiment: "positive" | "neutral" | "negative"; 
    score: number; 
    keywords: string[]; 
    summary: string;
    confidence?: number;
  }>(prompt, systemPrompt, feature);
  
  let sentiment: AISentimentAnalysis;
  let usedFallback = false;
  let confidence = 0.88;
  
  if (result) {
    confidence = result.confidence || 0.88;
    if (confidence >= AI_CONFIG.confidenceThresholds.sentiment) {
      sentiment = {
        ...result,
        confidence,
        aiModel: `${AI_CONFIG.model}-v${AI_CONFIG.version}`
      };
    } else {
      sentiment = generateFallbackSentimentAnalysis(interviewNotes);
      usedFallback = true;
    }
  } else {
    sentiment = generateFallbackSentimentAnalysis(interviewNotes);
    usedFallback = true;
    confidence = 0.60;
  }

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    model: usedFallback ? "rule-based" : AI_CONFIG.model,
    inputSummary: `Interview notes (${interviewNotes.length} chars)`,
    outputSummary: `Sentiment: ${sentiment.sentiment}, Score: ${sentiment.score}`,
    confidence,
    latencyMs,
    fallbackUsed: usedFallback,
    error,
  });

  return sentiment;
}

export async function getAIDecisionSupport(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): Promise<AIDecisionSupport> {
  const startTime = Date.now();
  const feature = "decision-support";
  
  const systemPrompt = `You are an AI admission decision support system. Analyze applications and provide recommendation with reasoning. Output JSON: {"recommendation":"approve|reject|waitlist|review","reasoning":["reason1","reason2"],"strengths":["strength1"],"concerns":["concern1"],"confidence":0.85}`;

  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  
  const prompt = `Provide decision support for: ${application.studentFirstName} ${application.studentLastName}
Grade: ${application.gradeAppliedFor} | Status: ${application.status}
Docs: ${verifiedDocs}/${documents.length} verified | Prev Marks: ${application.previousMarks || 'N/A'}%
Test: ${application.entranceTestScore || 'N/A'}/100 | Interview: ${application.interviewScore || 'N/A'}/100
Notes: ${(application.interviewNotes || 'None').slice(0, 150)}
Analyze and recommend: approve, reject, waitlist, or review with reasoning.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    recommendation: "approve" | "reject" | "waitlist" | "review"; 
    reasoning: string[]; 
    strengths: string[]; 
    concerns: string[];
    confidence?: number;
  }>(prompt, systemPrompt, feature, application.id);
  
  let decision: AIDecisionSupport;
  let usedFallback = false;
  let confidence = 0.85;
  
  if (result) {
    confidence = result.confidence || 0.85;
    if (confidence >= AI_CONFIG.confidenceThresholds.decision) {
      decision = {
        ...result,
        confidence,
        aiModel: `${AI_CONFIG.model}-v${AI_CONFIG.version}`
      };
    } else {
      decision = generateFallbackDecisionSupport(application, documents);
      usedFallback = true;
      console.log(`[AI] Decision confidence ${confidence} below threshold ${AI_CONFIG.confidenceThresholds.decision}, flagging for manual review`);
    }
  } else {
    decision = generateFallbackDecisionSupport(application, documents);
    usedFallback = true;
    confidence = 0.70;
  }

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    applicationId: application.id,
    model: usedFallback ? "rule-based" : AI_CONFIG.model,
    inputSummary: `Application ${application.applicationNumber}`,
    outputSummary: `Recommendation: ${decision.recommendation}, Confidence: ${(confidence * 100).toFixed(1)}%`,
    confidence,
    latencyMs,
    fallbackUsed: usedFallback,
    error,
  });

  return decision;
}

export async function getAICommunicationTemplate(
  application: AdmissionApplication,
  templateType: string
): Promise<{ subject: string; body: string; variables: Record<string, string> } | null> {
  const startTime = Date.now();
  const feature = "communication-template";
  
  const systemPrompt = `You are an AI communication specialist for educational admissions. Generate professional email templates for various admission stages. Respond with JSON in this format:
{
  "subject": "email subject",
  "body": "email body with {{variable}} placeholders",
  "variables": { "variableName": "description" }
}`;

  const prompt = `Generate a ${templateType} email template for:

Student: ${application.studentFirstName} ${application.studentLastName}
Application Number: ${application.applicationNumber}
Grade Applied: ${application.gradeAppliedFor}
Current Status: ${application.status}

Create a professional, warm, and informative email appropriate for this stage of the admission process.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    subject: string; 
    body: string; 
    variables: Record<string, string>;
  }>(prompt, systemPrompt, feature, application.id);

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    applicationId: application.id,
    model: result ? AI_CONFIG.model : "none",
    inputSummary: `Template type: ${templateType}`,
    outputSummary: result ? `Template generated: ${result.subject}` : "No template generated",
    confidence: result ? 0.90 : 0,
    latencyMs,
    fallbackUsed: !result,
    error,
  });

  return result;
}

export async function getAIInterviewPreparation(
  application: AdmissionApplication
): Promise<{ questions: string[]; tips: string[]; focusAreas: string[] } | null> {
  const startTime = Date.now();
  const feature = "interview-preparation";
  
  const systemPrompt = `You are an AI interview preparation specialist for educational admissions. Generate relevant interview questions and tips for admission interviews. Respond with JSON in this format:
{
  "questions": ["array of 5-7 interview questions"],
  "tips": ["array of 3-5 tips for interviewers"],
  "focusAreas": ["array of 3-4 focus areas"]
}`;

  const prompt = `Prepare interview questions and tips for:

Student: ${application.studentFirstName} ${application.studentLastName}
Grade Applied: ${application.gradeAppliedFor}
Previous School: ${application.previousSchoolName || 'N/A'}
Previous Grade: ${application.previousGrade || 'N/A'}
Previous Marks: ${application.previousMarks || 'N/A'}%

Generate age-appropriate interview questions and interviewer tips.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    questions: string[]; 
    tips: string[]; 
    focusAreas: string[];
  }>(prompt, systemPrompt, feature, application.id);

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    applicationId: application.id,
    model: result ? AI_CONFIG.model : "none",
    inputSummary: `Grade: ${application.gradeAppliedFor}`,
    outputSummary: result ? `${result.questions.length} questions generated` : "No questions generated",
    confidence: result ? 0.85 : 0,
    latencyMs,
    fallbackUsed: !result,
    error,
  });

  return result;
}

export async function getAINLPSearch(
  query: string,
  applications: AdmissionApplication[]
): Promise<{ matches: { id: string; relevance: number; reason: string }[]; interpretation: string } | null> {
  const startTime = Date.now();
  const feature = "nlp-search";
  
  if (applications.length === 0) return { matches: [], interpretation: query };

  const systemPrompt = `You are an AI search assistant for educational admissions. Interpret natural language queries and match them to applications. Respond with JSON in this format:
{
  "matches": [{ "id": "application_id", "relevance": 0.0-1.0, "reason": "why this matches" }],
  "interpretation": "how you interpreted the query"
}`;

  const appSummaries = applications.slice(0, 50).map(app => ({
    id: app.id,
    name: `${app.studentFirstName} ${app.studentLastName}`,
    grade: app.gradeAppliedFor,
    status: app.status,
    school: app.previousSchoolName,
  }));

  const prompt = `Search query: "${sanitizePII(query)}"

Available applications:
${JSON.stringify(appSummaries, null, 2)}

Find applications that match this query and rank by relevance.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    matches: { id: string; relevance: number; reason: string }[]; 
    interpretation: string;
  }>(prompt, systemPrompt, feature);

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    model: result ? AI_CONFIG.model : "none",
    inputSummary: `Query: "${query.slice(0, 50)}..."`,
    outputSummary: result ? `${result.matches.length} matches found` : "No matches",
    confidence: result ? 0.80 : 0,
    latencyMs,
    fallbackUsed: !result,
    error,
  });

  return result;
}

export async function getAIDashboardInsights(
  stats: { totalApplications: number; pendingReviews: number; enrolled: number; enrollmentRate: number },
  recentApplications: AdmissionApplication[]
): Promise<{ insights: string[]; alerts: string[]; suggestions: string[] }> {
  const startTime = Date.now();
  const feature = "dashboard-insights";
  
  const systemPrompt = `You are an AI analytics expert for admissions. Analyze dashboard statistics and provide actionable insights. Output JSON: {"insights":["insight1","insight2"],"alerts":["alert if any"],"suggestions":["action1"]}`;

  const statusDist = recentApplications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusStr = Object.entries(statusDist).map(([k, v]) => `${k}:${v}`).join(', ');

  const prompt = `Analyze admission dashboard:
Total: ${stats.totalApplications} | Pending: ${stats.pendingReviews} | Enrolled: ${stats.enrolled} | Rate: ${stats.enrollmentRate}%
Recent Activity: ${recentApplications.length} applications
Status Distribution: ${statusStr}
Provide insights, alerts for concerning trends, and suggestions for the team.`;

  const { result, latencyMs, error } = await callOpenAI<{ 
    insights: string[]; 
    alerts: string[]; 
    suggestions: string[];
  }>(prompt, systemPrompt, feature);

  const defaultInsights = {
    insights: [
      `Total of ${stats.totalApplications} applications in the system`,
      `Current enrollment rate is ${stats.enrollmentRate}%`,
      `${stats.pendingReviews} applications awaiting review`
    ],
    alerts: stats.pendingReviews > 10 ? ["High number of pending reviews"] : [],
    suggestions: ["Review pending applications to improve enrollment rate"]
  };

  logAICall({
    timestamp: new Date().toISOString(),
    feature,
    model: result ? AI_CONFIG.model : "rule-based",
    inputSummary: `Stats: ${stats.totalApplications} total, ${stats.enrolled} enrolled`,
    outputSummary: result ? `${result.insights.length} insights generated` : "Using defaults",
    confidence: result ? 0.85 : 0.70,
    latencyMs,
    fallbackUsed: !result,
    error,
  });

  return result || defaultInsights;
}

function generateFallbackRecommendations(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const pendingDocs = documents.filter(d => d.verificationStatus === 'pending');
  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified');

  if (pendingDocs.length > 0) {
    recommendations.push({
      type: "action",
      priority: "high",
      title: "Documents Pending Verification",
      description: `${pendingDocs.length} document(s) need verification before proceeding.`,
      suggestedAction: "Review and verify pending documents",
      confidence: 0.95,
      aiModel: "rule-based-v3.1.0"
    });
  }

  if (!application.entranceTestScore && application.status === 'documents_verified') {
    recommendations.push({
      type: "action",
      priority: "medium",
      title: "Schedule Entrance Test",
      description: "Documents verified. Student is ready for entrance test scheduling.",
      suggestedAction: "Schedule entrance test",
      confidence: 0.90,
      aiModel: "rule-based-v3.1.0"
    });
  }

  if (application.entranceTestScore && !application.interviewScore) {
    recommendations.push({
      type: "info",
      priority: "medium",
      title: "Interview Pending",
      description: "Entrance test completed. Consider scheduling interview.",
      suggestedAction: "Schedule interview",
      confidence: 0.85,
      aiModel: "rule-based-v3.1.0"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "info",
      priority: "low",
      title: "Application On Track",
      description: "Application is progressing normally through the admission process.",
      confidence: 0.80,
      aiModel: "rule-based-v3.1.0"
    });
  }

  return recommendations;
}

function generateFallbackEligibilityScore(
  application: AdmissionApplication,
  documents: ApplicationDocument[],
  weights: { documentCompleteness: number; academicBackground: number; entranceTestScore: number; interviewScore: number }
): AIEligibilityScore {
  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  const totalDocs = Math.max(documents.length, 1);
  
  const docScore = (verifiedDocs / totalDocs) * weights.documentCompleteness;
  const academicScore = application.previousMarks ? (Number(application.previousMarks) / 100) * weights.academicBackground : 0;
  const testScore = application.entranceTestScore ? (Number(application.entranceTestScore) / 100) * weights.entranceTestScore : 0;
  const interviewScoreVal = application.interviewScore ? (Number(application.interviewScore) / 100) * weights.interviewScore : 0;

  const totalScore = Math.round(docScore + academicScore + testScore + interviewScoreVal);

  return {
    totalScore,
    breakdown: {
      documentCompleteness: Math.round(docScore),
      academicBackground: Math.round(academicScore),
      entranceTestScore: Math.round(testScore),
      interviewScore: Math.round(interviewScoreVal),
    },
    recommendation: totalScore >= 70 ? "Strong candidate for admission" : 
                   totalScore >= 50 ? "Average candidate, consider for waitlist" : 
                   "Needs improvement in multiple areas",
    confidence: 0.75,
    aiModel: "rule-based-v3.1.0"
  };
}

function generateFallbackPredictiveOutcome(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): AIPredictiveOutcome {
  const factors: { factor: string; impact: "positive" | "negative" | "neutral"; weight: number }[] = [];
  let probability = 50;

  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  if (verifiedDocs === documents.length && documents.length > 0) {
    factors.push({ factor: "All documents verified", impact: "positive", weight: 15 });
    probability += 15;
  } else if (verifiedDocs === 0) {
    factors.push({ factor: "No documents verified", impact: "negative", weight: -20 });
    probability -= 20;
  }

  if (application.entranceTestScore) {
    const score = Number(application.entranceTestScore);
    if (score >= 80) {
      factors.push({ factor: "High entrance test score", impact: "positive", weight: 20 });
      probability += 20;
    } else if (score < 50) {
      factors.push({ factor: "Low entrance test score", impact: "negative", weight: -15 });
      probability -= 15;
    }
  }

  if (application.interviewScore) {
    const score = Number(application.interviewScore);
    if (score >= 80) {
      factors.push({ factor: "Excellent interview performance", impact: "positive", weight: 15 });
      probability += 15;
    }
  }

  probability = Math.max(0, Math.min(100, probability));

  return {
    enrollmentProbability: probability,
    riskLevel: probability >= 70 ? "low" : probability >= 40 ? "medium" : "high",
    factors,
    recommendation: probability >= 70 ? "High likelihood of enrollment" : "Monitor application progress",
    confidence: 0.70,
    aiModel: "rule-based-v3.1.0"
  };
}

function generateFallbackSentimentAnalysis(interviewNotes: string): AISentimentAnalysis {
  const positiveWords = ["excellent", "great", "good", "impressive", "confident", "prepared", "articulate", "enthusiastic"];
  const negativeWords = ["poor", "weak", "unprepared", "nervous", "hesitant", "unclear", "lacking"];

  const lowerNotes = interviewNotes.toLowerCase();
  const positiveCount = positiveWords.filter(w => lowerNotes.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerNotes.includes(w)).length;

  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let score = 0;

  if (positiveCount > negativeCount) {
    sentiment = "positive";
    score = Math.min(1, 0.3 + (positiveCount * 0.2));
  } else if (negativeCount > positiveCount) {
    sentiment = "negative";
    score = Math.max(-1, -0.3 - (negativeCount * 0.2));
  }

  return {
    sentiment,
    score,
    keywords: [...positiveWords.filter(w => lowerNotes.includes(w)), ...negativeWords.filter(w => lowerNotes.includes(w))],
    summary: `Interview notes have ${sentiment} sentiment based on keyword analysis.`,
    confidence: 0.60,
    aiModel: "rule-based-v3.1.0"
  };
}

function generateFallbackDecisionSupport(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): AIDecisionSupport {
  const strengths: string[] = [];
  const concerns: string[] = [];

  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  if (verifiedDocs === documents.length && documents.length > 0) {
    strengths.push("All documents verified");
  } else {
    concerns.push(`${documents.length - verifiedDocs} documents pending verification`);
  }

  if (application.entranceTestScore && Number(application.entranceTestScore) >= 70) {
    strengths.push("Good entrance test performance");
  } else if (application.entranceTestScore && Number(application.entranceTestScore) < 50) {
    concerns.push("Below average entrance test score");
  }

  if (application.interviewScore && Number(application.interviewScore) >= 70) {
    strengths.push("Positive interview performance");
  }

  if (application.previousMarks && Number(application.previousMarks) >= 80) {
    strengths.push("Strong academic background");
  }

  let recommendation: "approve" | "reject" | "waitlist" | "review" = "review";
  if (strengths.length >= 3 && concerns.length === 0) {
    recommendation = "approve";
  } else if (concerns.length >= 2) {
    recommendation = strengths.length > 0 ? "waitlist" : "reject";
  }

  return {
    recommendation,
    reasoning: [
      `${strengths.length} strength(s) identified`,
      `${concerns.length} concern(s) identified`,
      `Overall application ${recommendation === "approve" ? "meets" : "requires review of"} admission criteria`
    ],
    strengths,
    concerns,
    confidence: 0.70,
    aiModel: "rule-based-v3.1.0"
  };
}

export { isOpenAIConfigured, AI_CONFIG };
