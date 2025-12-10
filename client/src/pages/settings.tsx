import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Moon, 
  Sun, 
  Monitor, 
  GraduationCap, 
  Clock, 
  FileText, 
  Bell, 
  Settings2, 
  Save,
  Building2,
  Brain,
  Workflow,
  Scale,
  DollarSign,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

interface InstitutionConfig {
  id?: string;
  institutionName: string;
  institutionType: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
}

interface ScoringWeights {
  id?: string;
  documentCompleteness: number;
  academicBackground: number;
  entranceTestScore: number;
  interviewScore: number;
  additionalFactors?: Record<string, number>;
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [admissionSettings, setAdmissionSettings] = useState({
    entranceTestPassingScore: "40",
    interviewPassingScore: "50",
    offerValidityDays: "7",
    waitlistAutoPromotion: true,
    requireDocumentVerification: true,
    requireEntranceTest: true,
    requireInterview: true,
    autoNotifications: true,
    applicationFeeRequired: true,
    defaultAcademicYear: "2024-2025",
  });

  const [institutionConfig, setInstitutionConfig] = useState<InstitutionConfig>({
    institutionName: "",
    institutionType: "school",
    address: "",
    phone: "",
    email: "",
    website: "",
  });

  const [scoringWeights, setScoringWeights] = useState<ScoringWeights>({
    documentCompleteness: 25,
    academicBackground: 25,
    entranceTestScore: 25,
    interviewScore: 25,
  });

  const { data: fetchedInstitutionConfig, isLoading: institutionLoading } = useQuery<InstitutionConfig>({
    queryKey: ["/api/config/institution"],
  });

  const { data: fetchedScoringWeights, isLoading: weightsLoading } = useQuery<ScoringWeights>({
    queryKey: ["/api/config/scoring-weights"],
  });

  const institutionMutation = useMutation({
    mutationFn: async (config: InstitutionConfig) => {
      return apiRequest("/api/config/institution", {
        method: "PUT",
        body: JSON.stringify(config),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/institution"] });
      toast({ title: "Institution settings saved", description: "Your institution configuration has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const scoringMutation = useMutation({
    mutationFn: async (weights: ScoringWeights) => {
      return apiRequest("/api/config/scoring-weights", {
        method: "PUT",
        body: JSON.stringify(weights),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config/scoring-weights"] });
      toast({ title: "Scoring weights saved", description: "AI scoring weights have been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveAdmissionSettings = () => {
    toast({ title: "Settings saved", description: "Admission configuration has been updated." });
  };

  const handleSaveInstitutionConfig = () => {
    const configToSave = fetchedInstitutionConfig 
      ? { ...fetchedInstitutionConfig, ...institutionConfig }
      : institutionConfig;
    institutionMutation.mutate(configToSave);
  };

  const handleSaveScoringWeights = () => {
    const weightsToSave = fetchedScoringWeights
      ? { ...fetchedScoringWeights, ...scoringWeights }
      : scoringWeights;
    scoringMutation.mutate(weightsToSave);
  };

  const totalWeight = scoringWeights.documentCompleteness + 
    scoringWeights.academicBackground + 
    scoringWeights.entranceTestScore + 
    scoringWeights.interviewScore;

  const isWeightValid = totalWeight === 100;

  const displayedInstitution = fetchedInstitutionConfig || institutionConfig;
  const displayedWeights = fetchedScoringWeights || scoringWeights;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your application and admission preferences"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="institution" data-testid="tab-institution">
            <Building2 className="h-4 w-4 mr-2" />
            Institution
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Brain className="h-4 w-4 mr-2" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="workflow" data-testid="tab-workflow">
            <Workflow className="h-4 w-4 mr-2" />
            Workflow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize how the application looks and feels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base">Theme</Label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <ThemeOption
                        icon={<Sun className="h-5 w-5" />}
                        title="Light"
                        description="Light mode"
                        isSelected={theme === "light"}
                        onClick={() => setTheme("light")}
                      />
                      <ThemeOption
                        icon={<Moon className="h-5 w-5" />}
                        title="Dark"
                        description="Dark mode"
                        isSelected={theme === "dark"}
                        onClick={() => setTheme("dark")}
                      />
                      <ThemeOption
                        icon={<Monitor className="h-5 w-5" />}
                        title="System"
                        description="Follow system"
                        isSelected={theme === "system"}
                        onClick={() => setTheme("system")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Configure notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive email updates about application status changes</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-email-notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">New Application Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when new applications are submitted</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-new-application-alerts" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Receive weekly summary reports via email</p>
                    </div>
                    <Switch data-testid="switch-weekly-reports" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    About
                  </CardTitle>
                  <CardDescription>Application information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-medium">3.0.0 Enterprise</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Application</span>
                      <span className="font-medium">Student Admission Management</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Model</span>
                      <Badge variant="secondary">OpenAI GPT-5</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Admission Configuration
                  </CardTitle>
                  <CardDescription>Configure admission process settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="academicYear">Default Academic Year</Label>
                      <Select
                        value={admissionSettings.defaultAcademicYear}
                        onValueChange={(val) => setAdmissionSettings({ ...admissionSettings, defaultAcademicYear: val })}
                      >
                        <SelectTrigger data-testid="select-academic-year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-2025">2024-2025</SelectItem>
                          <SelectItem value="2025-2026">2025-2026</SelectItem>
                          <SelectItem value="2026-2027">2026-2027</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-base font-medium">Screening Thresholds</Label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="entrancePassingScore" className="text-sm">Entrance Test Passing Score (%)</Label>
                          <Input
                            id="entrancePassingScore"
                            type="number"
                            min="0"
                            max="100"
                            value={admissionSettings.entranceTestPassingScore}
                            onChange={(e) => setAdmissionSettings({ ...admissionSettings, entranceTestPassingScore: e.target.value })}
                            data-testid="input-entrance-passing-score"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interviewPassingScore" className="text-sm">Interview Passing Score (%)</Label>
                          <Input
                            id="interviewPassingScore"
                            type="number"
                            min="0"
                            max="100"
                            value={admissionSettings.interviewPassingScore}
                            onChange={(e) => setAdmissionSettings({ ...admissionSettings, interviewPassingScore: e.target.value })}
                            data-testid="input-interview-passing-score"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="offerValidity" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Offer Validity Period (Days)
                      </Label>
                      <Input
                        id="offerValidity"
                        type="number"
                        min="1"
                        max="30"
                        value={admissionSettings.offerValidityDays}
                        onChange={(e) => setAdmissionSettings({ ...admissionSettings, offerValidityDays: e.target.value })}
                        data-testid="input-offer-validity"
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of days an offer letter remains valid for acceptance
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Process Requirements
                  </CardTitle>
                  <CardDescription>Enable or disable admission process steps</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Application Fee Required</Label>
                      <p className="text-sm text-muted-foreground">Require application fee before processing</p>
                    </div>
                    <Switch 
                      checked={admissionSettings.applicationFeeRequired}
                      onCheckedChange={(val) => setAdmissionSettings({ ...admissionSettings, applicationFeeRequired: val })}
                      data-testid="switch-application-fee"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Document Verification</Label>
                      <p className="text-sm text-muted-foreground">Require document verification step</p>
                    </div>
                    <Switch 
                      checked={admissionSettings.requireDocumentVerification}
                      onCheckedChange={(val) => setAdmissionSettings({ ...admissionSettings, requireDocumentVerification: val })}
                      data-testid="switch-doc-verification"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Entrance Test</Label>
                      <p className="text-sm text-muted-foreground">Include entrance test in admission process</p>
                    </div>
                    <Switch 
                      checked={admissionSettings.requireEntranceTest}
                      onCheckedChange={(val) => setAdmissionSettings({ ...admissionSettings, requireEntranceTest: val })}
                      data-testid="switch-entrance-test"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Interview</Label>
                      <p className="text-sm text-muted-foreground">Include interview in admission process</p>
                    </div>
                    <Switch 
                      checked={admissionSettings.requireInterview}
                      onCheckedChange={(val) => setAdmissionSettings({ ...admissionSettings, requireInterview: val })}
                      data-testid="switch-interview"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Auto-promote Waitlist</Label>
                      <p className="text-sm text-muted-foreground">Automatically promote waitlisted students when seats become available</p>
                    </div>
                    <Switch 
                      checked={admissionSettings.waitlistAutoPromotion}
                      onCheckedChange={(val) => setAdmissionSettings({ ...admissionSettings, waitlistAutoPromotion: val })}
                      data-testid="switch-waitlist-promo"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Auto Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send automatic notifications on status changes</p>
                    </div>
                    <Switch 
                      checked={admissionSettings.autoNotifications}
                      onCheckedChange={(val) => setAdmissionSettings({ ...admissionSettings, autoNotifications: val })}
                      data-testid="switch-auto-notifications"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveAdmissionSettings} className="w-full" data-testid="button-save-settings">
                <Save className="h-4 w-4 mr-2" />
                Save Admission Settings
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="institution" className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Institution Configuration
              </CardTitle>
              <CardDescription>Configure your institution details for branding and communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {institutionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="institutionName">Institution Name</Label>
                      <Input
                        id="institutionName"
                        placeholder="Enter institution name"
                        value={institutionConfig.institutionName || displayedInstitution.institutionName || ""}
                        onChange={(e) => setInstitutionConfig({ ...institutionConfig, institutionName: e.target.value })}
                        data-testid="input-institution-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institutionType">Institution Type</Label>
                      <Select
                        value={institutionConfig.institutionType || displayedInstitution.institutionType || "school"}
                        onValueChange={(val) => setInstitutionConfig({ ...institutionConfig, institutionType: val })}
                      >
                        <SelectTrigger data-testid="select-institution-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school">School (K-12)</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                          <SelectItem value="university">University</SelectItem>
                          <SelectItem value="training_center">Training Center</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter full address"
                      value={institutionConfig.address || displayedInstitution.address || ""}
                      onChange={(e) => setInstitutionConfig({ ...institutionConfig, address: e.target.value })}
                      className="resize-none"
                      data-testid="input-institution-address"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={institutionConfig.phone || displayedInstitution.phone || ""}
                        onChange={(e) => setInstitutionConfig({ ...institutionConfig, phone: e.target.value })}
                        data-testid="input-institution-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admissions@institution.edu"
                        value={institutionConfig.email || displayedInstitution.email || ""}
                        onChange={(e) => setInstitutionConfig({ ...institutionConfig, email: e.target.value })}
                        data-testid="input-institution-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://www.institution.edu"
                      value={institutionConfig.website || displayedInstitution.website || ""}
                      onChange={(e) => setInstitutionConfig({ ...institutionConfig, website: e.target.value })}
                      data-testid="input-institution-website"
                    />
                  </div>

                  <Button 
                    onClick={handleSaveInstitutionConfig} 
                    className="w-full"
                    disabled={institutionMutation.isPending}
                    data-testid="button-save-institution"
                  >
                    {institutionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Institution Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  AI Scoring Weights
                </CardTitle>
                <CardDescription>Configure how AI evaluates applications (total must equal 100%)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {weightsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Document Completeness</Label>
                          <span className="text-sm font-medium">{scoringWeights.documentCompleteness || displayedWeights.documentCompleteness}%</span>
                        </div>
                        <Slider
                          value={[scoringWeights.documentCompleteness || displayedWeights.documentCompleteness || 25]}
                          onValueChange={(val) => setScoringWeights({ ...scoringWeights, documentCompleteness: val[0] })}
                          max={100}
                          step={5}
                          data-testid="slider-doc-weight"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Academic Background</Label>
                          <span className="text-sm font-medium">{scoringWeights.academicBackground || displayedWeights.academicBackground}%</span>
                        </div>
                        <Slider
                          value={[scoringWeights.academicBackground || displayedWeights.academicBackground || 25]}
                          onValueChange={(val) => setScoringWeights({ ...scoringWeights, academicBackground: val[0] })}
                          max={100}
                          step={5}
                          data-testid="slider-academic-weight"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Entrance Test Score</Label>
                          <span className="text-sm font-medium">{scoringWeights.entranceTestScore || displayedWeights.entranceTestScore}%</span>
                        </div>
                        <Slider
                          value={[scoringWeights.entranceTestScore || displayedWeights.entranceTestScore || 25]}
                          onValueChange={(val) => setScoringWeights({ ...scoringWeights, entranceTestScore: val[0] })}
                          max={100}
                          step={5}
                          data-testid="slider-test-weight"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Interview Score</Label>
                          <span className="text-sm font-medium">{scoringWeights.interviewScore || displayedWeights.interviewScore}%</span>
                        </div>
                        <Slider
                          value={[scoringWeights.interviewScore || displayedWeights.interviewScore || 25]}
                          onValueChange={(val) => setScoringWeights({ ...scoringWeights, interviewScore: val[0] })}
                          max={100}
                          step={5}
                          data-testid="slider-interview-weight"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Weight</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${isWeightValid ? "text-emerald-600" : "text-destructive"}`}>
                          {totalWeight}%
                        </span>
                        {isWeightValid ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>

                    {!isWeightValid && (
                      <p className="text-sm text-destructive">
                        Total weight must equal 100%. Current total: {totalWeight}%
                      </p>
                    )}

                    <Button 
                      onClick={handleSaveScoringWeights} 
                      className="w-full"
                      disabled={!isWeightValid || scoringMutation.isPending}
                      data-testid="button-save-weights"
                    >
                      {scoringMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Scoring Weights
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Model Configuration
                </CardTitle>
                <CardDescription>Configure AI behavior and capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Primary AI Model</span>
                    <Badge>OpenAI GPT-5</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All AI features are powered by OpenAI GPT-5, the most advanced language model available.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Fallback Engine</span>
                    <Badge variant="secondary">Rule-based</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    If the AI model is unavailable, the system falls back to intelligent rule-based processing.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">AI Feature Toggles</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">AI Recommendations</Label>
                      <p className="text-sm text-muted-foreground">Smart recommendations for each application</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-ai-recommendations" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Predictive Analytics</Label>
                      <p className="text-sm text-muted-foreground">Enrollment probability predictions</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-ai-predictive" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Decision Support</Label>
                      <p className="text-sm text-muted-foreground">AI-assisted admission decisions</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-ai-decision" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Anomaly Detection</Label>
                      <p className="text-sm text-muted-foreground">Detect unusual patterns in applications</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-ai-anomaly" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Workflow className="h-5 w-5" />
                  Workflow Stages
                </CardTitle>
                <CardDescription>Configure the admission workflow stages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { name: "Inquiry", status: "inquiry", color: "bg-slate-500" },
                    { name: "Application Submitted", status: "application_submitted", color: "bg-blue-500" },
                    { name: "Documents Pending", status: "documents_pending", color: "bg-amber-500" },
                    { name: "Documents Verified", status: "documents_verified", color: "bg-emerald-500" },
                    { name: "Entrance Test Scheduled", status: "entrance_test_scheduled", color: "bg-purple-500" },
                    { name: "Entrance Test Completed", status: "entrance_test_completed", color: "bg-purple-600" },
                    { name: "Interview Scheduled", status: "interview_scheduled", color: "bg-indigo-500" },
                    { name: "Interview Completed", status: "interview_completed", color: "bg-indigo-600" },
                    { name: "Under Review", status: "under_review", color: "bg-orange-500" },
                    { name: "Waitlisted", status: "waitlisted", color: "bg-yellow-500" },
                    { name: "Offer Extended", status: "offer_extended", color: "bg-teal-500" },
                    { name: "Offer Accepted", status: "offer_accepted", color: "bg-teal-600" },
                    { name: "Enrolled", status: "enrolled", color: "bg-green-600" },
                    { name: "Rejected", status: "rejected", color: "bg-red-500" },
                    { name: "Withdrawn", status: "withdrawn", color: "bg-gray-500" },
                  ].map((stage) => (
                    <div 
                      key={stage.status} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                      data-testid={`workflow-stage-${stage.status}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                        <span className="font-medium">{stage.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{stage.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Fee Configuration
                  </CardTitle>
                  <CardDescription>Configure fee structure for admissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <span className="font-medium">Application Fee</span>
                        <p className="text-sm text-muted-foreground">One-time application processing fee</p>
                      </div>
                      <Badge>Configurable</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <span className="font-medium">Registration Fee</span>
                        <p className="text-sm text-muted-foreground">Fee upon offer acceptance</p>
                      </div>
                      <Badge>Configurable</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <span className="font-medium">Tuition Fee</span>
                        <p className="text-sm text-muted-foreground">Annual/semester tuition</p>
                      </div>
                      <Badge>Configurable</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure detailed fee structures per grade level in the database.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Audit & Compliance
                  </CardTitle>
                  <CardDescription>Track all system changes for compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">Track all configuration changes</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-audit-logging" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Status History</Label>
                      <p className="text-sm text-muted-foreground">Keep complete status change history</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-status-history" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Document Versioning</Label>
                      <p className="text-sm text-muted-foreground">Keep previous document versions</p>
                    </div>
                    <Switch data-testid="switch-doc-versioning" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ThemeOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeOption({ icon, title, description, isSelected, onClick }: ThemeOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-transparent bg-muted hover-elevate"
      }`}
      data-testid={`button-theme-${title.toLowerCase()}`}
    >
      <div className={`${isSelected ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
