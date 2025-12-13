import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Cycles from "@/pages/cycles";
import Applications from "@/pages/applications";
import ApplicationForm from "@/pages/application-form";
import ApplicationDetail from "@/pages/application-detail";
import Documents from "@/pages/documents";
import Screening from "@/pages/screening";
import Enrollment from "@/pages/enrollment";
import Seats from "@/pages/seats";
import Reports from "@/pages/reports";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cycles" component={Cycles} />
      <Route path="/applications" component={Applications} />
      <Route path="/applications/new" component={ApplicationForm} />
      <Route path="/applications/:id" component={ApplicationDetail} />
      <Route path="/documents" component={Documents} />
      <Route path="/screening" component={Screening} />
      <Route path="/enrollment" component={Enrollment} />
      <Route path="/seats" component={Seats} />
      <Route path="/reports" component={Reports} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="admission-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex h-16 items-center justify-between gap-4 border-b px-6 bg-background">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6 lg:p-8">
                  <div className="mx-auto max-w-7xl">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
