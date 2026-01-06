import { cn } from "@/lib/utils";
import type { MatchResult } from "@/types/extension";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface DiffPreviewProps {
  matches: MatchResult[];
  newPrice: string;
  safetyThreshold: number;
  className?: string;
}

export function DiffPreview({ 
  matches, 
  newPrice, 
  safetyThreshold,
  className 
}: DiffPreviewProps) {
  const matchCount = matches.length;
  const isOverThreshold = matchCount > safetyThreshold;
  const isEmpty = matchCount === 0;

  return (
    <div className={cn("glass-panel p-4 space-y-3 animate-fade-in", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          Preview Results
        </span>
        <div className="flex items-center gap-2">
          {isEmpty && (
            <div className="flex items-center gap-1.5 text-destructive">
              <XCircle className="w-4 h-4" />
              <span className="text-xs">No matches</span>
            </div>
          )}
          {isOverThreshold && (
            <div className="flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">Above threshold ({safetyThreshold})</span>
            </div>
          )}
          {!isEmpty && !isOverThreshold && (
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Safe to apply</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-foreground">
          {matchCount}
        </div>
        <span className="text-sm text-muted-foreground">
          match{matchCount !== 1 ? 'es' : ''} found
        </span>
      </div>

      {matches.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          {matches.slice(0, 5).map((match, i) => (
            <div key={i} className="code-block">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Match {i + 1}</span>
              </div>
              <div className="space-y-1">
                <div className="diff-removed px-2 py-0.5 rounded">
                  {highlightMatch(match.context, match.match, 'removed')}
                </div>
                <div className="diff-added px-2 py-0.5 rounded">
                  {highlightMatch(match.context.replace(match.match, newPrice), newPrice, 'added')}
                </div>
              </div>
            </div>
          ))}
          {matches.length > 5 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              ... and {matches.length - 5} more matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function highlightMatch(context: string, match: string, type: 'added' | 'removed') {
  const parts = context.split(match);
  const highlightClass = type === 'added' 
    ? 'bg-success/30 text-success font-semibold' 
    : 'bg-destructive/30 text-destructive font-semibold';

  return (
    <span>
      {parts.map((part, i) => (
        <span key={i}>
          <span className="text-muted-foreground">{truncateContext(part)}</span>
          {i < parts.length - 1 && (
            <span className={highlightClass}>{match}</span>
          )}
        </span>
      ))}
    </span>
  );
}

function truncateContext(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text;
  return '...' + text.slice(-maxLength);
}
