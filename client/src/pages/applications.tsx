import { useState, useMemo, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import type { AdmissionApplication, AdmissionCycle, ApplicationStatus } from "@shared/schema";
import { gradeOptions, applicationStatusEnum, statusLabels } from "@shared/schema";

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

interface ApplicationFilters {
  search: string;
  cycleId: string;
  gradeId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export default function Applications() {
  const searchParams = useSearch();
  const urlCycleId = new URLSearchParams(searchParams).get("cycleId") || "";
  
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  
  const [filters, setFilters] = useState<ApplicationFilters>({
    search: "",
    cycleId: urlCycleId,
    gradeId: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: applications, isLoading } = useQuery<AdmissionApplication[]>({
    queryKey: ["/api/admission/applications"],
  });

  const { data: cycles } = useQuery<AdmissionCycle[]>({
    queryKey: ["/api/admission/cycles"],
  });

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.cycleId) count++;
    if (filters.gradeId) count++;
    if (filters.status) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const filteredApplications = useMemo(() => {
    if (!applications) return [];
    
    return applications.filter((app) => {
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matchesSearch = 
          app.applicationNumber.toLowerCase().includes(searchLower) ||
          app.studentFirstName.toLowerCase().includes(searchLower) ||
          app.studentLastName.toLowerCase().includes(searchLower) ||
          app.fatherEmail.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      if (filters.cycleId && app.admissionCycleId !== filters.cycleId) return false;
      if (filters.gradeId && app.gradeAppliedFor !== filters.gradeId) return false;
      if (filters.status && app.status !== filters.status) return false;
      
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        const appDate = app.applicationDate ? new Date(app.applicationDate) : null;
        if (!appDate || appDate < fromDate) return false;
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        const appDate = app.applicationDate ? new Date(app.applicationDate) : null;
        if (!appDate || appDate > toDate) return false;
      }
      
      return true;
    });
  }, [applications, filters, debouncedSearch]);

  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredApplications.slice(start, start + itemsPerPage);
  }, [filteredApplications, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);

  const clearFilters = () => {
    setSearchInput("");
    setFilters({
      search: "",
      cycleId: "",
      gradeId: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    });
    setPage(1);
  };

  const removeFilter = (key: keyof ApplicationFilters) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
    setPage(1);
  };

  const currentPageIds = useMemo(() => new Set(paginatedApplications.map(app => app.id)), [paginatedApplications]);
  const currentPageSelected = useMemo(() => 
    paginatedApplications.filter(app => selectedIds.has(app.id)).length,
    [paginatedApplications, selectedIds]
  );
  const isAllCurrentPageSelected = currentPageSelected === paginatedApplications.length && paginatedApplications.length > 0;
  const isSomeCurrentPageSelected = currentPageSelected > 0 && currentPageSelected < paginatedApplications.length;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        currentPageIds.forEach(id => next.delete(id));
      } else {
        currentPageIds.forEach(id => next.add(id));
      }
      return next;
    });
  }, [currentPageIds, isAllCurrentPageSelected]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const exportToCSV = useCallback(() => {
    const dataToExport = selectedIds.size > 0 
      ? filteredApplications.filter(app => selectedIds.has(app.id))
      : filteredApplications;

    const headers = ["Application No", "First Name", "Last Name", "Grade", "Status", "Applied Date", "Father Email", "Father Phone"];
    const rows = dataToExport.map(app => [
      app.applicationNumber || "",
      app.studentFirstName || "",
      app.studentLastName || "",
      gradeOptions.find(g => g.id === app.gradeAppliedFor)?.name || app.gradeAppliedFor || "",
      statusLabels[app.status as ApplicationStatus] || app.status || "",
      app.applicationDate ? format(new Date(app.applicationDate), "yyyy-MM-dd") : "",
      app.fatherEmail || "",
      app.fatherPhone || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredApplications, selectedIds]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Applications" description="View and manage admission applications" />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="View and manage admission applications"
      >
        <Link href="/applications/new">
          <Button data-testid="button-new-application">
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, number, or email..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-filters">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Applications</SheetTitle>
                <SheetDescription>
                  Apply filters to narrow down the application list
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Admission Cycle</Label>
                  <Select 
                    value={filters.cycleId} 
                    onValueChange={(value) => {
                      setFilters({ ...filters, cycleId: value === "all" ? "" : value });
                      setPage(1);
                    }}
                  >
                    <SelectTrigger data-testid="filter-cycle">
                      <SelectValue placeholder="All cycles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cycles</SelectItem>
                      {cycles?.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {cycle.cycleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select 
                    value={filters.gradeId}
                    onValueChange={(value) => {
                      setFilters({ ...filters, gradeId: value === "all" ? "" : value });
                      setPage(1);
                    }}
                  >
                    <SelectTrigger data-testid="filter-grade">
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All grades</SelectItem>
                      {gradeOptions.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={filters.status}
                    onValueChange={(value) => {
                      setFilters({ ...filters, status: value === "all" ? "" : value });
                      setPage(1);
                    }}
                  >
                    <SelectTrigger data-testid="filter-status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {applicationStatusEnum.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Application Date Range</Label>
                  <div className="grid gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filters.dateFrom}
                      onChange={(e) => {
                        setFilters({ ...filters, dateFrom: e.target.value });
                        setPage(1);
                      }}
                      data-testid="filter-date-from"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={filters.dateTo}
                      onChange={(e) => {
                        setFilters({ ...filters, dateTo: e.target.value });
                        setPage(1);
                      }}
                      data-testid="filter-date-to"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    Clear All
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => setIsFilterOpen(false)}
                    data-testid="button-apply-filters"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" className="gap-2" onClick={exportToCSV} data-testid="button-export">
            <Download className="h-4 w-4" />
            Export
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedIds.size}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select 
            value={itemsPerPage.toString()} 
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-20" data-testid="select-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.cycleId && (
            <Badge variant="secondary" className="gap-1">
              Cycle: {cycles?.find(c => c.id === filters.cycleId)?.cycleName}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("cycleId")} 
              />
            </Badge>
          )}
          {filters.gradeId && (
            <Badge variant="secondary" className="gap-1">
              Grade: {gradeOptions.find(g => g.id === filters.gradeId)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("gradeId")} 
              />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusLabels[filters.status as ApplicationStatus]}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter("status")} 
              />
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="gap-1">
              Date: {filters.dateFrom || "..."} to {filters.dateTo || "..."}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setFilters(prev => ({ ...prev, dateFrom: "", dateTo: "" }));
                  setPage(1);
                }} 
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-all-filters">
            Clear all
          </Button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button variant="outline" size="sm" onClick={exportToCSV} data-testid="button-bulk-export">
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} data-testid="button-clear-selection">
            Clear Selection
          </Button>
        </div>
      )}

      {paginatedApplications.length > 0 ? (
        <>
          <Card className="border-card-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllCurrentPageSelected ? true : isSomeCurrentPageSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Application No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedApplications.map((app) => (
                    <TableRow key={app.id} data-testid={`application-row-${app.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(app.id)}
                          onCheckedChange={() => toggleSelectOne(app.id)}
                          data-testid={`checkbox-${app.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{app.applicationNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {app.studentFirstName[0]}{app.studentLastName[0]}
                          </div>
                          <span className="font-medium">
                            {app.studentFirstName} {app.studentLastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {gradeOptions.find(g => g.id === app.gradeAppliedFor)?.name || app.gradeAppliedFor}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.applicationDate ? format(new Date(app.applicationDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-app-menu-${app.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/applications/${app.id}`}>
                              <DropdownMenuItem data-testid={`menu-view-${app.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, filteredApplications.length)} of {filteredApplications.length} applications
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
              <span className="text-sm">
                Page {page} of {totalPages || 1}
              </span>
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
          <CardContent className="py-8">
            <EmptyState
              icon={FileText}
              title="No Applications Found"
              description={activeFiltersCount > 0 
                ? "No applications match your current filters. Try adjusting or clearing them."
                : "Start by submitting your first admission application"
              }
              action={
                activeFiltersCount > 0 ? (
                  <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-empty">
                    Clear Filters
                  </Button>
                ) : (
                  <Link href="/applications/new">
                    <Button data-testid="button-create-first-application">
                      <Plus className="h-4 w-4 mr-2" />
                      New Application
                    </Button>
                  </Link>
                )
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
