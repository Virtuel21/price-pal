/// <reference types="chrome" />

import type { ExtensionSettings, HistoryEntry, UndoSnapshot, ReplacementRule } from '@/types/extension';

const DEFAULT_SETTINGS: ExtensionSettings = {
  allowedDomains: ['localhost', '127.0.0.1'],
  defaultSelector: '.price',
  defaultRegexCleanup: '[€$£\\s]',
  safetyThreshold: 10,
  templates: [
    {
      id: 'json-price',
      name: 'JSON Price Field',
      oldPricePattern: '"price":\\s*"?([\\d.,]+)"?',
      isRegex: true,
      formatOption: 'dot',
    },
    {
      id: 'html-price',
      name: 'HTML Price Span',
      oldPricePattern: '([\\d.,]+)',
      isRegex: true,
      contextAnchorBefore: '<span class="price">',
      contextAnchorAfter: '</span>',
      formatOption: 'keep',
    },
    {
      id: 'simple-decimal',
      name: 'Simple Decimal',
      oldPricePattern: '12.90',
      isRegex: false,
      formatOption: 'dot',
    },
  ],
};

// Check if we're in a Chrome extension context
const isExtension = typeof chrome !== 'undefined' && chrome?.storage?.sync;

export async function getSettings(): Promise<ExtensionSettings> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.sync.get('settings', (result) => {
        const s = result.settings as Partial<ExtensionSettings> | undefined;
        resolve({ ...DEFAULT_SETTINGS, ...s });
      });
    });
  }
  
  const stored = localStorage.getItem('priceUpdater_settings');
  if (stored) {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ settings: updated }, resolve);
    });
  }
  
  localStorage.setItem('priceUpdater_settings', JSON.stringify(updated));
}

export async function getHistory(): Promise<HistoryEntry[]> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get('history', (result) => {
        resolve((result.history as HistoryEntry[]) || []);
      });
    });
  }
  
  const stored = localStorage.getItem('priceUpdater_history');
  return stored ? JSON.parse(stored) : [];
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  history.unshift(entry);
  
  // Keep only last 100 entries
  const trimmed = history.slice(0, 100);
  
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ history: trimmed }, resolve);
    });
  }
  
  localStorage.setItem('priceUpdater_history', JSON.stringify(trimmed));
}

export async function clearHistory(): Promise<void> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ history: [] }, resolve);
    });
  }
  
  localStorage.setItem('priceUpdater_history', JSON.stringify([]));
}

export async function saveUndoSnapshot(snapshot: UndoSnapshot): Promise<void> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get('undoSnapshots', (result) => {
        const snapshots = result.undoSnapshots || {};
        snapshots[snapshot.tabId] = snapshot;
        chrome.storage.local.set({ undoSnapshots: snapshots }, resolve);
      });
    });
  }
  
  const stored = localStorage.getItem('priceUpdater_undoSnapshots');
  const snapshots = stored ? JSON.parse(stored) : {};
  snapshots[snapshot.tabId] = snapshot;
  localStorage.setItem('priceUpdater_undoSnapshots', JSON.stringify(snapshots));
}

export async function getUndoSnapshot(tabId: number): Promise<UndoSnapshot | null> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get('undoSnapshots', (result) => {
        const snapshots = result.undoSnapshots || {};
        resolve(snapshots[tabId] || null);
      });
    });
  }
  
  const stored = localStorage.getItem('priceUpdater_undoSnapshots');
  const snapshots = stored ? JSON.parse(stored) : {};
  return snapshots[tabId] || null;
}

export async function clearUndoSnapshot(tabId: number): Promise<void> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get('undoSnapshots', (result) => {
        const snapshots = result.undoSnapshots || {};
        delete snapshots[tabId];
        chrome.storage.local.set({ undoSnapshots: snapshots }, resolve);
      });
    });
  }
  
  const stored = localStorage.getItem('priceUpdater_undoSnapshots');
  const snapshots = stored ? JSON.parse(stored) : {};
  delete snapshots[tabId];
  localStorage.setItem('priceUpdater_undoSnapshots', JSON.stringify(snapshots));
}

export async function saveTemplate(template: ReplacementRule): Promise<void> {
  const settings = await getSettings();
  const index = settings.templates.findIndex(t => t.id === template.id);
  
  if (index >= 0) {
    settings.templates[index] = template;
  } else {
    settings.templates.push(template);
  }
  
  await saveSettings({ templates: settings.templates });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const settings = await getSettings();
  settings.templates = settings.templates.filter(t => t.id !== templateId);
  await saveSettings({ templates: settings.templates });
}

export async function exportTemplates(): Promise<string> {
  const settings = await getSettings();
  return JSON.stringify(settings.templates, null, 2);
}

export async function importTemplates(json: string): Promise<void> {
  const templates = JSON.parse(json) as ReplacementRule[];
  await saveSettings({ templates });
}
