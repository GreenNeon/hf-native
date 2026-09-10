import { Platform } from 'react-native';
import {
  ApiResponse,
  InboundRequest,
  InboundResponse,
  ScanDispatchRequest,
  ScanDispatchResponse,
  StockBatch,
  StockMutation,
} from '../types/inventory';
import { KNOWN_FEED_ITEMS } from '../utils/qrParser';

// Base URL
let currentApiBaseUrl = 'http://192.168.1.71:3000';

export const OPERATOR_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-user-id': 'staff-01',
  'x-user-role': 'field_operator',
};

export function getApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export function setApiBaseUrl(url: string) {
  currentApiBaseUrl = url.replace(/\/+$/, '');
  apiLogger.info('CONFIG', `API base URL set to: ${currentApiBaseUrl}`);
}

/**
 * Structured logger for API debugging and diagnostics
 */
export const apiLogger = {
  info: (action: string, message: string, payload?: any) => {
    const time = new Date().toLocaleTimeString();
    console.log(
      `\x1b[36m[API INFO ${time}]\x1b[0m [${action}] ${message}`,
      payload !== undefined ? JSON.stringify(payload, null, 2) : ''
    );
  },
  debug: (action: string, message: string, payload?: any) => {
    const time = new Date().toLocaleTimeString();
    console.log(
      `\x1b[35m[API DEBUG ${time}]\x1b[0m [${action}] ${message}`,
      payload !== undefined ? JSON.stringify(payload, null, 2) : ''
    );
  },
  error: (action: string, message: string, err?: any) => {
    const time = new Date().toLocaleTimeString();
    console.error(
      `\x1b[31m[API ERROR ${time}]\x1b[0m [${action}] ${message}`,
      err?.stack || err?.message || err || ''
    );
  },
};

/**
 * Robust fetch wrapper with logging, timeouts, and Android emulator loopback fallback
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit,
  timeoutMs = 15000
): Promise<T> {
  const method = options.method || 'GET';
  let targetUrl = `${currentApiBaseUrl}${endpoint}`;

  apiLogger.info(
    `${method} ${endpoint}`,
    `Calling ${targetUrl}`,
    options.body ? JSON.parse(options.body as string) : undefined
  );

  const executeRequest = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      apiLogger.error(`${method} ${endpoint}`, `Request timed out after ${timeoutMs}ms`);
      controller.abort();
    }, timeoutMs);

    try {
      const startTime = Date.now();
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      const duration = Date.now() - startTime;
      apiLogger.debug(
        `${method} ${endpoint}`,
        `HTTP ${res.status} ${res.statusText} (${duration}ms)`
      );
      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let response: Response;

  try {
    response = await executeRequest(targetUrl);
  } catch (err: any) {
    // If running on Android emulator and localhost fails, attempt 10.0.2.2 fallback
    const isNetworkError =
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('failed') ||
      err.message?.toLowerCase().includes('network');

    if (Platform.OS === 'android' && currentApiBaseUrl.includes('localhost') && isNetworkError) {
      const fallbackUrl = `http://10.0.2.2:3000${endpoint}`;
      apiLogger.info(
        `${method} ${endpoint}`,
        `Android localhost connection failed. Attempting emulator host 10.0.2.2: ${fallbackUrl}`
      );
      try {
        response = await executeRequest(fallbackUrl);
        // Persist successful fallback
        currentApiBaseUrl = 'http://10.0.2.2:3000';
        apiLogger.info('CONFIG', `Switched active base URL to ${currentApiBaseUrl}`);
      } catch (fallbackErr: any) {
        apiLogger.error(
          `${method} ${endpoint}`,
          `Both http://192.168.1.71:3000 and 10.0.2.2:3000 failed`,
          fallbackErr
        );
        throw fallbackErr;
      }
    } else {
      apiLogger.error(`${method} ${endpoint}`, `Fetch call failed`, err);
      throw err;
    }
  }

  // Parse response
  let json: any;
  const rawText = await response.text();

  try {
    json = JSON.parse(rawText);
  } catch {
    apiLogger.error(`${method} ${endpoint}`, `Non-JSON response from server: ${rawText}`);
    throw new Error(`Server returned non-JSON response (HTTP ${response.status})`);
  }

  apiLogger.debug(`${method} ${endpoint}`, `Response body:`, json);

  // Check server-level success
  if (!response.ok || json.success === false) {
    const errorMsg =
      json.error?.message ||
      json.message ||
      `Request failed with status ${response.status}`;
    apiLogger.error(
      `${method} ${endpoint}`,
      `API returned failure: ${errorMsg} (Code: ${json.error?.code || response.status})`
    );
    throw new Error(errorMsg);
  }

  return json.data as T;
}

// In-memory fallback mutation ledger
let localMutationHistory: StockMutation[] = [
  {
    id: 101,
    type: 'INBOUND',
    quantity: 50,
    feed_item: {
      id: 1,
      name: 'HiFeed Broiler Starter Super',
      sku: 'HF-BR-01',
    },
    batch_item: {
      id: 1,
      batch_number: 'BATCH-2026-HF01-A',
    },
    notes: 'Initial production inbound from Mill 01',
    created_by: 'staff-01',
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
  {
    id: 102,
    type: 'DISPATCH',
    quantity: 15,
    feed_item: {
      id: 1,
      name: 'HiFeed Broiler Starter Super',
      sku: 'HF-BR-01',
    },
    batch_item: {
      id: 1,
      batch_number: 'BATCH-2026-HF01-A',
    },
    notes: 'Dispatch to Partner Farm Subang',
    created_by: 'staff-01',
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
];

// Mock stock tracker for fallback
const mockBatchStock: Record<string, number> = {
  'BATCH-2026-HF01-A': 120,
  'BATCH-2026-HF02-B': 45,
};

/**
 * Record an Inbound stock mutation
 * POST /api/v1/inventory/inbound
 */
export async function submitInbound(payload: InboundRequest): Promise<InboundResponse> {
  apiLogger.info('INBOUND', 'Submitting stock inbound mutation...', payload);

  try {
    const data = await apiFetch<InboundResponse>('/api/v1/inventory/inbound', {
      method: 'POST',
      headers: OPERATOR_HEADERS,
      body: JSON.stringify(payload),
    });

    apiLogger.info('INBOUND', 'Inbound mutation successful!', data);

    // Record locally for history preview
    localMutationHistory.unshift({
      id: data.mutation_id,
      type: 'INBOUND',
      quantity: data.quantity_added,
      feed_item: {
        id: 1,
        name: KNOWN_FEED_ITEMS[payload.sku]?.name || payload.sku,
        sku: payload.sku,
      },
      batch_item: {
        id: data.batch_id,
        batch_number: payload.batch_number,
      },
      notes: payload.notes || 'Inbound scan',
      created_by: data.created_by || 'staff-01',
      created_at: data.created_at || new Date().toISOString(),
    });

    return data;
  } catch (err: any) {
    apiLogger.error('INBOUND', `Inbound failed: ${err.message}`, err);
    throw err;
  }
}

/**
 * Record a Dispatch stock mutation
 * POST /api/v1/inventory/scan-dispatch
 */
export async function submitScanDispatch(payload: ScanDispatchRequest): Promise<ScanDispatchResponse> {
  apiLogger.info('DISPATCH', 'Submitting stock scan dispatch mutation...', payload);

  try {
    const data = await apiFetch<ScanDispatchResponse>('/api/v1/inventory/scan-dispatch', {
      method: 'POST',
      headers: OPERATOR_HEADERS,
      body: JSON.stringify(payload),
    });

    apiLogger.info('DISPATCH', 'Scan dispatch mutation successful!', data);

    // Record locally for history preview
    localMutationHistory.unshift({
      id: data.mutation_id,
      type: 'DISPATCH',
      quantity: data.dispatched_qty,
      feed_item: {
        id: 1,
        name: KNOWN_FEED_ITEMS[data.sku]?.name || data.sku,
        sku: data.sku,
      },
      batch_item: {
        id: data.batch_id,
        batch_number: data.batch_number,
      },
      notes: payload.notes || 'Dispatch scan',
      created_by: data.created_by || 'staff-01',
      created_at: data.created_at || new Date().toISOString(),
    });

    return data;
  } catch (err: any) {
    apiLogger.error('DISPATCH', `Dispatch failed: ${err.message}`, err);
    throw err;
  }
}

/**
 * Fetch Stock Mutation Ledger
 * GET /api/v1/inventory/mutations
 */
export async function fetchMutations(limit = 50, offset = 0): Promise<StockMutation[]> {
  apiLogger.info('MUTATIONS', `Fetching mutations (limit=${limit}, offset=${offset})...`);

  try {
    const data = await apiFetch<StockMutation[]>(
      `/api/v1/inventory/mutations?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: OPERATOR_HEADERS,
      }
    );

    apiLogger.info('MUTATIONS', `Fetched ${data.length} mutations successfully`);
    return data;
  } catch (err: any) {
    apiLogger.error('MUTATIONS', `Failed to fetch mutations from API. Using local cache.`, err);
    return localMutationHistory;
  }
}

export function getMockStock(batchNumber: string): number {
  return mockBatchStock[batchNumber] ?? 80;
}

/**
 * Fetch a specific batch by its batch number
 * GET /api/v1/inventory/batches
 */
export async function fetchBatchByNumber(batchNumber: string): Promise<StockBatch | null> {
  apiLogger.info('BATCH', `Fetching live batch details for ${batchNumber}...`);

  try {
    const batches = await apiFetch<StockBatch[]>('/api/v1/inventory/batches', {
      method: 'GET',
      headers: OPERATOR_HEADERS,
    });

    const target = batchNumber.trim().toLowerCase();
    const matched = batches.find(
      (b) => b.batch_number?.trim().toLowerCase() === target
    );

    if (matched) {
      apiLogger.info(
        'BATCH',
        `Live batch found for ${batchNumber}: current_qty=${matched.current_qty}`,
        matched
      );
      // Keep in-memory cache in sync
      mockBatchStock[matched.batch_number] = matched.current_qty;
      return matched;
    }

    apiLogger.info('BATCH', `No batch found matching ${batchNumber} (may be a new inbound batch)`);
    return null;
  } catch (err: any) {
    apiLogger.error('BATCH', `Failed to fetch live batch details for ${batchNumber}: ${err.message}`, err);
    return null;
  }
}

