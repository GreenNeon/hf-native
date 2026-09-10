# HiFeed Inventory Management API

API documentation for HiFeed Inventory & Warehouse Management System

## Overview

| | |
|---|---|
| **Version** | 1.0.0 |
| **OpenAPI** | 3.0.0 |
| **License** | ISC |

## Servers

- `/`

## Endpoints

### GET `/api/v1/metrics`

Retrieve warehouse and inventory KPI metrics.

**Tags:** `Metrics`
**Operation ID:** `GetMetricsSpec`

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

### GET `/api/v1/inventory/items`

Retrieve list of master feed products with current stock and low-stock indicator.

**Tags:** `Inventory`
**Operation ID:** `GetItemsSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `category` | query | `string` |  | Optional filter by feed category (e.g. POULTRY, RUMINANT) |
| `search` | query | `string` |  | Optional search query matching product name or SKU |

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

### GET `/api/v1/inventory/items/{id}`

Retrieve detail of a specific feed item by its ID.

**Tags:** `Inventory`
**Operation ID:** `GetItemDetailSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `id` | path | `number` | ✓ | Identifier of the feed item |

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

### GET `/api/v1/inventory/batches`

Retrieve list of feed batches with remaining quantities, expiration dates, and dynamic status.

**Tags:** `Inventory`
**Operation ID:** `GetBatchesSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `feed_item_id` | query | `number` |  | Optional filter by master feed item ID |
| `status` | query | `string` |  | Optional filter by batch status (ACTIVE, DEPLETED, EXPIRED) |

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

### GET `/api/v1/inventory/batches/{id}`

Retrieve detail of a specific feed batch by its ID.

**Tags:** `Inventory`
**Operation ID:** `GetBatchDetailSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `id` | path | `number` | ✓ | Identifier of the stock batch |

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

### POST `/api/v1/inventory/inbound`

Record inbound feed stock, creating or replenishing a batch and updating master stock.

**Tags:** `Inventory`
**Operation ID:** `InboundSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `x-user-id` | header | `string` |  | Optional operator identifier from x-user-id header |

**Request Body**

Inbound stock payload (SKU, batch number, expiry date, quantity, optional notes) *(required)*

Content-Type: `application/json`

*See [InboundBody](#schemas)*

**Responses**

| Code | Description |
|------|-------------|
| `201` | Created |

---

### POST `/api/v1/inventory/scan-dispatch`

Dispatch feed stock by scanning QR payload, decrementing batch and master stock atomically with concurrency defense.

**Tags:** `Inventory`
**Operation ID:** `ScanDispatchSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `x-user-id` | header | `string` |  | Optional operator identifier from x-user-id header |

**Request Body**

Scan dispatch payload (raw qr_payload JSON string, quantity, optional notes) *(required)*

Content-Type: `application/json`

*See [ScanDispatchBody](#schemas)*

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

### GET `/api/v1/inventory/mutations`

Retrieve chronological stock mutation audit ledger with filtering and pagination.

**Tags:** `Inventory`
**Operation ID:** `GetMutationsSpec`

**Parameters**

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| `type` | query | `string` |  | Optional filter by mutation type (INBOUND, DISPATCH) |
| `feed_item_id` | query | `number` |  | Optional filter by master feed product ID |
| `batch_id` | query | `number` |  | Optional filter by batch ID |
| `limit` | query | `number` |  | Maximum records to return (default: 50, max: 100) |
| `offset` | query | `number` |  | Pagination offset (default: 0) |

**Responses**

| Code | Description |
|------|-------------|
| `200` | OK |

---

## Schemas

### MetricsResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total_master_items` | `number` | ✓ |  |
| `total_on_hand_stock` | `number` | ✓ |  |
| `low_stock_alerts` | `number` | ✓ |  |
| `total_active_batches` | `number` | ✓ |  |
| `near_expiry_batches` | `number` | ✓ |  |

### PaginationMeta

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total` | `number` | ✓ |  |
| `limit` | `number` | ✓ |  |
| `offset` | `number` | ✓ |  |

### ApiSuccessResponse_MetricsResponse_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | [MetricsResponse](#schemas) | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### FeedItemResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `number` | ✓ |  |
| `sku` | `string` | ✓ |  |
| `name` | `string` | ✓ |  |
| `category` | `string` | ✓ |  |
| `unit` | `string` | ✓ |  |
| `min_stock` | `number` | ✓ |  |
| `current_stock` | `number` | ✓ |  |
| `is_low_stock` | `boolean` | ✓ |  |
| `created_at` | `string` | ✓ |  |
| `updated_at` | `string` | ✓ |  |

### ApiSuccessResponse_FeedItemResponse-Array_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | array of *See [FeedItemResponse](#schemas)* | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### ApiSuccessResponse_FeedItemResponse_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | [FeedItemResponse](#schemas) | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### BatchFeedItemResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `number` | ✓ |  |
| `name` | `string` | ✓ |  |
| `sku` | `string` | ✓ |  |
| `unit` | `string` | ✓ |  |

### _36_Enums.BatchStatus

`string`

### BatchStatus

*See [_36_Enums.BatchStatus](#schemas)*

### BatchResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `number` | ✓ |  |
| `batch_number` | `string` | ✓ |  |
| `feed_item` | [BatchFeedItemResponse](#schemas) | ✓ |  |
| `expired_date` | `string` | ✓ |  |
| `initial_qty` | `number` | ✓ |  |
| `current_qty` | `number` | ✓ |  |
| `status` | [BatchStatus](#schemas) | ✓ |  |
| `is_expired` | `boolean` | ✓ |  |
| `qr_payload` | `string` | ✓ |  |
| `created_at` | `string` | ✓ |  |
| `updated_at` | `string` | ✓ |  |

### ApiSuccessResponse_BatchResponse-Array_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | array of *See [BatchResponse](#schemas)* | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### ApiSuccessResponse_BatchResponse_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | [BatchResponse](#schemas) | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### InboundResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mutation_id` | `number` | ✓ |  |
| `batch_id` | `number` | ✓ |  |
| `batch_number` | `string` | ✓ |  |
| `sku` | `string` | ✓ |  |
| `quantity_added` | `number` | ✓ |  |
| `current_batch_qty` | `number` | ✓ |  |
| `current_item_stock` | `number` | ✓ |  |
| `created_by` | `string` | ✓ |  |
| `created_at` | `string` | ✓ |  |

### ApiSuccessResponse_InboundResponse_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | [InboundResponse](#schemas) | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### infer_typeofinboundBodySchema_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | `string` |  |  |
| `quantity` | `number` | ✓ |  |
| `expired_date` | `string` | ✓ |  |
| `batch_number` | `string` | ✓ |  |
| `sku` | `string` | ✓ |  |

### InboundBody

*See [infer_typeofinboundBodySchema_](#schemas)*

### ScanDispatchResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mutation_id` | `number` | ✓ |  |
| `batch_id` | `number` | ✓ |  |
| `batch_number` | `string` | ✓ |  |
| `sku` | `string` | ✓ |  |
| `dispatched_qty` | `number` | ✓ |  |
| `remaining_batch_qty` | `number` | ✓ |  |
| `remaining_item_stock` | `number` | ✓ |  |
| `batch_status` | [BatchStatus](#schemas) | ✓ |  |
| `created_by` | `string` | ✓ |  |
| `created_at` | `string` | ✓ |  |

### ApiSuccessResponse_ScanDispatchResponse_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | [ScanDispatchResponse](#schemas) | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |

### infer_typeofscanDispatchBodySchema_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | `string` |  |  |
| `quantity` | `number` | ✓ |  |
| `qr_payload` | `string` | ✓ |  |

### ScanDispatchBody

*See [infer_typeofscanDispatchBodySchema_](#schemas)*

### _36_Enums.MutationType

`string`

### MutationType

*See [_36_Enums.MutationType](#schemas)*

### MutationFeedItemResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `number` | ✓ |  |
| `name` | `string` | ✓ |  |
| `sku` | `string` | ✓ |  |

### MutationBatchItemResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `number` | ✓ |  |
| `batch_number` | `string` | ✓ |  |

### StockMutationResponse

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `number` | ✓ |  |
| `type` | [MutationType](#schemas) | ✓ |  |
| `quantity` | `number` | ✓ |  |
| `feed_item` | [MutationFeedItemResponse](#schemas) | ✓ |  |
| `batch_item` | [MutationBatchItemResponse](#schemas) | ✓ |  |
| `notes` | `string` | ✓ |  |
| `created_by` | `string` | ✓ |  |
| `created_at` | `string` | ✓ |  |

### ApiSuccessResponse_StockMutationResponse-Array_

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | ✓ |  Enum: `true` |
| `message` | `string` |  |  |
| `data` | array of *See [StockMutationResponse](#schemas)* | ✓ |  |
| `pagination` | [PaginationMeta](#schemas) |  |  |