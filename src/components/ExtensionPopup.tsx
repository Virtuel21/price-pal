import { useState, useEffect } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { PriceDisplay } from "./PriceDisplay";
import { DiffPreview } from "./DiffPreview";
import { SourceUrlInput } from "./SourceUrlInput";
import { ReplacementRuleForm } from "./ReplacementRuleForm";
import { ActionButtons } from "./ActionButtons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSettings, saveUndoSnapshot, getUndoSnapshot, addHistoryEntry } from "@/lib/storage";
import { extractPrice, findMatches, applyReplacement, formatPrice } from "@/lib/priceUtils";
import type { 
  ExtensionState, 
  ExtensionSettings, 
  ReplacementRule, 
  PreviewResult,
  PriceSource,
} from "@/types/extension";

export function ExtensionPopup() {
  const { toast } = useToast();
  const [state, setState] = useState<ExtensionState>({ status: 'idle' });
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [currentRule, setCurrentRule] = useState<ReplacementRule | null>(null);
  const [isOnAllowedDomain, setIsOnAllowedDomain] = useState(true);
  const [editorContent, setEditorContent] = useState<string>('');
  const [currentTabId, setCurrentTabId] = useState<number>(0);

  useEffect(() => {
    loadSettings();
    checkCurrentTab();
  }, []);

  const loadSettings = async () => {
    const s = await getSettings();
    setSettings(s);
  };

  const checkCurrentTab = async () => {
    // In a real extension, we'd check chrome.tabs.query
    // For demo, we'll simulate being on an allowed domain
    setIsOnAllowedDomain(true);
    setCurrentTabId(1);
    
    // Simulate getting editor content
    setEditorContent(`{
  "products": [
    {
      "name": "Widget Pro",
      "price": "12.90",
      "currency": "EUR"
    },
    {
      "name": "Widget Basic",
      "price": "8.50",
      "currency": "EUR"
    }
  ]
}`);
  };

  const handleFetchPrice = async (url: string, selector: string, regexCleanup: string) => {
    setState(prev => ({ ...prev, status: 'fetching', error: undefined }));

    try {
      // In a real extension, this would use chrome.tabs or fetch with CORS handling
      // For demo, we'll simulate fetching a price
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulated extracted value
      const rawValue = "€14,90";
      const normalizedPrice = extractPrice(rawValue, regexCleanup);
      
      const priceSource: PriceSource = {
        url,
        selector,
        regexCleanup,
        lastFetched: new Date().toISOString(),
        extractedPrice: normalizedPrice,
        rawValue,
      };

      setState(prev => ({ 
        ...prev, 
        status: 'ready',
        priceSource,
        previewResult: undefined,
      }));

      toast({
        title: "Price extracted",
        description: `Found: ${normalizedPrice}`,
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch price',
      }));
      
      toast({
        title: "Error",
        description: "Failed to fetch price from source",
        variant: "destructive",
      });
    }
  };

  const handleFindMatches = async () => {
    if (!currentRule || !state.priceSource?.extractedPrice) return;

    setState(prev => ({ ...prev, status: 'previewing' }));

    try {
      const matches = findMatches(editorContent, currentRule);
      
      const previewResult: PreviewResult = {
        matches,
        originalContent: editorContent,
        newContent: applyReplacement(
          editorContent, 
          currentRule, 
          state.priceSource.extractedPrice,
          {
            separator: currentRule.formatOption === 'keep' ? 'dot' : currentRule.formatOption,
            currencySymbol: currentRule.currencySymbol,
            currencyPosition: currentRule.currencyPosition,
          }
        ),
      };

      setState(prev => ({ ...prev, status: 'ready', previewResult }));

      if (matches.length === 0) {
        toast({
          title: "No matches found",
          description: "The pattern didn't match any content in the editor",
          variant: "destructive",
        });
      } else {
        toast({
          title: `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`,
          description: "Review the preview before applying",
        });
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to find matches',
      }));
    }
  };

  const handleApply = async () => {
    if (!state.previewResult || !state.priceSource) return;

    setState(prev => ({ ...prev, status: 'applying' }));

    try {
      // Save undo snapshot
      await saveUndoSnapshot({
        tabId: currentTabId,
        content: state.previewResult.originalContent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });

      // In a real extension, we'd inject the new content into the editor
      setEditorContent(state.previewResult.newContent);

      // Add to history
      await addHistoryEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        sourceUrl: state.priceSource.url,
        oldPrice: currentRule?.oldPricePattern || '',
        newPrice: state.priceSource.extractedPrice || '',
        matchCount: state.previewResult.matches.length,
        domain: window.location.hostname,
      });

      setState(prev => ({ 
        ...prev, 
        status: 'success',
        undoSnapshot: {
          tabId: currentTabId,
          content: state.previewResult!.originalContent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        },
      }));

      toast({
        title: "Replacement applied",
        description: `Updated ${state.previewResult.matches.length} occurrence${state.previewResult.matches.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to apply replacement',
      }));
      
      toast({
        title: "Error",
        description: "Failed to apply replacement",
        variant: "destructive",
      });
    }
  };

  const handleUndo = async () => {
    const snapshot = await getUndoSnapshot(currentTabId);
    
    if (snapshot) {
      setEditorContent(snapshot.content);
      setState(prev => ({ ...prev, status: 'idle', previewResult: undefined }));
      
      toast({
        title: "Undo successful",
        description: "Content restored to previous state",
      });
    } else {
      toast({
        title: "Nothing to undo",
        description: "No previous snapshot found for this tab",
        variant: "destructive",
      });
    }
  };

  const canApply = !!(
    state.previewResult && 
    state.previewResult.matches.length > 0 &&
    state.previewResult.matches.length <= (settings?.safetyThreshold || 10)
  );

  if (!isOnAllowedDomain) {
    return (
      <div className="w-80 p-4 bg-background text-foreground">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="w-12 h-12 text-warning mb-4" />
          <h2 className="text-lg font-semibold mb-2">Not on allowed domain</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This extension only works on configured CMS domains.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.open('#/options', '_blank')}>
            <Settings className="w-4 h-4 mr-2" />
            Configure Domains
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 min-h-[500px] bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">$</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">Price Updater</h1>
            <StatusIndicator status={state.status} />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => window.open('#/options', '_blank')}>
          <Settings className="w-4 h-4" />
        </Button>
      </header>

      <Tabs defaultValue="scrape" className="w-full">
        <TabsList className="w-full grid grid-cols-2 p-1 mx-4 mt-4" style={{ width: 'calc(100% - 2rem)' }}>
          <TabsTrigger value="scrape">Scrape</TabsTrigger>
          <TabsTrigger value="replace">Replace</TabsTrigger>
        </TabsList>

        <TabsContent value="scrape" className="p-4 space-y-4">
          <SourceUrlInput
            defaultSelector={settings?.defaultSelector}
            defaultRegexCleanup={settings?.defaultRegexCleanup}
            isLoading={state.status === 'fetching'}
            onFetch={handleFetchPrice}
          />

          {state.priceSource?.extractedPrice && (
            <PriceDisplay
              price={state.priceSource.extractedPrice}
              rawValue={state.priceSource.rawValue}
              sourceUrl={state.priceSource.url}
              timestamp={state.priceSource.lastFetched}
            />
          )}

          {state.error && (
            <div className="glass-panel p-3 border-destructive/50 bg-destructive/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <p className="text-xs text-destructive">{state.error}</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="replace" className="p-4 space-y-4">
          {state.priceSource?.extractedPrice ? (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm">New price ready</span>
                </div>
                <span className="price-badge">{state.priceSource.extractedPrice}</span>
              </div>

              <ReplacementRuleForm
                templates={settings?.templates}
                onRuleChange={setCurrentRule}
              />

              {state.previewResult && (
                <DiffPreview
                  matches={state.previewResult.matches}
                  newPrice={formatPrice(
                    state.priceSource.extractedPrice,
                    {
                      separator: currentRule?.formatOption === 'keep' ? 'dot' : (currentRule?.formatOption || 'dot'),
                      currencySymbol: currentRule?.currencySymbol,
                      currencyPosition: currentRule?.currencyPosition,
                    }
                  )}
                  safetyThreshold={settings?.safetyThreshold || 10}
                />
              )}

              <ActionButtons
                status={state.status}
                hasPrice={!!state.priceSource?.extractedPrice}
                hasPreview={!!state.previewResult}
                canApply={canApply}
                canUndo={!!state.undoSnapshot}
                onFindMatches={handleFindMatches}
                onApply={handleApply}
                onUndo={handleUndo}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-sm font-medium mb-2">No price fetched</h3>
              <p className="text-xs text-muted-foreground">
                Go to the Scrape tab to fetch a price first
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Editor Preview (for demo) */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            Editor Content (Demo)
          </span>
        </div>
        <pre className="code-block max-h-32 overflow-auto text-[10px]">
          {editorContent}
        </pre>
      </div>
    </div>
  );
}
