import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Monitor } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your application preferences"
      />

      <Card className="border-card-border max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Appearance</CardTitle>
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

      <Card className="border-card-border max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Notifications</CardTitle>
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

      <Card className="border-card-border max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-medium">About</CardTitle>
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
