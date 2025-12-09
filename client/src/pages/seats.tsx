import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Plus, Users, Save, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AdmissionCycle, GradeSeatConfig, InsertGradeSeatConfig } from "@shared/schema";
import { gradeOptions } from "@shared/schema";

export default function Seats() {
  const searchParams = useSearch();
  const urlCycleId = new URLSearchParams(searchParams).get("cycleId") || "";
  
  const [selectedCycleId, setSelectedCycleId] = useState(urlCycleId);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GradeSeatConfig | null>(null);
  const { toast } = useToast();

  const { data: cycles, isLoading: cyclesLoading } = useQuery<AdmissionCycle[]>({
    queryKey: ["/api/admission/cycles"],
  });

  const { data: seatConfigs, isLoading: seatsLoading } = useQuery<GradeSeatConfig[]>({
    queryKey: ["/api/admission/cycles", selectedCycleId, "seats"],
    enabled: !!selectedCycleId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertGradeSeatConfig) => {
      return apiRequest("POST", `/api/admission/cycles/${selectedCycleId}/seats`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles", selectedCycleId, "seats"] });
      setIsAddDialogOpen(false);
      toast({ title: "Seat configuration added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add configuration", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ gradeId, data }: { gradeId: string; data: Partial<InsertGradeSeatConfig> }) => {
      return apiRequest("PUT", `/api/admission/cycles/${selectedCycleId}/seats/${gradeId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admission/cycles", selectedCycleId, "seats"] });
      setEditingConfig(null);
      toast({ title: "Seat configuration updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update configuration", description: error.message, variant: "destructive" });
    },
  });

  const selectedCycle = cycles?.find(c => c.id === selectedCycleId);
  const isLoading = cyclesLoading || (selectedCycleId && seatsLoading);

  const configuredGrades = seatConfigs?.map(c => c.gradeId) || [];
  const availableGrades = gradeOptions.filter(g => !configuredGrades.includes(g.id));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Seat Management" description="Configure and manage seat availability by grade" />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seat Management"
        description="Configure and manage seat availability by grade"
      >
        {selectedCycleId && availableGrades.length > 0 && (
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-grade">
            <Plus className="h-4 w-4 mr-2" />
            Add Grade
          </Button>
        )}
      </PageHeader>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Select Admission Cycle</CardTitle>
          <CardDescription>Choose a cycle to view and manage seat configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="max-w-md" data-testid="select-cycle">
              <SelectValue placeholder="Select an admission cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles?.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.cycleName} ({cycle.academicYear}) - {cycle.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCycleId && (
        <>
          {seatConfigs && seatConfigs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {seatConfigs.map((config) => {
                const filled = config.totalSeats - config.availableSeats;
                const percentage = (filled / config.totalSeats) * 100;
                
                return (
                  <Card key={config.id} className="border-card-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-lg font-medium">{config.gradeName}</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEditingConfig(config)}
                          data-testid={`button-edit-${config.gradeId}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-semibold">{config.totalSeats}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{filled}</p>
                          <p className="text-xs text-muted-foreground">Filled</p>
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{config.availableSeats}</p>
                          <p className="text-xs text-muted-foreground">Available</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Seat Utilization</span>
                          <span>{percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>

                      {config.managementQuota > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            Management Quota: <span className="font-medium text-foreground">{config.managementQuota}</span>
                          </p>
                        </div>
                      )}

                      {config.reservedSeats && Object.keys(config.reservedSeats).length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Reserved Categories:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(config.reservedSeats).map(([category, seats]) => (
                              <span 
                                key={category}
                                className="text-xs bg-muted px-2 py-1 rounded"
                              >
                                {category}: {seats}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-card-border">
              <CardContent className="py-8">
                <EmptyState
                  icon={Users}
                  title="No Seat Configuration"
                  description="Add seat configurations for grades in this admission cycle"
                  action={
                    availableGrades.length > 0 && (
                      <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-grade">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Grade Configuration
                      </Button>
                    )
                  }
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedCycleId && (
        <Card className="border-card-border">
          <CardContent className="py-8">
            <EmptyState
              icon={Users}
              title="Select an Admission Cycle"
              description="Choose a cycle from above to view and manage seat configurations"
            />
          </CardContent>
        </Card>
      )}

      <SeatConfigDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        availableGrades={availableGrades}
        cycleId={selectedCycleId}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {editingConfig && (
        <SeatConfigDialog
          open={!!editingConfig}
          onOpenChange={() => setEditingConfig(null)}
          config={editingConfig}
          cycleId={selectedCycleId}
          onSubmit={(data) => updateMutation.mutate({ gradeId: editingConfig.gradeId, data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

interface SeatConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: GradeSeatConfig;
  availableGrades?: typeof gradeOptions;
  cycleId: string;
  onSubmit: (data: InsertGradeSeatConfig) => void;
  isPending: boolean;
}

function SeatConfigDialog({ 
  open, 
  onOpenChange, 
  config, 
  availableGrades,
  cycleId,
  onSubmit, 
  isPending 
}: SeatConfigDialogProps) {
  const [formData, setFormData] = useState<Partial<InsertGradeSeatConfig>>({
    admissionCycleId: cycleId,
    gradeId: config?.gradeId || "",
    gradeName: config?.gradeName || "",
    totalSeats: config?.totalSeats || 30,
    managementQuota: config?.managementQuota || 0,
    availableSeats: config?.availableSeats || 30,
    reservedSeats: config?.reservedSeats || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as InsertGradeSeatConfig);
  };

  const handleGradeChange = (gradeId: string) => {
    const grade = gradeOptions.find(g => g.id === gradeId);
    setFormData(prev => ({
      ...prev,
      gradeId,
      gradeName: grade?.name || "",
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config ? "Edit Seat Configuration" : "Add Grade Configuration"}</DialogTitle>
          <DialogDescription>
            {config 
              ? `Update seat configuration for ${config.gradeName}`
              : "Set up seat allocation for a new grade"
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {!config && availableGrades && (
              <div className="space-y-2">
                <Label>Grade *</Label>
                <Select value={formData.gradeId} onValueChange={handleGradeChange}>
                  <SelectTrigger data-testid="select-grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalSeats">Total Seats *</Label>
                <Input
                  id="totalSeats"
                  type="number"
                  min="1"
                  value={formData.totalSeats}
                  onChange={(e) => {
                    const total = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      totalSeats: total,
                      availableSeats: total - (prev.managementQuota || 0),
                    }));
                  }}
                  data-testid="input-total-seats"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managementQuota">Management Quota</Label>
                <Input
                  id="managementQuota"
                  type="number"
                  min="0"
                  max={formData.totalSeats}
                  value={formData.managementQuota}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    managementQuota: Number(e.target.value),
                  }))}
                  data-testid="input-management-quota"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availableSeats">Available Seats</Label>
              <Input
                id="availableSeats"
                type="number"
                min="0"
                max={formData.totalSeats}
                value={formData.availableSeats}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availableSeats: Number(e.target.value),
                }))}
                data-testid="input-available-seats"
              />
              <p className="text-xs text-muted-foreground">
                Adjust this to account for already enrolled students
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || (!config && !formData.gradeId)} data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              {isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
