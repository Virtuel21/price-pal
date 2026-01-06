import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceUrlInputProps {
  defaultSelector?: string;
  defaultRegexCleanup?: string;
  isLoading?: boolean;
  onFetch: (url: string, selector: string, regexCleanup: string) => void;
  className?: string;
}

export function SourceUrlInput({
  defaultSelector = '.price',
  defaultRegexCleanup = '[€$£\\s]',
  isLoading = false,
  onFetch,
  className,
}: SourceUrlInputProps) {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState(defaultSelector);
  const [regexCleanup, setRegexCleanup] = useState(defaultRegexCleanup);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onFetch(url.trim(), selector, regexCleanup);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label htmlFor="source-url" className="text-xs text-muted-foreground">
          Source URL
        </Label>
        <div className="flex gap-2">
          <Input
            id="source-url"
            type="url"
            placeholder="https://competitor.com/product"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(showAdvanced && "bg-secondary")}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="space-y-3 p-3 rounded-md bg-muted/30 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="selector" className="text-xs text-muted-foreground">
              CSS Selector
            </Label>
            <Input
              id="selector"
              placeholder=".price, #price-value"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regex-cleanup" className="text-xs text-muted-foreground">
              Regex Cleanup (remove matched chars)
            </Label>
            <Input
              id="regex-cleanup"
              placeholder="[€$£\s]"
              value={regexCleanup}
              onChange={(e) => setRegexCleanup(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!url.trim() || isLoading}
        className="w-full"
        variant="glow"
      >
        <Download className="w-4 h-4" />
        {isLoading ? 'Fetching...' : 'Fetch Price'}
      </Button>
    </form>
  );
}
