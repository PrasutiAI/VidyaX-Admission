import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Trash2,
  FileText,
  Calendar,
  GraduationCap,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
};

const notificationColors: Record<string, { bg: string; text: string; icon: string }> = {
  info: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: "text-blue-600" },
  success: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", icon: "text-emerald-600" },
  warning: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", icon: "text-amber-600" },
  error: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", icon: "text-red-600" },
};

export default function Notifications() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const filteredNotifications = notifications?.filter((n) => {
    if (filter === "unread" && n.isRead) return false;
    if (filter === "read" && !n.isRead) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  }) || [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleMarkSelectedRead = () => {
    selectedIds.forEach(id => {
      const notification = notifications?.find(n => n.id === id);
      if (notification && !notification.isRead) {
        markReadMutation.mutate(id);
      }
    });
    setSelectedIds(new Set());
    toast({ title: `${selectedIds.size} notifications marked as read` });
  };

  const getRelatedLink = (notification: Notification) => {
    if (notification.relatedEntityType === "application" && notification.relatedEntityId) {
      return `/applications/${notification.relatedEntityId}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notifications" description="Stay updated with admission activities" />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with admission activities"
      >
        <div className="flex items-center gap-2">
          {unreadCount && unreadCount.count > 0 && (
            <Badge variant="secondary" className="gap-1">
              {unreadCount.count} unread
            </Badge>
          )}
          <Button 
            variant="outline" 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || !unreadCount?.count}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filter} onValueChange={(v: "all" | "unread" | "read") => setFilter(v)}>
            <SelectTrigger className="w-32" data-testid="filter-read-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32" data-testid="filter-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={handleMarkSelectedRead} data-testid="button-mark-selected-read">
              <Check className="h-4 w-4 mr-2" />
              Mark Read
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} data-testid="button-clear-selection">
              Clear
            </Button>
          </div>
        )}
      </div>

      {filteredNotifications.length > 0 ? (
        <Card className="border-card-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Info;
                const colors = notificationColors[notification.type] || notificationColors.info;
                const relatedLink = getRelatedLink(notification);

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 transition-colors ${
                      !notification.isRead ? "bg-muted/30" : ""
                    }`}
                    data-testid={`notification-row-${notification.id}`}
                  >
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={() => toggleSelect(notification.id)}
                      className="mt-1"
                      data-testid={`checkbox-${notification.id}`}
                    />
                    
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className={`font-medium ${!notification.isRead ? "" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`${colors.bg} ${colors.text} border-0 text-xs`}>
                            {notification.type}
                          </Badge>
                          {!notification.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex items-center gap-2">
                          {relatedLink && (
                            <Link href={relatedLink}>
                              <Button variant="ghost" size="sm" data-testid={`button-view-${notification.id}`}>
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          )}
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markReadMutation.mutate(notification.id)}
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-card-border">
          <CardContent className="py-16">
            <EmptyState
              icon={Bell}
              title="No Notifications"
              description={
                filter === "unread" 
                  ? "You have no unread notifications" 
                  : "You don't have any notifications yet"
              }
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
