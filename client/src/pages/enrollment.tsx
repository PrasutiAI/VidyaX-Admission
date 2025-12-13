import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  GraduationCap,
  Search,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Mail,
  Download,
  UserCheck,
  Trophy,
  TrendingUp,
  Users,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  DropdownMenuSeparator,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { gradeOptions, statusLabels, ApplicationStatus } from "@shared/schema";

interface EnrollmentCandidate {
  id: string;
  applicationNumber: string;
  studentName: string;
  grade: string;
  status: ApplicationStatus;
  entranceTestScore?: number;
  interviewScore?: number;
  decisionDate?: string;
  decisionRemarks?: string;
  fatherEmail: string;
  fatherContact: string;
}

interface EnrollmentStats {
  pendingOffers: number;
  offersExtended: number;
  offersAccepted: number;
  enrolled: number;
  conversionRate: number;
}

const enrollmentStatusConfig: Record<string, { bg: string; text: string }> = {
  under_review: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
  offer_extended: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  offer_accepted: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  enrolled: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
  rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  waitlisted: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
};

export default function Enrollment() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"pending" | "offers" | "enrolled">("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [offerCandidate, setOfferCandidate] = useState<EnrollmentCandidate | null>(null);
  const [offerRemarks, setOfferRemarks] = useState("");
  const [confirmEnroll, setConfirmEnroll] = useState<EnrollmentCandidate | null>(null);

  const { data: candidates, isLoading } = useQuery<EnrollmentCandidate[]>({
    queryKey: ["/api/enrollment/candidates"],
  });

  const { data: stats } = useQuery<EnrollmentStats>({
    queryKey: ["/api/enrollment/stats"],
  });

  const generateOfferMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks: string }) => {
      return apiRequest("POST", `/api/admission/applications/${id}/offer`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications"] });
      setOfferCandidate(null);
      setOfferRemarks("");
      toast({ title: "Offer extended successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate offer", description: error.message, variant: "destructive" });
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admission/applications/${id}/accept-offer`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications"] });
      toast({ title: "Offer accepted" });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admission/applications/${id}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollment/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications"] });
      setConfirmEnroll(null);
      toast({ title: "Student enrolled successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to enroll student", description: error.message, variant: "destructive" });
    },
  });

  const getTabCandidates = useMemo(() => {
    if (!candidates) return [];
    
    let filtered = candidates;
    
    if (activeTab === "pending") {
      filtered = candidates.filter(c => 
        ["interview_completed", "under_review", "waitlisted"].includes(c.status)
      );
    } else if (activeTab === "offers") {
      filtered = candidates.filter(c => 
        ["offer_extended", "offer_accepted"].includes(c.status)
      );
    } else if (activeTab === "enrolled") {
      filtered = candidates.filter(c => c.status === "enrolled");
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.applicationNumber.toLowerCase().includes(searchLower) ||
        c.studentName.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [candidates, activeTab, search]);

  const ITEMS_PER_PAGE = 25;
  const paginatedCandidates = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return getTabCandidates.slice(start, start + ITEMS_PER_PAGE);
  }, [getTabCandidates, page]);

  const totalPages = Math.ceil(getTabCandidates.length / ITEMS_PER_PAGE);

  const conversionRate = stats?.conversionRate || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Enrollment" description="Manage offers and enrollment process" />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollment"
        description="Manage offers and enrollment process"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Ready for Offer"
          value={stats?.pendingOffers || 0}
          icon={Clock}
          description="Awaiting decision"
        />
        <StatCard
          title="Offers Extended"
          value={stats?.offersExtended || 0}
          icon={Send}
          description="Sent to applicants"
        />
        <StatCard
          title="Offers Accepted"
          value={stats?.offersAccepted || 0}
          icon={CheckCircle2}
          description="Pending enrollment"
        />
        <StatCard
          title="Enrolled"
          value={stats?.enrolled || 0}
          icon={GraduationCap}
          description="Completed enrollment"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          trend={{ value: 3, isPositive: true }}
          description="Offer to enrollment"
        />
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Enrollment Funnel</CardTitle>
          <CardDescription>Track application to enrollment conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{stats?.enrolled || 0} enrolled of {stats?.offersExtended || 0} offers</span>
              </div>
              <Progress value={conversionRate} className="h-2" />
            </div>
            <div className="grid grid-cols-4 gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-semibold">{stats?.pendingOffers || 0}</div>
                <div className="text-xs text-muted-foreground">Ready</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">{stats?.offersExtended || 0}</div>
                <div className="text-xs text-muted-foreground">Offered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-emerald-600">{stats?.offersAccepted || 0}</div>
                <div className="text-xs text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">{stats?.enrolled || 0}</div>
                <div className="text-xs text-muted-foreground">Enrolled</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "pending" | "offers" | "enrolled"); setPage(1); }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Ready for Offer
            </TabsTrigger>
            <TabsTrigger value="offers" data-testid="tab-offers">
              Offers
            </TabsTrigger>
            <TabsTrigger value="enrolled" data-testid="tab-enrolled">
              Enrolled
            </TabsTrigger>
          </TabsList>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or app number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>

        <TabsContent value="pending" className="mt-6">
          {renderCandidatesTable("pending")}
        </TabsContent>

        <TabsContent value="offers" className="mt-6">
          {renderCandidatesTable("offers")}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-6">
          {renderCandidatesTable("enrolled")}
        </TabsContent>
      </Tabs>

      <Dialog open={!!offerCandidate} onOpenChange={() => setOfferCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Admission Offer</DialogTitle>
            <DialogDescription>
              Send an admission offer to this applicant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {offerCandidate && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{offerCandidate.studentName}</p>
                <p className="text-sm text-muted-foreground">
                  {offerCandidate.applicationNumber} - {gradeOptions.find(g => g.id === offerCandidate.grade)?.name || offerCandidate.grade}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>Test: {offerCandidate.entranceTestScore || "N/A"}%</span>
                  <span>Interview: {offerCandidate.interviewScore || "N/A"}%</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="remarks">Offer Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Any special conditions or notes for the offer..."
                value={offerRemarks}
                onChange={(e) => setOfferRemarks(e.target.value)}
                data-testid="input-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferCandidate(null)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => offerCandidate && generateOfferMutation.mutate({ id: offerCandidate.id, remarks: offerRemarks })}
              disabled={generateOfferMutation.isPending}
              data-testid="button-send-offer"
            >
              <Send className="h-4 w-4 mr-2" />
              {generateOfferMutation.isPending ? "Sending..." : "Send Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmEnroll} onOpenChange={() => setConfirmEnroll(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmEnroll && (
                <>
                  Confirm enrollment for <strong>{confirmEnroll.studentName}</strong> ({confirmEnroll.applicationNumber}).
                  This will mark the admission process as complete.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-enroll">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmEnroll && enrollMutation.mutate(confirmEnroll.id)}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-enroll"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              {enrollMutation.isPending ? "Processing..." : "Complete Enrollment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderCandidatesTable(tab: "pending" | "offers" | "enrolled") {
    if (paginatedCandidates.length === 0) {
      const emptyConfig = {
        pending: { title: "No Candidates Ready", description: "Applicants who complete interviews will appear here" },
        offers: { title: "No Active Offers", description: "Extended offers will be tracked here" },
        enrolled: { title: "No Enrolled Students", description: "Enrolled students will appear here" },
      };

      return (
        <Card className="border-card-border">
          <CardContent className="py-16">
            <EmptyState
              icon={GraduationCap}
              title={emptyConfig[tab].title}
              description={search ? "Try adjusting your search" : emptyConfig[tab].description}
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
                  <TableHead>Scores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCandidates.map((candidate) => {
                  const statusColors = enrollmentStatusConfig[candidate.status] || { bg: "", text: "" };

                  return (
                    <TableRow key={candidate.id} data-testid={`enrollment-row-${candidate.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {candidate.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-medium">{candidate.studentName}</span>
                            <p className="text-sm text-muted-foreground">{candidate.fatherEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/applications/${candidate.id}`}>
                          <span className="font-mono text-sm hover:underline cursor-pointer" data-testid={`link-app-${candidate.id}`}>
                            {candidate.applicationNumber}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {gradeOptions.find(g => g.id === candidate.grade)?.name || candidate.grade}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {candidate.entranceTestScore !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              Test: {candidate.entranceTestScore}%
                            </Badge>
                          )}
                          {candidate.interviewScore !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              Int: {candidate.interviewScore}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={candidate.status} size="sm" />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${candidate.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/applications/${candidate.id}`}>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Application
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            {["interview_completed", "under_review", "waitlisted"].includes(candidate.status) && (
                              <DropdownMenuItem onClick={() => setOfferCandidate(candidate)}>
                                <Send className="h-4 w-4 mr-2" />
                                Generate Offer
                              </DropdownMenuItem>
                            )}
                            {candidate.status === "offer_extended" && (
                              <DropdownMenuItem onClick={() => acceptOfferMutation.mutate(candidate.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Offer Accepted
                              </DropdownMenuItem>
                            )}
                            {candidate.status === "offer_accepted" && (
                              <DropdownMenuItem onClick={() => setConfirmEnroll(candidate)}>
                                <GraduationCap className="h-4 w-4 mr-2" />
                                Complete Enrollment
                              </DropdownMenuItem>
                            )}
                            {["offer_extended", "offer_accepted", "enrolled"].includes(candidate.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <Link href={`/applications/${candidate.id}?tab=offer`}>
                                  <DropdownMenuItem>
                                    <Printer className="h-4 w-4 mr-2" />
                                    View Offer Letter
                                  </DropdownMenuItem>
                                </Link>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, getTabCandidates.length)} of {getTabCandidates.length} candidates
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
