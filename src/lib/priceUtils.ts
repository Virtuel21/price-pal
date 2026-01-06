/**
 * Normalize a price string to a canonical format
 * Handles: "12,90", "12.90", "12 €", "€12.90", "12.90€", etc.
 */
export function normalizePrice(rawPrice: string): string {
  // Remove currency symbols and whitespace
  let cleaned = rawPrice
    .replace(/[€$£¥₹]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/\s+/g, '')
    .trim();

  // Handle European format (comma as decimal)
  // If we have both comma and dot, comma is likely thousands separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Check position - if comma is after dot, comma is decimal
    const commaPos = cleaned.lastIndexOf(',');
    const dotPos = cleaned.lastIndexOf('.');
    
    if (commaPos > dotPos) {
      // Comma is decimal separator (European: 1.234,56)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal separator (US: 1,234.56)
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Only comma - could be decimal separator
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  // Parse to number and back to ensure valid format
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return rawPrice.trim();
  }

  return num.toFixed(2);
}

/**
 * Format a normalized price with specified options
 */
export function formatPrice(
  normalizedPrice: string,
  options: {
    separator: 'comma' | 'dot' | 'keep';
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after' | 'none';
  }
): string {
  let result = normalizedPrice;

  // Apply decimal separator
  if (options.separator === 'comma') {
    result = result.replace('.', ',');
  }
  // 'dot' or 'keep' leaves it as is (already dot format)

  // Apply currency symbol
  if (options.currencySymbol && options.currencyPosition !== 'none') {
    if (options.currencyPosition === 'before') {
      result = `${options.currencySymbol}${result}`;
    } else {
      result = `${result}${options.currencySymbol}`;
    }
  }

  return result;
}

/**
 * Apply regex cleanup to extracted price
 */
export function applyRegexCleanup(value: string, regexPattern: string): string {
  if (!regexPattern) return value;
  
  try {
    const regex = new RegExp(regexPattern, 'g');
    return value.replace(regex, '');
  } catch (e) {
    console.error('Invalid regex pattern:', regexPattern, e);
    return value;
  }
}

/**
 * Extract price from text using selector result
 */
export function extractPrice(text: string, regexCleanup?: string): string {
  let cleaned = text;
  
  if (regexCleanup) {
    cleaned = applyRegexCleanup(cleaned, regexCleanup);
  }
  
  return normalizePrice(cleaned);
}

/**
 * Build search pattern from rule
 */
export function buildSearchPattern(rule: {
  oldPricePattern: string;
  isRegex: boolean;
  contextAnchorBefore?: string;
  contextAnchorAfter?: string;
}): RegExp {
  let pattern = rule.isRegex 
    ? rule.oldPricePattern 
    : escapeRegex(rule.oldPricePattern);

  // Add context anchors if specified
  if (rule.contextAnchorBefore) {
    pattern = `(${escapeRegex(rule.contextAnchorBefore)})${pattern}`;
  }
  if (rule.contextAnchorAfter) {
    pattern = `${pattern}(${escapeRegex(rule.contextAnchorAfter)})`;
  }

  return new RegExp(pattern, 'g');
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find all matches in content
 */
export function findMatches(
  content: string,
  rule: {
    oldPricePattern: string;
    isRegex: boolean;
    contextAnchorBefore?: string;
    contextAnchorAfter?: string;
  }
): Array<{
  index: number;
  match: string;
  context: string;
  startPos: number;
  endPos: number;
}> {
  const pattern = buildSearchPattern(rule);
  const matches: Array<{
    index: number;
    match: string;
    context: string;
    startPos: number;
    endPos: number;
  }> = [];

  let match;
  let index = 0;

  while ((match = pattern.exec(content)) !== null) {
    const startPos = match.index;
    const endPos = startPos + match[0].length;
    
    // Get surrounding context (50 chars before and after)
    const contextStart = Math.max(0, startPos - 50);
    const contextEnd = Math.min(content.length, endPos + 50);
    const context = content.slice(contextStart, contextEnd);

    matches.push({
      index: index++,
      match: match[0],
      context,
      startPos,
      endPos,
    });
  }

  return matches;
}

/**
 * Apply replacement to content
 */
export function applyReplacement(
  content: string,
  rule: {
    oldPricePattern: string;
    isRegex: boolean;
    contextAnchorBefore?: string;
    contextAnchorAfter?: string;
  },
  newPrice: string,
  formatOptions: {
    separator: 'comma' | 'dot' | 'keep';
    currencySymbol?: string;
    currencyPosition?: 'before' | 'after' | 'none';
  }
): string {
  const formattedPrice = formatPrice(newPrice, formatOptions);
  const pattern = buildSearchPattern(rule);

  return content.replace(pattern, (match, ...groups) => {
    // If we have context anchors, preserve them
    let result = formattedPrice;
    
    if (rule.contextAnchorBefore && groups[0]) {
      result = groups[0] + result;
    }
    if (rule.contextAnchorAfter) {
      const afterIndex = rule.contextAnchorBefore ? 1 : 0;
      if (groups[afterIndex]) {
        result = result + groups[afterIndex];
      }
    }
    
    return result;
  });
}
