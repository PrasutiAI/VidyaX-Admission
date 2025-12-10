import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { Moon, Sun, Monitor, GraduationCap, Clock, FileText, Bell, Settings2, Save } from "lucide-react";

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

  const handleSaveAdmissionSettings = () => {
    toast({ title: "Settings saved", description: "Admission configuration has been updated." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your application and admission preferences"
      />

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
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Application</span>
                  <span className="font-medium">Student Admission Management</span>
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
