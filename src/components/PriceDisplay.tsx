import { cn } from "@/lib/utils";
import { Clock, ExternalLink } from "lucide-react";

interface PriceDisplayProps {
  price: string;
  rawValue?: string;
  sourceUrl?: string;
  timestamp?: string;
  className?: string;
}

export function PriceDisplay({ 
  price, 
  rawValue, 
  sourceUrl, 
  timestamp,
  className 
}: PriceDisplayProps) {
  return (
    <div className={cn("glass-panel p-4 space-y-3 animate-fade-in", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          Extracted Price
        </span>
        {rawValue && rawValue !== price && (
          <span className="text-xs text-muted-foreground">
            Raw: <code className="font-mono">{rawValue}</code>
          </span>
        )}
      </div>
      
      <div className="price-badge text-lg">
        {price}
      </div>
      
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {timestamp && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>
        )}
        {sourceUrl && (
          <div className="flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[200px]" title={sourceUrl}>
              {new URL(sourceUrl).hostname}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
