import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  FileClock,
  FileX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface DocumentWithApplication {
  id: string;
  applicationId: string;
  applicationNumber: string;
  studentName: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedBy?: string;
  verifiedAt?: string;
  remarks?: string;
}

interface DocumentStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

const documentTypeLabels: Record<string, string> = {
  birth_certificate: "Birth Certificate",
  transfer_certificate: "Transfer Certificate",
  previous_report_card: "Previous Report Card",
  report_card: "Report Card",
  category_certificate: "Category Certificate",
  address_proof: "Address Proof",
  passport_photo: "Passport Photo",
  medical_certificate: "Medical Certificate",
  other: "Other Document",
};

const statusConfig = {
  pending: { 
    icon: Clock, 
    bg: "bg-amber-100 dark:bg-amber-900/30", 
    text: "text-amber-700 dark:text-amber-300",
    iconColor: "text-amber-600"
  },
  verified: { 
    icon: CheckCircle2, 
    bg: "bg-emerald-100 dark:bg-emerald-900/30", 
    text: "text-emerald-700 dark:text-emerald-300",
    iconColor: "text-emerald-600"
  },
  rejected: { 
    icon: XCircle, 
    bg: "bg-red-100 dark:bg-red-900/30", 
    text: "text-red-700 dark:text-red-300",
    iconColor: "text-red-600"
  },
};

const ITEMS_PER_PAGE = 25;

export default function Documents() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [verifyingDoc, setVerifyingDoc] = useState<DocumentWithApplication | null>(null);
  const [verifyAction, setVerifyAction] = useState<"verified" | "rejected">("verified");
  const [verifyRemarks, setVerifyRemarks] = useState("");

  const { data: documents, isLoading } = useQuery<DocumentWithApplication[]>({
    queryKey: ["/api/documents"],
  });

  const { data: stats } = useQuery<DocumentStats>({
    queryKey: ["/api/documents/stats"],
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ docId, appId, status, remarks }: { docId: string; appId: string; status: string; remarks: string }) => {
      return apiRequest("PATCH", `/api/admission/applications/${appId}/documents/${docId}/verify`, { status, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/document-verification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications"] });
      setVerifyingDoc(null);
      setVerifyRemarks("");
      toast({ title: `Document ${verifyAction} successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update document", description: error.message, variant: "destructive" });
    },
  });

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter((doc) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !doc.applicationNumber.toLowerCase().includes(searchLower) &&
          !doc.studentName.toLowerCase().includes(searchLower) &&
          !doc.fileName.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      if (statusFilter !== "all" && doc.verificationStatus !== statusFilter) return false;
      if (typeFilter !== "all" && doc.documentType !== typeFilter) return false;
      return true;
    });
  }, [documents, search, statusFilter, typeFilter]);

  const paginatedDocuments = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocuments, page]);

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);

  const documentTypes = useMemo(() => {
    if (!documents) return [];
    const types = new Set(documents.map(d => d.documentType));
    return Array.from(types);
  }, [documents]);

  const openVerifyDialog = (doc: DocumentWithApplication, action: "verified" | "rejected") => {
    setVerifyingDoc(doc);
    setVerifyAction(action);
    setVerifyRemarks("");
  };

  const handleVerify = () => {
    if (!verifyingDoc) return;
    verifyMutation.mutate({
      docId: verifyingDoc.id,
      appId: verifyingDoc.applicationId,
      status: verifyAction,
      remarks: verifyRemarks,
    });
  };

  const verificationRate = stats ? Math.round((stats.verified / (stats.total || 1)) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Documents" description="Manage and verify application documents" />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage and verify application documents"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={stats?.total || 0}
          icon={FileText}
          description="Uploaded documents"
        />
        <StatCard
          title="Verified"
          value={stats?.verified || 0}
          icon={FileCheck}
          trend={{ value: verificationRate, isPositive: true }}
          description={`${verificationRate}% verified`}
        />
        <StatCard
          title="Pending Review"
          value={stats?.pending || 0}
          icon={FileClock}
          description="Awaiting verification"
        />
        <StatCard
          title="Rejected"
          value={stats?.rejected || 0}
          icon={FileX}
          description="Needs resubmission"
        />
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Verification Progress</CardTitle>
          <CardDescription>Overall document verification status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{stats?.verified || 0} / {stats?.total || 0} verified</span>
            </div>
            <Progress value={verificationRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, app number, or file..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36" data-testid="filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44" data-testid="filter-type">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {documentTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {documentTypeLabels[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {paginatedDocuments.length > 0 ? (
        <>
          <Card className="border-card-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocuments.map((doc) => {
                    const config = statusConfig[doc.verificationStatus];
                    const StatusIcon = config.icon;

                    return (
                      <TableRow key={doc.id} data-testid={`document-row-${doc.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">{doc.fileName}</p>
                              <p className="text-sm text-muted-foreground">
                                {documentTypeLabels[doc.documentType] || doc.documentType}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/applications/${doc.applicationId}`}>
                            <span className="font-mono text-sm hover:underline cursor-pointer" data-testid={`link-app-${doc.id}`}>
                              {doc.applicationNumber}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>{doc.studentName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${config.bg} ${config.text} border-0 gap-1`}
                          >
                            <StatusIcon className={`h-3 w-3 ${config.iconColor}`} />
                            {doc.verificationStatus.charAt(0).toUpperCase() + doc.verificationStatus.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-menu-${doc.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(doc.fileUrl, '_blank')}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Document
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.fileUrl;
                                link.download = doc.fileName;
                                link.click();
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              {doc.verificationStatus === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => openVerifyDialog(doc, "verified")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVerifyDialog(doc, "rejected")}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
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

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredDocuments.length)} of {filteredDocuments.length} documents
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
      ) : (
        <Card className="border-card-border">
          <CardContent className="py-16">
            <EmptyState
              icon={FileText}
              title="No Documents Found"
              description={search || statusFilter !== "all" || typeFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Documents will appear here once uploaded"}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={!!verifyingDoc} onOpenChange={() => setVerifyingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyAction === "verified" ? "Approve Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === "verified" 
                ? "Confirm that this document meets all requirements" 
                : "Provide a reason for rejecting this document"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {verifyingDoc && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{verifyingDoc.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {documentTypeLabels[verifyingDoc.documentType] || verifyingDoc.documentType}
                </p>
                <p className="text-sm text-muted-foreground">
                  Application: {verifyingDoc.applicationNumber} - {verifyingDoc.studentName}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks {verifyAction === "rejected" && <span className="text-destructive">*</span>}</Label>
              <Textarea
                id="remarks"
                placeholder={verifyAction === "verified" ? "Optional notes..." : "Reason for rejection..."}
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
                data-testid="input-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyingDoc(null)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifyMutation.isPending || (verifyAction === "rejected" && !verifyRemarks.trim())}
              className={verifyAction === "rejected" ? "bg-destructive text-destructive-foreground" : ""}
              data-testid="button-confirm"
            >
              {verifyMutation.isPending ? "Processing..." : verifyAction === "verified" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
