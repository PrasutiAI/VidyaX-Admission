import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns";
import {
  ClipboardCheck,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Play,
  Trophy,
  Users,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { gradeOptions, statusLabels } from "@shared/schema";

interface ScreeningEvent {
  id: string;
  applicationNumber: string;
  studentName: string;
  grade: string;
  type: "entrance_test" | "interview";
  scheduledDate: string;
  score?: number;
  notes?: string;
  status: string;
  completedAt?: string;
}

interface ScreeningStats {
  totalScheduled: number;
  completedToday: number;
  upcomingThisWeek: number;
  averageScore: number;
  passRate: number;
}

export default function Screening() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"entrance" | "interview">("entrance");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [scoringEvent, setScoringEvent] = useState<ScreeningEvent | null>(null);
  const [scoreData, setScoreData] = useState({ score: "", notes: "" });

  const { data: entranceTests, isLoading: loadingTests } = useQuery<ScreeningEvent[]>({
    queryKey: ["/api/screening/entrance-tests"],
  });

  const { data: interviews, isLoading: loadingInterviews } = useQuery<ScreeningEvent[]>({
    queryKey: ["/api/screening/interviews"],
  });

  const { data: stats } = useQuery<ScreeningStats>({
    queryKey: ["/api/screening/stats"],
  });

  const scoreMutation = useMutation({
    mutationFn: async ({ id, type, score, notes }: { id: string; type: string; score: string; notes: string }) => {
      const endpoint = type === "entrance_test"
        ? `/api/admission/applications/${id}/entrance-test/score`
        : `/api/admission/applications/${id}/interview/result`;
      return apiRequest("PUT", endpoint, { score, notes, date: scoringEvent?.scheduledDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screening/entrance-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/screening/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/screening/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications"] });
      setScoringEvent(null);
      setScoreData({ score: "", notes: "" });
      toast({ title: "Score recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record score", description: error.message, variant: "destructive" });
    },
  });

  const currentEvents = activeTab === "entrance" ? entranceTests : interviews;
  const isLoading = activeTab === "entrance" ? loadingTests : loadingInterviews;

  const filteredEvents = useMemo(() => {
    if (!currentEvents) return [];
    return currentEvents.filter((event) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !event.applicationNumber.toLowerCase().includes(searchLower) &&
          !event.studentName.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (statusFilter === "scheduled" && event.score !== undefined) return false;
      if (statusFilter === "completed" && event.score === undefined) return false;
      if (statusFilter === "today" && !isToday(new Date(event.scheduledDate))) return false;
      if (statusFilter === "upcoming" && !isFuture(new Date(event.scheduledDate))) return false;
      return true;
    });
  }, [currentEvents, search, statusFilter]);

  const ITEMS_PER_PAGE = 25;
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredEvents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEvents, page]);

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);

  const getDateBadge = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return <Badge variant="default" className="bg-primary">Today</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge variant="secondary">Tomorrow</Badge>;
    }
    if (isPast(date)) {
      return <Badge variant="outline" className="text-muted-foreground">Past</Badge>;
    }
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const openScoringDialog = (event: ScreeningEvent) => {
    setScoringEvent(event);
    setScoreData({ 
      score: event.score?.toString() || "", 
      notes: event.notes || "" 
    });
  };

  const handleScoreSubmit = () => {
    if (!scoringEvent) return;
    scoreMutation.mutate({
      id: scoringEvent.id,
      type: scoringEvent.type,
      score: scoreData.score,
      notes: scoreData.notes,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Screening" description="Manage entrance tests and interviews" />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening"
        description="Manage entrance tests and interviews"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Scheduled"
          value={stats?.totalScheduled || 0}
          icon={Calendar}
          description="All screening events"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          icon={CheckCircle2}
          description="Finished today"
        />
        <StatCard
          title="Upcoming (7 days)"
          value={stats?.upcomingThisWeek || 0}
          icon={Clock}
          description="Next 7 days"
        />
        <StatCard
          title="Average Score"
          value={`${stats?.averageScore || 0}%`}
          icon={Trophy}
          description="All assessments"
        />
        <StatCard
          title="Pass Rate"
          value={`${stats?.passRate || 0}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
          description="Above threshold"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "entrance" | "interview"); setPage(1); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="entrance" className="gap-2" data-testid="tab-entrance">
            <ClipboardCheck className="h-4 w-4" />
            Entrance Tests
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-2" data-testid="tab-interview">
            <MessageSquare className="h-4 w-4" />
            Interviews
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or app number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
                data-testid="input-search"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="filter-status"
            >
              <option value="all">All Events</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="scheduled">Pending Score</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <TabsContent value="entrance" className="mt-6">
          {renderEventsTable("entrance_test")}
        </TabsContent>

        <TabsContent value="interview" className="mt-6">
          {renderEventsTable("interview")}
        </TabsContent>
      </Tabs>

      <Dialog open={!!scoringEvent} onOpenChange={() => setScoringEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record {scoringEvent?.type === "entrance_test" ? "Test" : "Interview"} Score
            </DialogTitle>
            <DialogDescription>
              Enter the score and any notes for this assessment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {scoringEvent && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{scoringEvent.studentName}</p>
                <p className="text-sm text-muted-foreground">
                  {scoringEvent.applicationNumber} - {gradeOptions.find(g => g.id === scoringEvent.grade)?.name || scoringEvent.grade}
                </p>
                <p className="text-sm text-muted-foreground">
                  Scheduled: {format(new Date(scoringEvent.scheduledDate), "MMMM d, yyyy")}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="score">Score (0-100) *</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                placeholder="Enter score..."
                value={scoreData.score}
                onChange={(e) => setScoreData({ ...scoreData, score: e.target.value })}
                data-testid="input-score"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional assessment notes..."
                value={scoreData.notes}
                onChange={(e) => setScoreData({ ...scoreData, notes: e.target.value })}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoringEvent(null)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleScoreSubmit}
              disabled={scoreMutation.isPending || !scoreData.score}
              data-testid="button-submit-score"
            >
              {scoreMutation.isPending ? "Saving..." : "Save Score"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderEventsTable(type: "entrance_test" | "interview") {
    if (paginatedEvents.length === 0) {
      return (
        <Card className="border-card-border">
          <CardContent className="py-16">
            <EmptyState
              icon={type === "entrance_test" ? ClipboardCheck : MessageSquare}
              title={`No ${type === "entrance_test" ? "Entrance Tests" : "Interviews"} Found`}
              description={search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : `Scheduled ${type === "entrance_test" ? "tests" : "interviews"} will appear here`}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <Card className="border-card-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((event) => (
                  <TableRow key={event.id} data-testid={`screening-row-${event.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {event.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium">{event.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/applications/${event.id}`}>
                        <span className="font-mono text-sm hover:underline cursor-pointer" data-testid={`link-app-${event.id}`}>
                          {event.applicationNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {gradeOptions.find(g => g.id === event.grade)?.name || event.grade}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(event.scheduledDate), "MMM d, yyyy")}</span>
                        {getDateBadge(event.scheduledDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.score !== undefined ? (
                        <span className={`font-semibold ${getScoreColor(event.score)}`}>
                          {event.score}%
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-menu-${event.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/applications/${event.id}`}>
                            <DropdownMenuItem>
                              <Users className="h-4 w-4 mr-2" />
                              View Application
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => openScoringDialog(event)}>
                            <Play className="h-4 w-4 mr-2" />
                            {event.score !== undefined ? "Update Score" : "Record Score"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages || 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    );
  }
}
