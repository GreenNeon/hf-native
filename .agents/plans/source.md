# HiFeed Fullstack Developer Take-Home Challenge

- **Position**: Fullstack Developer (Web & Mobile)
- **Company**: HiFeed (PT Hifeed Climate Tech Ventures)
- **Target Level**: Middle / Senior
- **Time Limit**: 7 Calendar Days (Estimated ~10–14 effective working hours)
- **Submission**: GitHub Repository (Public / Private Invite) + Video Demo (Loom / Google Drive 3–5 minutes)

---

## 1. Case Context & Background

HiFeed manages an animal feed supply chain (Supply Chain & Operations - SCOM) connecting feed processing mills, central warehouses, and partner farms across various regions.

In daily field operations:
1. **Warehouse / Field Staff** use smartphones to scan barcodes/QR codes on feed sacks or pallets during goods receiving (**Inbound**) and feed distribution/usage (**Dispatch/Outbound**).
2. **Operations Supervisors / Managers** monitor stock movements, remaining quantities of each batch, expiration dates, and feed mutation histories in real-time through a **Web Dashboard**.

The primary challenge to solve in this system is **stock data integrity**: the system must be resilient against race conditions (preventing negative stock or duplicate mutations if scanned concurrently) and deliver a responsive and stable scanning interface on mobile devices.

---

## 2. Scope of Work

To keep execution efficient within 7 days, you only need to build the following **Core Flow**:

```text
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND (Node.js + Prisma)                  │
│ - Core REST API Endpoints                                   │
│ - Atomic Stock Mutation Transaction (PostgreSQL)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│       WEB DASHBOARD       │   │      MOBILE SCANNER       │
│     (Next.js / React)     │   │ (React Native / Expo /    │
│  Role: Warehouse Manager  │   │          Flutter)         │
│ ───────────────────────── │   │   Role: Field Operator    │
│ 1. Stock Overview & Alert │   │ ───────────────────────── │
│ 2. Stock Ledger Table     │   │ 1. Camera Barcode Scanner │
│    (Mutation History)     │   │ 2. Confirmation Form      │
│                           │   │    (Inbound / Dispatch)   │
└───────────────────────────┘   └───────────────────────────┘
```

---

### A. Backend API (Node.js + TypeScript + PostgreSQL / Prisma)

Build a REST API-based backend service with the following specifications:

#### 1. Data Models (Prisma Schema):
- **FeedItem** (Master Feed): `id`, `sku`, `name`, `category`, `unit` (e.g., KG, SAK), `min_stock`, `current_stock`, `created_at`, `updated_at`.
- **StockBatch** (Feed Batch): `id`, `batch_number`, `feed_item_id`, `expired_date`, `initial_qty`, `current_qty`, `qr_payload`, `status` (`ACTIVE` / `DEPLETED` / `EXPIRED`).
- **StockMutation** (Mutation Ledger): `id`, `batch_id`, `feed_item_id`, `type` (`INBOUND` / `DISPATCH`), `quantity`, `notes`, `created_by`, `created_at`.

#### 2. Core API Endpoints:
1. `GET /api/v1/inventory/items`: Fetch list of master feed items along with total active stock and `is_low_stock` flag (when `current_stock <= min_stock`).
2. `GET /api/v1/inventory/batches`: Fetch list of feed batches with remaining quantities and expiration status.
3. `POST /api/v1/inventory/inbound`: Add a new batch or increment stock on an existing batch.
4. `POST /api/v1/inventory/scan-dispatch`: Deduct batch quantity based on scanned QR/Barcode payload.
5. `GET /api/v1/inventory/mutations`: Fetch chronological stock mutation history (Audit log) ordered from newest to oldest.

#### 3. Mandatory Backend Requirements:
- **Atomic Transaction**: Stock deduction/addition mutations, updating remaining batch quantity, updating master item stock, and recording the `StockMutation` audit log **MUST** be executed within a single database transaction (e.g., `prisma.$transaction`).
- **Validation & Error Handling**: Request payload validation (using Zod / Joi). If dispatch quantity exceeds remaining batch stock, return **HTTP 400 Bad Request** with an informative message.
- **(Auth Note)**: You are not required to build a full authentication system. Use mock headers such as `x-user-id: staff-01` and `x-user-role: field_operator`.

---

### B. Client Applications

You are requested to build user interfaces for two personas:

#### 1. Web Dashboard (Next.js / React) — Persona: Warehouse Supervisor
- **Screen 1 (Stock Overview)**:
  - Display list of feed products, category, total stock, and a visual indicator if stock is below `min_stock` (Red Badge / Alert).
  - Simple summary statistics (Total Items, Total Active Batches, Total Near-Expiry Batches).
- **Screen 2 (Stock Ledger / Mutation History)**:
  - Chronological table of stock mutations (Date, Feed Name, Batch Number, IN/OUT Type, Quantity, Operator).
  - Simple filtering by mutation type or search by feed name.

#### 2. Mobile App (React Native / Expo / Flutter) — Persona: Field Staff
*(Note: Use of PWA or Web Mobile App is not permitted. Must use a native framework such as React Native or Flutter).*

- **Screen 1 (Scanner Screen)**:
  - Camera interface to scan feed batch QR Code / Barcode.
  - Fallback / Manual input: Provide a manual text input button if camera is unavailable or being tested in a simulator.
- **Screen 2 (Confirmation & Action Modal/Screen)**:
  - After QR is scanned successfully, display batch details (Feed name, Batch No., Remaining qty in batch, Expiry date).
  - Select action: Inbound (Add) or Dispatch (Deduct/Use).
  - Input quantity to transfer.
  - Submit button with loading state and toast notifications (Success / Failed).

---

## 3. Starter Mock Data & Sample QR Payload

Use the following data to accelerate development:

### Sample Seed Data (`prisma/seed.ts`):
```json
[
  {
    "sku": "HF-BR-01",
    "name": "HiFeed Broiler Starter Super",
    "category": "POULTRY",
    "unit": "SAK (50KG)",
    "min_stock": 20
  },
  {
    "sku": "HF-SIL-02",
    "name": "HiFeed Silase Jagung Fermentasi",
    "category": "RUMINANT",
    "unit": "DRUM (100KG)",
    "min_stock": 10
  }
]
```

### QR Code Payload Format:
The QR Code scanned on mobile contains a JSON string as follows:
```json
{
  "batch_number": "BATCH-2026-HF01-A",
  "sku": "HF-BR-01",
  "expired_date": "2026-12-31"
}
```

---

## 4. Recommended 7-Day Time Allocation

| Day | Target Deliverables | Estimated Time |
|---|---|---|
| **Day 1–2** | Setup PostgreSQL DB, Prisma schema, Seed Data, and Core API Endpoints + Transaction logic. | 3–4 Hours |
| **Day 3–4** | Setup Mobile App (React Native/Flutter), camera scanner integration & mutation form calling API. | 3–4 Hours |
| **Day 5–6** | Setup Web Dashboard (Next.js), display stock table & mutation ledger. | 3–4 Hours |
| **Day 7** | Finalize README.md, review error handling, and record Loom demo video. | 2 Hours |

---

## 5. Submission Guidelines

Submit your work before the 7-day deadline (submitted **AT THE LATEST BY SEPTEMBER 14, 2026 AT 23:59**) to the form:  
`https://forms.gle/hC8Mj9XXuRyfhsVm8`

Include:
1. **GitHub Repository Link**:
   - Monorepo or multi-repo (Backend, Web, Mobile).
   - Ensure repository is Public or invite recruiter GitHub accounts (if Private).
   - Include `README.md` with installation instructions and concise architectural explanations.
2. **Video Demo Link (3–5 Minutes)**:
   - Screen recording using Loom / Google Drive / YouTube Unlisted.
   - The demo should briefly cover:
     1. Showing initial stock dashboard on the Web.
     2. Scanning QR code and submitting stock mutation on Mobile.
     3. Demonstrating that stock and mutation history on the Web update accurately.
     4. Brief walkthrough of the backend transaction code.
     5. *(Optional)* Brief explanation if an AI Assistant was used during development.

Good luck! If there are any questions regarding specifications, please reach out to the HiFeed HR team.
