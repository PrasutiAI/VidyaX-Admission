import { Badge } from "@/components/ui/badge";
import { type ApplicationStatus, statusLabels, statusColors } from "@shared/schema";

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "default";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  const colors = statusColors[status];
  const label = statusLabels[status];

  return (
    <Badge 
      variant="outline" 
      className={`${colors.bg} ${colors.text} border-0 ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
    >
      {label}
    </Badge>
  );
}
