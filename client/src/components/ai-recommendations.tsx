import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Loader2,
  Target,
  Clock,
  Zap,
  BarChart3,
  ListChecks
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AIRecommendation {
  type: "action" | "warning" | "info";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestedAction?: string;
}

interface AIRecommendationsData {
  recommendations: AIRecommendation[];
  summary: string;
}

interface EligibilityScoreData {
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

interface DocumentSuggestion {
  documentType: string;
  status: "missing" | "pending" | "verified" | "rejected";
  suggestion: string;
  priority: "required" | "recommended" | "optional";
}

interface DocumentSuggestionsData {
  suggestions: DocumentSuggestion[];
  completeness: number;
}

interface NextStep {
  step: number;
  action: string;
  description: string;
  estimatedTime: string;
  priority: "immediate" | "soon" | "later";
  automated: boolean;
}

interface NextStepsData {
  steps: NextStep[];
  currentPhase: string;
  progressPercent: number;
}

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

const typeIcons = {
  action: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const typeColors = {
  action: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
};

const priorityColors = {
  high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const statusColors = {
  missing: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  verified: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const confidenceColors = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-red-600",
};

const stepPriorityColors = {
  immediate: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  soon: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  later: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const outcomeColors = {
  likely_enroll: "text-emerald-600 dark:text-emerald-400",
  moderate_chance: "text-amber-600 dark:text-amber-400",
  unlikely: "text-red-600 dark:text-red-400",
  undetermined: "text-slate-600 dark:text-slate-400",
};

const outcomeLabels = {
  likely_enroll: "Likely to Enroll",
  moderate_chance: "Moderate Chance",
  unlikely: "Unlikely",
  undetermined: "Undetermined",
};

export function AIRecommendationsPanel({ applicationId }: { applicationId: string }) {
  const { data: recommendations, isLoading: recLoading } = useQuery<AIRecommendationsData>({
    queryKey: ["/api/ai/recommendations", applicationId],
    enabled: !!applicationId,
  });

  const { data: eligibility, isLoading: eligLoading } = useQuery<EligibilityScoreData>({
    queryKey: ["/api/ai/eligibility-score", applicationId],
    enabled: !!applicationId,
  });

  const { data: docSuggestions, isLoading: docLoading } = useQuery<DocumentSuggestionsData>({
    queryKey: ["/api/ai/document-suggestions", applicationId],
    enabled: !!applicationId,
  });

  const { data: nextSteps, isLoading: stepsLoading } = useQuery<NextStepsData>({
    queryKey: ["/api/ai/next-steps", applicationId],
    enabled: !!applicationId,
  });

  const { data: prediction, isLoading: predLoading } = useQuery<PredictiveOutcome>({
    queryKey: ["/api/ai/predictive-outcome", applicationId],
    enabled: !!applicationId,
  });

  const isLoading = recLoading || eligLoading || docLoading || stepsLoading || predLoading;

  if (isLoading) {
    return (
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <CardTitle className="text-lg font-medium">AI Analysis</CardTitle>
          </div>
          <CardDescription>Analyzing application...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-card-border bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">AI Insights</CardTitle>
          </div>
          <CardDescription>
            {recommendations?.summary || "Smart recommendations for this application"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview" className="text-xs" data-testid="tab-ai-overview">
                <BarChart3 className="h-3 w-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="steps" className="text-xs" data-testid="tab-ai-steps">
                <ListChecks className="h-3 w-3 mr-1" />
                Next Steps
              </TabsTrigger>
              <TabsTrigger value="prediction" className="text-xs" data-testid="tab-ai-prediction">
                <Target className="h-3 w-3 mr-1" />
                Prediction
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-xs" data-testid="tab-ai-docs">
                <FileCheck className="h-3 w-3 mr-1" />
                Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {eligibility && (
                <div className="rounded-lg bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Eligibility Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{eligibility.overallScore}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <Progress value={eligibility.overallScore} className="h-2" />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {eligibility.breakdown.map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">{item.category}</span>
                        <span className="font-medium">{item.score}/{item.maxScore}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className={`${confidenceColors[eligibility.confidence]} text-xs border-current`}>
                        {eligibility.confidence.toUpperCase()} Confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{eligibility.recommendation}</p>
                  </div>
                </div>
              )}

              {nextSteps && (
                <div className="rounded-lg bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Progress</span>
                    </div>
                    <Badge variant="outline">{nextSteps.currentPhase}</Badge>
                  </div>
                  <Progress value={nextSteps.progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">{nextSteps.progressPercent}% complete</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="steps" className="space-y-4">
              {nextSteps && nextSteps.steps.length > 0 ? (
                <div className="rounded-lg bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Next Actions</span>
                    </div>
                    <Badge variant="outline">{nextSteps.currentPhase}</Badge>
                  </div>
                  <div className="space-y-3">
                    {nextSteps.steps.map((step, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        data-testid={`next-step-${index}`}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {step.step}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{step.action}</span>
                            <Badge variant="outline" className={`${stepPriorityColors[step.priority]} text-xs border-0`}>
                              {step.priority}
                            </Badge>
                            {step.automated && (
                              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-0">
                                <Zap className="h-3 w-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{step.estimatedTime}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pending actions</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="prediction" className="space-y-4">
              {prediction && (
                <div className="rounded-lg bg-background p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Enrollment Prediction</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{prediction.enrollmentProbability}%</span>
                      <p className={`text-xs font-medium ${outcomeColors[prediction.predictedOutcome]}`}>
                        {outcomeLabels[prediction.predictedOutcome]}
                      </p>
                    </div>
                  </div>
                  <Progress value={prediction.enrollmentProbability} className="h-3" />
                  
                  {prediction.factors.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <span className="text-xs font-medium text-muted-foreground">Contributing Factors</span>
                      {prediction.factors.map((factor, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            {factor.impact === "positive" && <TrendingUp className="h-3 w-3 text-emerald-600" />}
                            {factor.impact === "negative" && <AlertTriangle className="h-3 w-3 text-red-600" />}
                            {factor.impact === "neutral" && <Info className="h-3 w-3 text-slate-600" />}
                            <span>{factor.factor}</span>
                          </div>
                          <span className={`font-medium ${factor.weight >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {factor.weight > 0 ? '+' : ''}{factor.weight}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {prediction.insights.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <span className="text-xs font-medium text-muted-foreground">Insights</span>
                      {prediction.insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-blue-50 dark:bg-blue-950">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-700 dark:text-blue-300">{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              {docSuggestions && (
                <div className="rounded-lg bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Document Status</span>
                    </div>
                    <Badge variant={docSuggestions.completeness >= 70 ? "default" : "secondary"}>
                      {docSuggestions.completeness}% Complete
                    </Badge>
                  </div>
                  <Progress value={docSuggestions.completeness} className="h-2" />
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {docSuggestions.suggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span>{s.documentType}</span>
                          {s.priority === "required" && (
                            <span className="text-xs text-red-600">*</span>
                          )}
                        </div>
                        <Badge variant="outline" className={`${statusColors[s.status]} text-xs border-0`}>
                          {s.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-red-600">*</span> Required documents
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {recommendations && recommendations.recommendations.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Recommended Actions</CardTitle>
            <CardDescription>Based on current application status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.recommendations.map((rec, index) => {
              const Icon = typeIcons[rec.type];
              return (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                  data-testid={`ai-recommendation-${index}`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${typeColors[rec.type]}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{rec.title}</span>
                      <Badge variant="outline" className={`${priorityColors[rec.priority]} text-xs border-0`}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    {rec.suggestedAction && (
                      <div className="flex items-center gap-1 text-xs text-primary mt-2">
                        <ArrowRight className="h-3 w-3" />
                        <span>{rec.suggestedAction}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DashboardInsight {
  type: "alert" | "trend" | "recommendation" | "success";
  title: string;
  description: string;
  metric?: string;
  action?: string;
}

interface DashboardInsightsData {
  insights: DashboardInsight[];
  summary: string;
}

const insightIcons = {
  alert: AlertTriangle,
  trend: TrendingUp,
  recommendation: Sparkles,
  success: CheckCircle2,
};

const insightColors = {
  alert: "text-red-600 dark:text-red-400",
  trend: "text-blue-600 dark:text-blue-400",
  recommendation: "text-purple-600 dark:text-purple-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

export function AIDashboardInsights() {
  const { data, isLoading } = useQuery<DashboardInsightsData>({
    queryKey: ["/api/ai/dashboard-insights"],
  });

  if (isLoading) {
    return (
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <CardTitle className="text-lg font-medium">AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.insights.length === 0) {
    return null;
  }

  return (
    <Card className="border-card-border bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">AI Insights</CardTitle>
          </div>
          <CardDescription>{data.summary}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.insights.slice(0, 5).map((insight, index) => {
            const Icon = insightIcons[insight.type];
            return (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg bg-background"
                data-testid={`dashboard-insight-${index}`}
              >
                <Icon className={`h-5 w-5 mt-0.5 ${insightColors[insight.type]}`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-sm">{insight.title}</span>
                    {insight.metric && (
                      <Badge variant="outline" className="text-xs">
                        {insight.metric}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  {insight.action && (
                    <div className="flex items-center gap-1 text-xs text-primary mt-1">
                      <ArrowRight className="h-3 w-3" />
                      <span>{insight.action}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
