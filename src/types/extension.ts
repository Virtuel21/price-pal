export interface PriceSource {
  url: string;
  selector: string;
  regexCleanup?: string;
  lastFetched?: string;
  extractedPrice?: string;
  rawValue?: string;
}

export interface ReplacementRule {
  id: string;
  name: string;
  oldPricePattern: string;
  isRegex: boolean;
  contextAnchorBefore?: string;
  contextAnchorAfter?: string;
  formatOption: 'keep' | 'comma' | 'dot';
  currencySymbol?: string;
  currencyPosition?: 'before' | 'after' | 'none';
}

export interface ExtensionSettings {
  allowedDomains: string[];
  defaultSelector: string;
  defaultRegexCleanup: string;
  safetyThreshold: number;
  templates: ReplacementRule[];
}

export interface MatchResult {
  index: number;
  match: string;
  context: string;
  startPos: number;
  endPos: number;
}

export interface PreviewResult {
  matches: MatchResult[];
  newContent: string;
  originalContent: string;
}

export interface EditorInfo {
  type: 'textarea' | 'codemirror' | 'monaco' | 'contenteditable' | 'unknown';
  element: HTMLElement | null;
  content: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  sourceUrl: string;
  oldPrice: string;
  newPrice: string;
  matchCount: number;
  domain: string;
}

export interface UndoSnapshot {
  tabId: number;
  content: string;
  timestamp: string;
  url: string;
}

export type ExtensionStatus = 
  | 'idle'
  | 'fetching'
  | 'ready'
  | 'previewing'
  | 'applying'
  | 'success'
  | 'error';

export interface ExtensionState {
  status: ExtensionStatus;
  error?: string;
  priceSource?: PriceSource;
  previewResult?: PreviewResult;
  undoSnapshot?: UndoSnapshot;
  currentRule?: ReplacementRule;
}
