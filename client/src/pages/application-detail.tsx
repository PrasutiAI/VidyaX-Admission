import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  PenLine,
  GraduationCap,
  ClipboardCheck,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FormSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { 
  AdmissionApplication, 
  ApplicationDocument, 
  ApplicationStatusHistory,
  ApplicationStatus 
} from "@shared/schema";
import { gradeOptions, applicationStatusEnum, statusLabels, statusColors } from "@shared/schema";

const statusFlow: ApplicationStatus[] = [
  "inquiry",
  "application_submitted",
  "documents_pending",
  "documents_verified",
  "entrance_test_scheduled",
  "entrance_test_completed",
  "interview_scheduled",
  "interview_completed",
  "under_review",
  "offer_extended",
  "offer_accepted",
  "enrolled",
];

const documentVerificationColors = {
  pending: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-300" },
  verified: { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-300" },
  rejected: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300" },
};

const documentTypeLabels: Record<string, string> = {
  birth_certificate: "Birth Certificate",
  transfer_certificate: "Transfer Certificate",
  previous_report_card: "Previous Report Card",
  category_certificate: "Category Certificate",
  address_proof: "Address Proof",
  passport_photo: "Passport Photo",
  medical_certificate: "Medical Certificate",
  other: "Other Document",
};

interface ApplicationWithRelations extends AdmissionApplication {
  documents?: ApplicationDocument[];
  statusHistory?: ApplicationStatusHistory[];
}

export default function ApplicationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isScreeningDialogOpen, setIsScreeningDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [screeningType, setScreeningType] = useState<"entrance" | "interview">("entrance");
  const [screeningData, setScreeningData] = useState({
    date: "",
    score: "",
    notes: "",
  });
  const [isDocVerifyDialogOpen, setIsDocVerifyDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ApplicationDocument | null>(null);
  const [docVerifyAction, setDocVerifyAction] = useState<"verified" | "rejected">("verified");
  const [docVerifyRemarks, setDocVerifyRemarks] = useState("");

  const { data: application, isLoading } = useQuery<ApplicationWithRelations>({
    queryKey: ["/api/admission/applications", params.id],
  });

  const statusMutation = useMutation({
    mutationFn: async (data: { status: string; remarks?: string }) => {
      return apiRequest("PATCH", `/api/admission/applications/${params.id}/status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications", params.id] });
      setIsStatusDialogOpen(false);
      setNewStatus("");
      setStatusRemarks("");
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const screeningMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = screeningType === "entrance" 
        ? `/api/admission/applications/${params.id}/entrance-test/score`
        : `/api/admission/applications/${params.id}/interview/result`;
      return apiRequest("PUT", endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications", params.id] });
      setIsScreeningDialogOpen(false);
      setScreeningData({ date: "", score: "", notes: "" });
      toast({ title: `${screeningType === "entrance" ? "Entrance test" : "Interview"} results saved` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save results", description: error.message, variant: "destructive" });
    },
  });

  const documentVerifyMutation = useMutation({
    mutationFn: async (data: { docId: string; status: "verified" | "rejected"; remarks?: string }) => {
      return apiRequest("PATCH", `/api/admission/applications/${params.id}/documents/${data.docId}/verify`, {
        status: data.status,
        remarks: data.remarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/applications", params.id] });
      setIsDocVerifyDialogOpen(false);
      setSelectedDocument(null);
      setDocVerifyRemarks("");
      toast({ title: `Document ${docVerifyAction} successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update document", description: error.message, variant: "destructive" });
    },
  });

  const openDocVerifyDialog = (doc: ApplicationDocument, action: "verified" | "rejected") => {
    setSelectedDocument(doc);
    setDocVerifyAction(action);
    setDocVerifyRemarks("");
    setIsDocVerifyDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Application Details" />
        <FormSkeleton />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <PageHeader title="Application Not Found" />
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={FileText}
              title="Application Not Found"
              description="The application you're looking for doesn't exist or has been removed"
              action={
                <Link href="/applications">
                  <Button>Back to Applications</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusIndex = statusFlow.indexOf(application.status);
  const progressPercentage = ((currentStatusIndex + 1) / statusFlow.length) * 100;

  const getNextStatuses = () => {
    const currentIndex = applicationStatusEnum.indexOf(application.status);
    return applicationStatusEnum.filter((_, index) => index > currentIndex);
  };

  const openScreeningDialog = (type: "entrance" | "interview") => {
    setScreeningType(type);
    setScreeningData({
      date: type === "entrance" 
        ? (application.entranceTestDate || "") 
        : (application.interviewDate || ""),
      score: type === "entrance"
        ? (application.entranceTestScore || "")
        : (application.interviewScore || ""),
      notes: type === "interview" ? (application.interviewNotes || "") : "",
    });
    setIsScreeningDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${application.studentFirstName} ${application.studentLastName}`}
        description={`Application ${application.applicationNumber}`}
      >
        <Button variant="outline" onClick={() => navigate("/applications")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={() => setIsStatusDialogOpen(true)} data-testid="button-change-status">
          <PenLine className="h-4 w-4 mr-2" />
          Change Status
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-medium">Application Status</CardTitle>
                  <CardDescription>Track the progress of this application</CardDescription>
                </div>
                <StatusBadge status={application.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Application Submitted</span>
                  <span>Enrolled</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
              <TabsTrigger value="guardian" data-testid="tab-guardian">Guardian</TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoItem label="Full Name" value={`${application.studentFirstName} ${application.studentLastName}`} />
                    <InfoItem 
                      label="Grade Applied For" 
                      value={gradeOptions.find(g => g.id === application.gradeAppliedFor)?.name || application.gradeAppliedFor} 
                    />
                    <InfoItem label="Date of Birth" value={format(new Date(application.dateOfBirth), "MMMM d, yyyy")} />
                    <InfoItem label="Gender" value={application.gender.charAt(0).toUpperCase() + application.gender.slice(1)} />
                    <InfoItem label="Nationality" value={application.nationality} />
                    <InfoItem label="Blood Group" value={application.bloodGroup || "-"} />
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Current Address
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {application.currentAddress.street}, {application.currentAddress.city}, {application.currentAddress.state} - {application.currentAddress.pincode}, {application.currentAddress.country}
                    </p>
                  </div>

                  {application.previousSchoolName && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Previous School
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <InfoItem label="School Name" value={application.previousSchoolName} />
                          <InfoItem label="Grade" value={application.previousGrade || "-"} />
                          <InfoItem label="Marks" value={application.previousMarks ? `${application.previousMarks}%` : "-"} />
                          <InfoItem label="TC Number" value={application.transferCertificateNumber || "-"} />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guardian">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Guardian Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Father's Information</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoItem label="Name" value={application.fatherName} />
                      <InfoItem label="Occupation" value={application.fatherOccupation || "-"} />
                      <InfoItem 
                        label="Contact" 
                        value={application.fatherContact}
                        icon={<Phone className="h-4 w-4" />}
                      />
                      <InfoItem 
                        label="Email" 
                        value={application.fatherEmail}
                        icon={<Mail className="h-4 w-4" />}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-3">Mother's Information</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoItem label="Name" value={application.motherName} />
                      <InfoItem label="Occupation" value={application.motherOccupation || "-"} />
                      <InfoItem 
                        label="Contact" 
                        value={application.motherContact || "-"}
                        icon={<Phone className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Uploaded Documents</CardTitle>
                  <CardDescription>Review and verify submitted documents</CardDescription>
                </CardHeader>
                <CardContent>
                  {application.documents && application.documents.length > 0 ? (
                    <div className="space-y-3">
                      {application.documents.map((doc) => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-4 rounded-lg border"
                          data-testid={`document-row-${doc.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.fileName}</p>
                              <p className="text-sm text-muted-foreground">
                                {documentTypeLabels[doc.documentType]} • {format(new Date(doc.uploadedAt!), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.verificationStatus === "pending" ? (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openDocVerifyDialog(doc, "verified")}
                                  data-testid={`button-verify-doc-${doc.id}`}
                                  className="text-emerald-600 hover:text-emerald-700"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Verify
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openDocVerifyDialog(doc, "rejected")}
                                  data-testid={`button-reject-doc-${doc.id}`}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Badge 
                                variant="outline"
                                className={`${documentVerificationColors[doc.verificationStatus].bg} ${documentVerificationColors[doc.verificationStatus].text} border-0`}
                              >
                                {doc.verificationStatus.charAt(0).toUpperCase() + doc.verificationStatus.slice(1)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="No Documents Uploaded"
                      description="Documents will appear here once uploaded"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Status History</CardTitle>
                  <CardDescription>Track all status changes for this application</CardDescription>
                </CardHeader>
                <CardContent>
                  {application.statusHistory && application.statusHistory.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                      <div className="space-y-6">
                        {application.statusHistory.map((history, index) => (
                          <div key={history.id} className="relative pl-10">
                            <div className={`absolute left-2 top-1 h-5 w-5 rounded-full border-2 ${
                              index === 0 ? "bg-primary border-primary" : "bg-background border-muted-foreground"
                            }`}>
                              {index === 0 && <CheckCircle2 className="h-4 w-4 text-primary-foreground absolute -left-[1px] -top-[1px]" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={history.toStatus as ApplicationStatus} size="sm" />
                                {history.fromStatus && (
                                  <span className="text-xs text-muted-foreground">
                                    from {statusLabels[history.fromStatus as ApplicationStatus]}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(history.changedAt!), "MMM d, yyyy 'at' h:mm a")}
                                {history.changedBy && ` by ${history.changedBy}`}
                              </p>
                              {history.remarks && (
                                <p className="text-sm bg-muted p-2 rounded mt-2">{history.remarks}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Clock}
                      title="No History"
                      description="Status changes will be recorded here"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Application No.</p>
                  <p className="font-mono font-medium">{application.applicationNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Applied On</p>
                  <p className="font-medium">
                    {application.applicationDate ? format(new Date(application.applicationDate), "MMMM d, yyyy") : "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  application.applicationFeeStatus === "paid" ? "bg-emerald-100 dark:bg-emerald-900" : "bg-amber-100 dark:bg-amber-900"
                }`}>
                  {application.applicationFeeStatus === "paid" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Application Fee</p>
                  <p className="font-medium capitalize">{application.applicationFeeStatus}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Screening
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Entrance Test</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openScreeningDialog("entrance")}
                    data-testid="button-entrance-test"
                  >
                    {application.entranceTestScore ? "Edit" : "Add"}
                  </Button>
                </div>
                {application.entranceTestScore ? (
                  <div className="text-sm">
                    <p>Score: <span className="font-medium">{application.entranceTestScore}</span></p>
                    {application.entranceTestDate && (
                      <p className="text-muted-foreground">
                        Date: {format(new Date(application.entranceTestDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No results recorded</p>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Interview</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openScreeningDialog("interview")}
                    data-testid="button-interview"
                  >
                    {application.interviewScore ? "Edit" : "Add"}
                  </Button>
                </div>
                {application.interviewScore ? (
                  <div className="text-sm">
                    <p>Score: <span className="font-medium">{application.interviewScore}</span></p>
                    {application.interviewDate && (
                      <p className="text-muted-foreground">
                        Date: {format(new Date(application.interviewDate), "MMM d, yyyy")}
                      </p>
                    )}
                    {application.interviewNotes && (
                      <p className="mt-2 text-muted-foreground bg-muted p-2 rounded text-xs">
                        {application.interviewNotes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No results recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Application Status</DialogTitle>
            <DialogDescription>
              Update the status of this application. Current status: {statusLabels[application.status]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-new-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {getNextStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks {newStatus === "rejected" && "(Required)"}</Label>
              <Textarea
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="Add any notes or remarks..."
                data-testid="input-status-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} data-testid="button-cancel-status">
              Cancel
            </Button>
            <Button 
              onClick={() => statusMutation.mutate({ status: newStatus, remarks: statusRemarks })}
              disabled={!newStatus || (newStatus === "rejected" && !statusRemarks) || statusMutation.isPending}
              data-testid="button-confirm-status"
            >
              {statusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScreeningDialogOpen} onOpenChange={setIsScreeningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {screeningType === "entrance" ? "Entrance Test Results" : "Interview Results"}
            </DialogTitle>
            <DialogDescription>
              Record the {screeningType === "entrance" ? "entrance test" : "interview"} results for this application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={screeningData.date}
                onChange={(e) => setScreeningData({ ...screeningData, date: e.target.value })}
                data-testid="input-screening-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={screeningData.score}
                onChange={(e) => setScreeningData({ ...screeningData, score: e.target.value })}
                placeholder="Enter score"
                data-testid="input-screening-score"
              />
            </div>
            {screeningType === "interview" && (
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={screeningData.notes}
                  onChange={(e) => setScreeningData({ ...screeningData, notes: e.target.value })}
                  placeholder="Interview notes..."
                  data-testid="input-screening-notes"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScreeningDialogOpen(false)} data-testid="button-cancel-screening">
              Cancel
            </Button>
            <Button 
              onClick={() => screeningMutation.mutate(screeningData)}
              disabled={!screeningData.score || screeningMutation.isPending}
              data-testid="button-save-screening"
            >
              {screeningMutation.isPending ? "Saving..." : "Save Results"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string; 
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium flex items-center gap-2">
        {icon}
        {value}
      </p>
    </div>
  );
}
