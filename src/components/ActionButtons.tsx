import { Button } from "@/components/ui/button";
import { Search, Play, Undo2 } from "lucide-react";
import type { ExtensionStatus } from "@/types/extension";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  status: ExtensionStatus;
  hasPrice: boolean;
  hasPreview: boolean;
  canApply: boolean;
  canUndo: boolean;
  onFindMatches: () => void;
  onApply: () => void;
  onUndo: () => void;
  className?: string;
}

export function ActionButtons({
  status,
  hasPrice,
  hasPreview,
  canApply,
  canUndo,
  onFindMatches,
  onApply,
  onUndo,
  className,
}: ActionButtonsProps) {
  const isWorking = status === 'fetching' || status === 'previewing' || status === 'applying';

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        variant="outline"
        disabled={!hasPrice || isWorking}
        onClick={onFindMatches}
        className="w-full"
      >
        <Search className="w-4 h-4" />
        {status === 'previewing' ? 'Finding...' : 'Find Matches'}
      </Button>

      <Button
        variant="success"
        disabled={!canApply || isWorking}
        onClick={onApply}
        className="w-full"
      >
        <Play className="w-4 h-4" />
        {status === 'applying' ? 'Applying...' : 'Apply Replacement'}
      </Button>

      <Button
        variant="destructive"
        disabled={!canUndo || isWorking}
        onClick={onUndo}
        className="w-full"
      >
        <Undo2 className="w-4 h-4" />
        Undo Last Change
      </Button>
    </div>
  );
}
