import { FeedItem, QRPayload, ScannedBatchDetail } from '../types/inventory';

export const KNOWN_FEED_ITEMS: Record<string, { name: string; category: string; unit: string; min_stock: number; default_qty: number }> = {
  'HF-BR-01': {
    name: 'HiFeed Broiler Starter Super',
    category: 'POULTRY',
    unit: 'SAK (50KG)',
    min_stock: 20,
    default_qty: 120,
  },
  'HF-SIL-02': {
    name: 'HiFeed Silase Jagung Fermentasi',
    category: 'RUMINANT',
    unit: 'DRUM (100KG)',
    min_stock: 10,
    default_qty: 45,
  },
};

export const DEFAULT_FEED_ITEMS: FeedItem[] = [
  {
    id: 1,
    sku: 'HF-BR-01',
    name: 'HiFeed Broiler Starter Super',
    category: 'POULTRY',
    unit: 'SAK (50KG)',
    min_stock: 20,
    current_stock: 120,
    is_low_stock: false,
  },
  {
    id: 2,
    sku: 'HF-SIL-02',
    name: 'HiFeed Silase Jagung Fermentasi',
    category: 'RUMINANT',
    unit: 'DRUM (100KG)',
    min_stock: 10,
    current_stock: 45,
    is_low_stock: false,
  },
];

export const SAMPLE_PRESETS: ScannedBatchDetail[] = [
  {
    sku: 'HF-BR-01',
    batch_number: 'BATCH-2026-HF01-A',
    expired_date: '2026-12-31',
    name: 'HiFeed Broiler Starter Super',
    category: 'POULTRY',
    unit: 'SAK (50KG)',
    current_qty: 120,
    rawPayload: JSON.stringify({
      batch_number: 'BATCH-2026-HF01-A',
      sku: 'HF-BR-01',
      expired_date: '2026-12-31',
    }),
  },
  {
    sku: 'HF-SIL-02',
    batch_number: 'BATCH-2026-HF02-B',
    expired_date: '2026-11-30',
    name: 'HiFeed Silase Jagung Fermentasi',
    category: 'RUMINANT',
    unit: 'DRUM (100KG)',
    current_qty: 45,
    rawPayload: JSON.stringify({
      batch_number: 'BATCH-2026-HF02-B',
      sku: 'HF-SIL-02',
      expired_date: '2026-11-30',
    }),
  },
];

export interface ParseResult {
  isValid: boolean;
  error?: string;
  data?: ScannedBatchDetail;
}

/**
 * Validates and parses scanned QR or barcode text.
 * Expects either JSON structure { batch_number, sku, expired_date }
 * or recognized batch/sku strings.
 */
export function validateAndParseQR(rawText: string): ParseResult {
  if (!rawText || typeof rawText !== 'string') {
    return { isValid: false, error: 'Empty scanned data' };
  }

  const trimmed = rawText.trim();

  // 1. Try parsing JSON format
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const { batch_number, sku, expired_date } = parsed;

      if (!batch_number || typeof batch_number !== 'string' || batch_number.trim() === '') {
        return {
          isValid: false,
          error: 'QR is missing required "batch_number" property',
        };
      }

      if (!sku || typeof sku !== 'string' || sku.trim() === '') {
        return {
          isValid: false,
          error: 'QR is missing required "sku" property',
        };
      }

      const known = KNOWN_FEED_ITEMS[sku.trim().toUpperCase()];
      const resolvedName = known ? known.name : `Feed Product (${sku})`;
      const resolvedCategory = known ? known.category : 'GENERAL';
      const resolvedUnit = known ? known.unit : 'UNIT';
      const resolvedQty = known ? known.default_qty : 50;

      const detail: ScannedBatchDetail = {
        sku: sku.trim().toUpperCase(),
        batch_number: batch_number.trim(),
        expired_date: (expired_date && typeof expired_date === 'string') ? expired_date.trim() : '2026-12-31',
        name: resolvedName,
        category: resolvedCategory,
        unit: resolvedUnit,
        current_qty: resolvedQty,
        rawPayload: trimmed,
      };

      return {
        isValid: true,
        data: detail,
      };
    }
  } catch {
    // Not JSON, check if it's formatted string barcode
  }

  // 2. Barcode fallback: e.g. "BATCH-2026-HF01-A|HF-BR-01|2026-12-31" or "BATCH-2026-HF01-A"
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    if (parts.length >= 2) {
      const batch_number = parts[0].trim();
      const sku = parts[1].trim().toUpperCase();
      const expired_date = parts[2]?.trim() || '2026-12-31';

      if (batch_number && sku) {
        const known = KNOWN_FEED_ITEMS[sku];
        const detail: ScannedBatchDetail = {
          sku,
          batch_number,
          expired_date,
          name: known ? known.name : `Feed Product (${sku})`,
          category: known ? known.category : 'GENERAL',
          unit: known ? known.unit : 'UNIT',
          current_qty: known ? known.default_qty : 50,
          rawPayload: JSON.stringify({ batch_number, sku, expired_date }),
        };
        return { isValid: true, data: detail };
      }
    }
  }

  // 3. Known single batch/sku fallback matching
  if (trimmed.startsWith('BATCH-') || trimmed.startsWith('HF-')) {
    const matchedPreset = SAMPLE_PRESETS.find(
      (p) => p.batch_number.toLowerCase() === trimmed.toLowerCase() || p.sku.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedPreset) {
      return { isValid: true, data: matchedPreset };
    }
  }

  return {
    isValid: false,
    error: 'Unrecognized QR/Barcode structure. Expected HiFeed format with batch_number & sku.',
  };
}
