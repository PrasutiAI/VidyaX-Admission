import OpenAI from "openai";
import type { AdmissionApplication, ApplicationDocument } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;

const openai = isOpenAIConfigured 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

async function callOpenAI<T>(prompt: string, systemPrompt: string): Promise<T | null> {
  if (!isOpenAIConfigured || !openai) {
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;
    
    return JSON.parse(content) as T;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}

export async function getAIRecommendations(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): Promise<AIRecommendation[]> {
  const systemPrompt = `You are an AI admission counselor for an educational institution. Analyze the application and provide actionable recommendations. Respond with JSON in this format:
{
  "recommendations": [
    {
      "type": "action" | "warning" | "info",
      "priority": "high" | "medium" | "low",
      "title": "string",
      "description": "string",
      "suggestedAction": "string"
    }
  ]
}`;

  const prompt = `Analyze this admission application and provide recommendations:

Student: ${application.studentFirstName} ${application.studentLastName}
Grade Applied: ${application.gradeAppliedFor}
Status: ${application.status}
Documents Uploaded: ${documents.length}
Documents Verified: ${documents.filter(d => d.verificationStatus === 'verified').length}
Documents Pending: ${documents.filter(d => d.verificationStatus === 'pending').length}
Entrance Test Score: ${application.entranceTestScore || 'Not taken'}
Interview Score: ${application.interviewScore || 'Not conducted'}
Previous School: ${application.previousSchoolName || 'Not provided'}
Previous Marks: ${application.previousMarks || 'Not provided'}

Provide 3-5 specific, actionable recommendations based on the current state of this application.`;

  const result = await callOpenAI<{ recommendations: AIRecommendation[] }>(prompt, systemPrompt);
  
  if (result?.recommendations) {
    return result.recommendations.map(r => ({
      ...r,
      confidence: 0.85,
      aiModel: "gpt-5"
    }));
  }

  return generateFallbackRecommendations(application, documents);
}

export async function getAIEligibilityScore(
  application: AdmissionApplication,
  documents: ApplicationDocument[],
  weights: { documentCompleteness: number; academicBackground: number; entranceTestScore: number; interviewScore: number }
): Promise<AIEligibilityScore> {
  const systemPrompt = `You are an AI admission scoring system. Calculate an eligibility score (0-100) based on the application data and provided weights. Respond with JSON in this format:
{
  "totalScore": number,
  "breakdown": {
    "documentCompleteness": number,
    "academicBackground": number,
    "entranceTestScore": number,
    "interviewScore": number
  },
  "recommendation": "string explaining the score"
}`;

  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  const totalDocs = documents.length;
  
  const prompt = `Calculate eligibility score for this application:

Student: ${application.studentFirstName} ${application.studentLastName}
Grade Applied: ${application.gradeAppliedFor}

Document Status: ${verifiedDocs}/${totalDocs} verified
Previous Academic Marks: ${application.previousMarks || 'Not provided'}%
Entrance Test Score: ${application.entranceTestScore || 'Not taken'}/100
Interview Score: ${application.interviewScore || 'Not conducted'}/100

Scoring Weights:
- Document Completeness: ${weights.documentCompleteness}%
- Academic Background: ${weights.academicBackground}%
- Entrance Test: ${weights.entranceTestScore}%
- Interview: ${weights.interviewScore}%

Calculate scores for each category (0-25 points each based on weight) and provide a total score.`;

  const result = await callOpenAI<{ totalScore: number; breakdown: any; recommendation: string }>(prompt, systemPrompt);
  
  if (result) {
    return {
      ...result,
      confidence: 0.9,
      aiModel: "gpt-5"
    };
  }

  return generateFallbackEligibilityScore(application, documents, weights);
}

export async function getAIPredictiveOutcome(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): Promise<AIPredictiveOutcome> {
  const systemPrompt = `You are an AI enrollment prediction system. Predict the likelihood of successful enrollment based on the application data. Respond with JSON in this format:
{
  "enrollmentProbability": number (0-100),
  "riskLevel": "low" | "medium" | "high",
  "factors": [
    { "factor": "string", "impact": "positive" | "negative" | "neutral", "weight": number }
  ],
  "recommendation": "string"
}`;

  const prompt = `Predict enrollment outcome for this application:

Student: ${application.studentFirstName} ${application.studentLastName}
Status: ${application.status}
Application Date: ${application.applicationDate}
Documents: ${documents.length} uploaded, ${documents.filter(d => d.verificationStatus === 'verified').length} verified
Previous School: ${application.previousSchoolName || 'N/A'}
Previous Marks: ${application.previousMarks || 'N/A'}%
Entrance Test: ${application.entranceTestScore || 'N/A'}/100
Interview: ${application.interviewScore || 'N/A'}/100

Analyze all factors and provide enrollment probability prediction.`;

  const result = await callOpenAI<{ enrollmentProbability: number; riskLevel: "low" | "medium" | "high"; factors: any[]; recommendation: string }>(prompt, systemPrompt);
  
  if (result) {
    return {
      ...result,
      confidence: 0.82,
      aiModel: "gpt-5"
    };
  }

  return generateFallbackPredictiveOutcome(application, documents);
}

export async function getAISentimentAnalysis(
  interviewNotes: string
): Promise<AISentimentAnalysis> {
  const systemPrompt = `You are an AI sentiment analysis expert for educational admissions. Analyze interview notes and determine the overall sentiment. Respond with JSON in this format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "score": number (-1 to 1, where -1 is very negative and 1 is very positive),
  "keywords": ["array", "of", "key", "words"],
  "summary": "brief summary of the sentiment"
}`;

  const prompt = `Analyze the sentiment of these interview notes:

"${interviewNotes}"

Provide sentiment analysis with keywords and summary.`;

  const result = await callOpenAI<{ sentiment: "positive" | "neutral" | "negative"; score: number; keywords: string[]; summary: string }>(prompt, systemPrompt);
  
  if (result) {
    return {
      ...result,
      confidence: 0.88,
      aiModel: "gpt-5"
    };
  }

  return generateFallbackSentimentAnalysis(interviewNotes);
}

export async function getAIDecisionSupport(
  application: AdmissionApplication,
  documents: ApplicationDocument[]
): Promise<AIDecisionSupport> {
  const systemPrompt = `You are an AI admission decision support system. Analyze the application and provide a recommendation with reasoning. Respond with JSON in this format:
{
  "recommendation": "approve" | "reject" | "waitlist" | "review",
  "reasoning": ["array", "of", "reasoning", "points"],
  "strengths": ["array", "of", "strengths"],
  "concerns": ["array", "of", "concerns"]
}`;

  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  
  const prompt = `Provide admission decision support for this application:

Student: ${application.studentFirstName} ${application.studentLastName}
Grade Applied: ${application.gradeAppliedFor}
Current Status: ${application.status}
Documents: ${verifiedDocs}/${documents.length} verified
Previous School: ${application.previousSchoolName || 'N/A'}
Previous Marks: ${application.previousMarks || 'N/A'}%
Entrance Test Score: ${application.entranceTestScore || 'N/A'}/100
Interview Score: ${application.interviewScore || 'N/A'}/100
Interview Notes: ${application.interviewNotes || 'N/A'}

Analyze all factors and provide a decision recommendation.`;

  const result = await callOpenAI<{ recommendation: "approve" | "reject" | "waitlist" | "review"; reasoning: string[]; strengths: string[]; concerns: string[] }>(prompt, systemPrompt);
  
  if (result) {
    return {
      ...result,
      confidence: 0.85,
      aiModel: "gpt-5"
    };
  }

  return generateFallbackDecisionSupport(application, documents);
}

export async function getAICommunicationTemplate(
  application: AdmissionApplication,
  templateType: string
): Promise<{ subject: string; body: string; variables: Record<string, string> } | null> {
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

  return await callOpenAI<{ subject: string; body: string; variables: Record<string, string> }>(prompt, systemPrompt);
}

export async function getAIInterviewPreparation(
  application: AdmissionApplication
): Promise<{ questions: string[]; tips: string[]; focusAreas: string[] } | null> {
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

  return await callOpenAI<{ questions: string[]; tips: string[]; focusAreas: string[] }>(prompt, systemPrompt);
}

export async function getAINLPSearch(
  query: string,
  applications: AdmissionApplication[]
): Promise<{ matches: { id: string; relevance: number; reason: string }[]; interpretation: string } | null> {
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

  const prompt = `Search query: "${query}"

Available applications:
${JSON.stringify(appSummaries, null, 2)}

Find applications that match this query and rank by relevance.`;

  return await callOpenAI<{ matches: { id: string; relevance: number; reason: string }[]; interpretation: string }>(prompt, systemPrompt);
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
      aiModel: "rule-based"
    });
  }

  if (!application.entranceTestScore && application.status === 'documents_verified') {
    recommendations.push({
      type: "action",
      priority: "medium",
      title: "Schedule Entrance Test",
      description: "Documents verified. Student is ready for entrance test scheduling.",
      suggestedAction: "Schedule entrance test",
      confidence: 0.9,
      aiModel: "rule-based"
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
      aiModel: "rule-based"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "info",
      priority: "low",
      title: "Application On Track",
      description: "Application is progressing normally through the admission process.",
      confidence: 0.8,
      aiModel: "rule-based"
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
    aiModel: "rule-based"
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
    confidence: 0.7,
    aiModel: "rule-based"
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
    confidence: 0.6,
    aiModel: "rule-based"
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
    confidence: 0.7,
    aiModel: "rule-based"
  };
}

export { isOpenAIConfigured };
