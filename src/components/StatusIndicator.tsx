import { cn } from "@/lib/utils";
import type { ExtensionStatus } from "@/types/extension";

interface StatusIndicatorProps {
  status: ExtensionStatus;
  className?: string;
}

const statusConfig: Record<ExtensionStatus, { color: string; label: string }> = {
  idle: { color: 'status-idle', label: 'Ready' },
  fetching: { color: 'status-warning', label: 'Fetching...' },
  ready: { color: 'status-success', label: 'Price Ready' },
  previewing: { color: 'status-warning', label: 'Previewing...' },
  applying: { color: 'status-warning', label: 'Applying...' },
  success: { color: 'status-success', label: 'Success' },
  error: { color: 'status-error', label: 'Error' },
};

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("status-indicator", config.color)} />
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
