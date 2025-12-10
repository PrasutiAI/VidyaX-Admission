import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  CalendarRange,
  ArrowRight,
  ClipboardCheck,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AIDashboardInsights } from "@/components/ai-recommendations";
import type { AdmissionCycle, AdmissionApplication, GradeSeatConfig } from "@shared/schema";
import { format } from "date-fns";
import { gradeOptions } from "@shared/schema";

interface DashboardStats {
  totalApplications: number;
  pendingReviews: number;
  enrolled: number;
  enrollmentRate: number;
}

interface RecentApplication extends AdmissionApplication {
  cycleName?: string;
}

interface ScheduledEvent {
  id: string;
  type: "entrance_test" | "interview";
  date: string;
  studentName: string;
  applicationNumber: string;
  grade: string;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: activeCycle, isLoading: cycleLoading } = useQuery<AdmissionCycle>({
    queryKey: ["/api/admission/cycles/active"],
  });

  const { data: recentApplications, isLoading: applicationsLoading } = useQuery<RecentApplication[]>({
    queryKey: ["/api/admission/applications/recent"],
  });

  const { data: seatConfigs, isLoading: seatsLoading } = useQuery<GradeSeatConfig[]>({
    queryKey: ["/api/admission/cycles", activeCycle?.id, "seats"],
    enabled: !!activeCycle?.id,
  });

  const { data: scheduledEvents, isLoading: eventsLoading } = useQuery<ScheduledEvent[]>({
    queryKey: ["/api/analytics/scheduled-events"],
  });

  const isLoading = statsLoading || cycleLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const defaultStats: DashboardStats = {
    totalApplications: 0,
    pendingReviews: 0,
    enrolled: 0,
    enrollmentRate: 0,
  };

  const displayStats = stats || defaultStats;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your admission management system"
      >
        <Link href="/applications/new">
          <Button data-testid="button-new-application">
            <FileText className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Applications"
          value={displayStats.totalApplications}
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
          description="vs last month"
        />
        <StatCard
          title="Pending Reviews"
          value={displayStats.pendingReviews}
          icon={Clock}
          description="Awaiting action"
        />
        <StatCard
          title="Enrolled Students"
          value={displayStats.enrolled}
          icon={CheckCircle2}
          trend={{ value: 8, isPositive: true }}
          description="vs last month"
        />
        <StatCard
          title="Enrollment Rate"
          value={`${displayStats.enrollmentRate}%`}
          icon={TrendingUp}
          description="Conversion rate"
        />
      </div>

      <AIDashboardInsights />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Active Admission Cycle</CardTitle>
              <CardDescription>Current cycle overview and quick actions</CardDescription>
            </div>
            <CalendarRange className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeCycle ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{activeCycle.cycleName}</p>
                    <p className="text-sm text-muted-foreground">{activeCycle.academicYear}</p>
                  </div>
                  <Badge 
                    variant={activeCycle.status === "open" ? "default" : "secondary"}
                    className={activeCycle.status === "open" ? "bg-emerald-500 text-white" : ""}
                  >
                    {activeCycle.status.charAt(0).toUpperCase() + activeCycle.status.slice(1)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cycle Period</span>
                    <span className="font-medium">
                      {format(new Date(activeCycle.startDate), "MMM d, yyyy")} - {format(new Date(activeCycle.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  <Progress value={65} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">65% complete</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Link href={`/applications?cycleId=${activeCycle.id}`}>
                    <Button variant="outline" size="sm" data-testid="button-view-applications">
                      View Applications
                    </Button>
                  </Link>
                  <Link href={`/seats?cycleId=${activeCycle.id}`}>
                    <Button variant="outline" size="sm" data-testid="button-manage-seats">
                      Manage Seats
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={CalendarRange}
                title="No Active Cycle"
                description="Create an admission cycle to start accepting applications"
                action={
                  <Link href="/cycles/new">
                    <Button data-testid="button-create-cycle">Create Cycle</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Seat Availability</CardTitle>
              <CardDescription>Current seat status by grade</CardDescription>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {seatsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-2 bg-muted rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : seatConfigs && seatConfigs.length > 0 ? (
              <div className="space-y-4">
                {seatConfigs.slice(0, 5).map((config) => {
                  const filled = config.totalSeats - config.availableSeats;
                  const percentage = (filled / config.totalSeats) * 100;
                  return (
                    <div key={config.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{config.gradeName}</span>
                        <span className="text-muted-foreground">
                          {filled}/{config.totalSeats} filled
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                      />
                    </div>
                  );
                })}
                {seatConfigs.length > 5 && (
                  <Link href="/seats">
                    <Button variant="ghost" size="sm" className="w-full mt-2" data-testid="button-view-all-seats">
                      View All Grades
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Seat Configuration"
                description="Configure seats for the active admission cycle"
                action={
                  activeCycle && (
                    <Link href={`/seats?cycleId=${activeCycle.id}`}>
                      <Button variant="outline" data-testid="button-configure-seats">Configure Seats</Button>
                    </Link>
                  )
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-card-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Recent Applications</CardTitle>
              <CardDescription>Latest submissions requiring attention</CardDescription>
            </div>
            <Link href="/applications">
              <Button variant="ghost" size="sm" data-testid="button-view-all-applications">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg border">
                    <div className="h-10 w-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                    <div className="h-6 bg-muted rounded w-24" />
                  </div>
                ))}
              </div>
            ) : recentApplications && recentApplications.length > 0 ? (
              <div className="space-y-3">
                {recentApplications.map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover-elevate cursor-pointer transition-colors" data-testid={`application-row-${app.id}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {app.studentFirstName[0]}{app.studentLastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {app.studentFirstName} {app.studentLastName}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {app.applicationNumber}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground hidden sm:block">
                        {app.gradeAppliedFor}
                      </div>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No Applications Yet"
                description="Applications will appear here once submitted"
                action={
                  <Link href="/applications/new">
                    <Button data-testid="button-submit-first-application">Submit First Application</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg font-medium">Upcoming Events</CardTitle>
              <CardDescription>Scheduled tests and interviews</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse p-3 rounded-lg border">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : scheduledEvents && scheduledEvents.length > 0 ? (
              <div className="space-y-3">
                {scheduledEvents.slice(0, 5).map((event) => (
                  <Link key={event.id} href={`/applications/${event.id}`}>
                    <div className="p-3 rounded-lg border border-border hover-elevate cursor-pointer" data-testid={`event-row-${event.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {event.type === "entrance_test" ? (
                          <ClipboardCheck className="h-4 w-4 text-purple-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-indigo-600" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {event.type === "entrance_test" ? "Entrance Test" : "Interview"}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{event.studentName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {gradeOptions.find(g => g.id === event.grade)?.name || event.grade}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(new Date(event.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No Upcoming Events"
                description="Scheduled tests and interviews will appear here"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
