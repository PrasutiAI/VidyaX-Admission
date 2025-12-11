import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Plus,
  CalendarRange,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Play,
  Pause,
  Archive,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AdmissionCycle, InsertAdmissionCycle } from "@shared/schema";

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" },
  open: { bg: "bg-emerald-100 dark:bg-emerald-900", text: "text-emerald-700 dark:text-emerald-300" },
  closed: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-300" },
  archived: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

export default function Cycles() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<AdmissionCycle | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<AdmissionCycle | null>(null);
  const { toast } = useToast();

  const { data: cycles, isLoading } = useQuery<AdmissionCycle[]>({
    queryKey: ["/api/admission/cycles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAdmissionCycle) => {
      return apiRequest("POST", "/api/admission/cycles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles"] });
      setIsCreateOpen(false);
      toast({ title: "Cycle created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create cycle", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAdmissionCycle> }) => {
      return apiRequest("PUT", `/api/admission/cycles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles"] });
      setEditingCycle(null);
      toast({ title: "Cycle updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update cycle", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admission/cycles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles"] });
      setDeletingCycle(null);
      toast({ title: "Cycle deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete cycle", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admission/cycles/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles/active"] });
      toast({ title: "Cycle status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admission Cycles" description="Manage admission cycles for different academic years" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admission Cycles"
        description="Manage admission cycles for different academic years"
      >
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-cycle">
          <Plus className="h-4 w-4 mr-2" />
          New Cycle
        </Button>
      </PageHeader>

      {cycles && cycles.length > 0 ? (
        <Card className="border-card-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Name</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.id} data-testid={`cycle-row-${cycle.id}`}>
                    <TableCell className="font-medium">{cycle.cycleName}</TableCell>
                    <TableCell>{cycle.academicYear}</TableCell>
                    <TableCell>{format(new Date(cycle.startDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(cycle.endDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${statusColors[cycle.status]?.bg} ${statusColors[cycle.status]?.text} border-0`}
                      >
                        {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-cycle-menu-${cycle.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/applications?cycleId=${cycle.id}`}>
                            <DropdownMenuItem data-testid={`menu-view-applications-${cycle.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Applications
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => setEditingCycle(cycle)} data-testid={`menu-edit-${cycle.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {cycle.status === "draft" && (
                            <DropdownMenuItem 
                              onClick={() => statusMutation.mutate({ id: cycle.id, status: "open" })}
                              data-testid={`menu-open-${cycle.id}`}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Open Cycle
                            </DropdownMenuItem>
                          )}
                          {cycle.status === "open" && (
                            <DropdownMenuItem 
                              onClick={() => statusMutation.mutate({ id: cycle.id, status: "closed" })}
                              data-testid={`menu-close-${cycle.id}`}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Close Cycle
                            </DropdownMenuItem>
                          )}
                          {cycle.status === "closed" && (
                            <DropdownMenuItem 
                              onClick={() => statusMutation.mutate({ id: cycle.id, status: "archived" })}
                              data-testid={`menu-archive-${cycle.id}`}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive Cycle
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeletingCycle(cycle)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-delete-${cycle.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
      ) : (
        <Card className="border-card-border">
          <CardContent className="py-8">
            <EmptyState
              icon={CalendarRange}
              title="No Admission Cycles"
              description="Create your first admission cycle to start accepting applications"
              action={
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-cycle">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Cycle
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      <CycleFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {editingCycle && (
        <CycleFormDialog
          open={!!editingCycle}
          onOpenChange={() => setEditingCycle(null)}
          cycle={editingCycle}
          onSubmit={(data) => updateMutation.mutate({ id: editingCycle.id, data })}
          isPending={updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!deletingCycle} onOpenChange={() => setDeletingCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admission Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingCycle?.cycleName}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCycle && deleteMutation.mutate(deletingCycle.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: AdmissionCycle;
  onSubmit: (data: InsertAdmissionCycle) => void;
  isPending: boolean;
}

function CycleFormDialog({ open, onOpenChange, cycle, onSubmit, isPending }: CycleFormDialogProps) {
  const [formData, setFormData] = useState<Partial<InsertAdmissionCycle>>({
    cycleName: cycle?.cycleName || "",
    academicYear: cycle?.academicYear || "",
    startDate: cycle?.startDate || "",
    endDate: cycle?.endDate || "",
    status: cycle?.status || "draft",
    applicationFeeAmount: cycle?.applicationFeeAmount || "500",
  });
  const [isReviewMode, setIsReviewMode] = useState(false);

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setIsReviewMode(true);
  };

  const handleSubmit = () => {
    onSubmit(formData as InsertAdmissionCycle);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setIsReviewMode(false);
    }
    onOpenChange(openState);
  };

  const statusLabel = {
    draft: "Draft",
    open: "Open",
    closed: "Closed",
    archived: "Archived",
  }[formData.status || "draft"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {!isReviewMode ? (
          <>
            <DialogHeader>
              <DialogTitle>{cycle ? "Edit Cycle" : "Create Admission Cycle"}</DialogTitle>
              <DialogDescription>
                {cycle ? "Update the admission cycle details" : "Set up a new admission cycle for applicants"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContinueToReview}>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cycleName">Cycle Name *</Label>
                    <Input
                      id="cycleName"
                      placeholder="e.g., Fall Admissions 2025"
                      value={formData.cycleName}
                      onChange={(e) => setFormData({ ...formData, cycleName: e.target.value })}
                      required
                      data-testid="input-cycle-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year *</Label>
                    <Input
                      id="academicYear"
                      placeholder="e.g., 2025-2026"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      required
                      data-testid="input-academic-year"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger id="status" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="applicationFee">Application Fee</Label>
                    <Input
                      id="applicationFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.applicationFeeAmount}
                      onChange={(e) => setFormData({ ...formData, applicationFeeAmount: e.target.value })}
                      data-testid="input-application-fee"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleClose(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-continue-review">
                  Continue to Review
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle>Review & Submit</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsReviewMode(false)}
                  data-testid="button-edit-review"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                Review your admission cycle details before submitting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md border p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Cycle Name</p>
                    <p className="font-medium" data-testid="review-cycle-name">{formData.cycleName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Academic Year</p>
                    <p className="font-medium" data-testid="review-academic-year">{formData.academicYear}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium" data-testid="review-start-date">
                      {formData.startDate ? format(new Date(formData.startDate), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium" data-testid="review-end-date">
                      {formData.endDate ? format(new Date(formData.endDate), "MMM d, yyyy") : "-"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge 
                      variant="outline" 
                      className={`${statusColors[formData.status || "draft"]?.bg} ${statusColors[formData.status || "draft"]?.text} border-0`}
                      data-testid="review-status"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Application Fee</p>
                    <p className="font-medium" data-testid="review-application-fee">
                      {formData.applicationFeeAmount ? `$${formData.applicationFeeAmount}` : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReviewMode(false)} data-testid="button-back-edit">
                Back to Edit
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit">
                {isPending ? "Saving..." : cycle ? "Update Cycle" : "Create Cycle"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
