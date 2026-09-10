export type MutationType = 'INBOUND' | 'DISPATCH';
export type BatchStatus = 'ACTIVE' | 'DEPLETED' | 'EXPIRED';

export interface FeedItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  is_low_stock?: boolean;
}

export interface StockBatch {
  id: number;
  batch_number: string;
  feed_item_id?: number;
  feed_item?: {
    id: number;
    name: string;
    sku: string;
    unit?: string;
  };
  expired_date: string;
  initial_qty: number;
  current_qty: number;
  status: BatchStatus;
  is_expired?: boolean;
  qr_payload?: string;
}

export interface StockMutation {
  id: number;
  type: MutationType;
  quantity: number;
  feed_item: {
    id: number;
    name: string;
    sku: string;
  };
  batch_item: {
    id: number;
    batch_number: string;
  };
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface QRPayload {
  batch_number: string;
  sku: string;
  expired_date?: string;
}

export interface InboundRequest {
  sku: string;
  batch_number: string;
  expired_date: string;
  quantity: number;
  notes?: string;
}

export interface InboundResponse {
  mutation_id: number;
  batch_id: number;
  batch_number: string;
  sku: string;
  quantity_added: number;
  current_batch_qty: number;
  current_item_stock: number;
  created_by: string;
  created_at: string;
}

export interface ScanDispatchRequest {
  qr_payload: string; // raw qr payload JSON string
  quantity: number;
  notes?: string;
}

export interface ScanDispatchResponse {
  mutation_id: number;
  batch_id: number;
  batch_number: string;
  sku: string;
  dispatched_qty: number;
  remaining_batch_qty: number;
  remaining_item_stock: number;
  batch_status: BatchStatus;
  created_by: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ScannedBatchDetail {
  sku: string;
  batch_number: string;
  expired_date: string;
  name: string;
  category?: string;
  unit?: string;
  current_qty?: number;
  rawPayload: string;
}
