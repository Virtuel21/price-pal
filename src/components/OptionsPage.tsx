import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Save, 
  History,
  Settings,
  FileCode,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getSettings, 
  saveSettings, 
  getHistory, 
  clearHistory,
  exportTemplates,
  importTemplates,
  deleteTemplate,
  saveTemplate,
} from "@/lib/storage";
import type { ExtensionSettings, HistoryEntry, ReplacementRule } from "@/types/extension";

export function OptionsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<ReplacementRule | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSettings();
    const h = await getHistory();
    setSettings(s);
    setHistory(h);
  };

  const handleSaveSettings = async () => {
    if (settings) {
      await saveSettings(settings);
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
      });
    }
  };

  const handleAddDomain = () => {
    if (newDomain && settings) {
      const domain = newDomain.trim().toLowerCase();
      if (!settings.allowedDomains.includes(domain)) {
        setSettings({
          ...settings,
          allowedDomains: [...settings.allowedDomains, domain],
        });
        setNewDomain('');
      }
    }
  };

  const handleRemoveDomain = (domain: string) => {
    if (settings) {
      setSettings({
        ...settings,
        allowedDomains: settings.allowedDomains.filter(d => d !== domain),
      });
    }
  };

  const handleExportTemplates = async () => {
    const json = await exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'price-updater-templates.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Templates exported",
      description: "File downloaded successfully",
    });
  };

  const handleImportTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          await importTemplates(json);
          await loadData();
          toast({
            title: "Templates imported",
            description: "Templates have been loaded successfully",
          });
        } catch (error) {
          toast({
            title: "Import failed",
            description: "Invalid JSON file",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate(templateId);
    await loadData();
    toast({
      title: "Template deleted",
    });
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
    toast({
      title: "History cleared",
    });
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">$</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Price Updater</h1>
              <p className="text-sm text-muted-foreground">Extension Settings</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="domains" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="domains" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Domains
            </TabsTrigger>
            <TabsTrigger value="defaults" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Defaults
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="domains">
            <Card>
              <CardHeader>
                <CardTitle>Allowed Domains</CardTitle>
                <CardDescription>
                  The extension will only work on these CMS domains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="cms.example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  />
                  <Button onClick={handleAddDomain}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {settings.allowedDomains.map((domain) => (
                    <div
                      key={domain}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <code className="text-sm font-mono">{domain}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDomain(domain)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaults">
            <Card>
              <CardHeader>
                <CardTitle>Default Settings</CardTitle>
                <CardDescription>
                  Configure default values for scraping and safety
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default CSS Selector</Label>
                  <Input
                    value={settings.defaultSelector}
                    onChange={(e) => setSettings({ ...settings, defaultSelector: e.target.value })}
                    placeholder=".price"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to extract prices from source pages
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Regex Cleanup</Label>
                  <Input
                    value={settings.defaultRegexCleanup}
                    onChange={(e) => setSettings({ ...settings, defaultRegexCleanup: e.target.value })}
                    placeholder="[€$£\s]"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Characters matching this pattern will be removed from extracted prices
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Safety Threshold</Label>
                  <Input
                    type="number"
                    value={settings.safetyThreshold}
                    onChange={(e) => setSettings({ ...settings, safetyThreshold: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of replacements allowed before blocking
                  </p>
                </div>

                <Button onClick={handleSaveSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Replacement Templates</CardTitle>
                    <CardDescription>
                      Saved patterns for quick replacement
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportTemplates}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Import
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportTemplates}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{template.name}</h4>
                      <code className="text-xs text-muted-foreground font-mono block">
                        {template.isRegex ? `/${template.oldPricePattern}/` : `"${template.oldPricePattern}"`}
                      </code>
                      {template.contextAnchorBefore && (
                        <p className="text-xs text-muted-foreground">
                          Context: {template.contextAnchorBefore}...{template.contextAnchorAfter}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {settings.templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates saved yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Replacement History</CardTitle>
                    <CardDescription>
                      Log of all price replacements
                    </CardDescription>
                  </div>
                  {history.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearHistory}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-destructive line-through">
                            {entry.oldPrice}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm font-mono text-success">
                            {entry.newPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{entry.matchCount} matches</span>
                          <span>{entry.domain}</span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {history.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No replacements yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
