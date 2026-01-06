import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReplacementRule } from "@/types/extension";
import { cn } from "@/lib/utils";

interface ReplacementRuleFormProps {
  templates?: ReplacementRule[];
  onRuleChange: (rule: ReplacementRule) => void;
  className?: string;
}

export function ReplacementRuleForm({
  templates = [],
  onRuleChange,
  className,
}: ReplacementRuleFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [rule, setRule] = useState<ReplacementRule>({
    id: 'custom',
    name: 'Custom Rule',
    oldPricePattern: '',
    isRegex: false,
    formatOption: 'dot',
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId === 'custom') {
      const customRule: ReplacementRule = {
        id: 'custom',
        name: 'Custom Rule',
        oldPricePattern: '',
        isRegex: false,
        formatOption: 'dot',
      };
      setRule(customRule);
      onRuleChange(customRule);
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setRule(template);
        onRuleChange(template);
      }
    }
  };

  const updateRule = (updates: Partial<ReplacementRule>) => {
    const updated = { ...rule, ...updates };
    setRule(updated);
    onRuleChange(updated);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Template</Label>
        <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Rule</SelectItem>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Old Price Pattern
        </Label>
        <Input
          placeholder={rule.isRegex ? "price:\\s*([\\d.,]+)" : "12.90"}
          value={rule.oldPricePattern}
          onChange={(e) => updateRule({ oldPricePattern: e.target.value })}
          className="font-mono text-xs"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="is-regex" className="text-xs text-muted-foreground">
          Use Regex
        </Label>
        <Switch
          id="is-regex"
          checked={rule.isRegex}
          onCheckedChange={(checked) => updateRule({ isRegex: checked })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Context Before
          </Label>
          <Input
            placeholder='<span class="price">'
            value={rule.contextAnchorBefore || ''}
            onChange={(e) => updateRule({ contextAnchorBefore: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Context After
          </Label>
          <Input
            placeholder="</span>"
            value={rule.contextAnchorAfter || ''}
            onChange={(e) => updateRule({ contextAnchorAfter: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Decimal Format
          </Label>
          <Select 
            value={rule.formatOption} 
            onValueChange={(v) => updateRule({ formatOption: v as 'keep' | 'comma' | 'dot' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">Keep Original</SelectItem>
              <SelectItem value="dot">Use Dot (12.90)</SelectItem>
              <SelectItem value="comma">Use Comma (12,90)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Currency Symbol
          </Label>
          <Input
            placeholder="€"
            value={rule.currencySymbol || ''}
            onChange={(e) => updateRule({ currencySymbol: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
      </div>

      {rule.currencySymbol && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Currency Position
          </Label>
          <Select 
            value={rule.currencyPosition || 'none'} 
            onValueChange={(v) => updateRule({ currencyPosition: v as 'before' | 'after' | 'none' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Symbol</SelectItem>
              <SelectItem value="before">Before (€12.90)</SelectItem>
              <SelectItem value="after">After (12.90€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
