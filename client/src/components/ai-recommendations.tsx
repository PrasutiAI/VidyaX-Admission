import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

  const isLoading = recLoading || eligLoading || docLoading;

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
        <CardContent className="space-y-4">
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
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {docSuggestions.suggestions
                  .filter(s => s.status !== "verified")
                  .slice(0, 5)
                  .map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                      <span>{s.documentType}</span>
                      <Badge variant="outline" className={`${statusColors[s.status]} text-xs border-0`}>
                        {s.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
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
