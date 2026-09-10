# HiFeed Backend - Engineering Plans & Route-Based Phases

This directory contains the complete modular technical documentation, agile user stories, and step-by-step development plans for the **HiFeed Inventory & Warehouse Management Backend API**.

---

## 1. Structure & Philosophy

The project is broken down into **route-oriented phases**. Each phase is split into two distinct documents:
- **`plan.md`**: The Agile User Story, domain specifications, API contracts (request/response), business rules, error cases, and acceptance criteria.
- **`develop.md`**: The granular engineering tasks, exact file paths, layer responsibilities, transaction flow, code signatures, and verification steps.

When executing or reviewing a phase, reference `plan.md` for *what* and *why*, and execute `develop.md` for *how*.

```text
.agents/plans/
├── README.md                      # Master Roadmap & Phase Index (this file)
├── source.md                      # Translated Original Challenge Document & Specifications
├── Backend.md                     # Domain Entities, Value Objects & Exceptions Specification
├── phase-0-foundation/
│   ├── plan.md                    # Core Architecture, Prisma Schema, Seed, Auth & Middlewares
│   └── develop.md                 # Setup & Foundation Engineering Tasks
├── phase-1-get-items/             # Route: GET /api/v1/inventory/items
│   ├── plan.md                    # Story 1.1: Master Feed Stock & Low Stock Alert
│   └── develop.md                 # Implementation Tasks & Verification
├── phase-2-get-batches/           # Route: GET /api/v1/inventory/batches
│   ├── plan.md                    # Story 1.2: Batch Inventory & Expiry Tracking
│   └── develop.md                 # Implementation Tasks & Verification
├── phase-3-post-inbound/          # Route: POST /api/v1/inventory/inbound
│   ├── plan.md                    # Story 2.1: Inbound Stock Receiving & Batch Creation
│   └── develop.md                 # Atomic Transaction Tasks & Verification
├── phase-4-post-scan-dispatch/    # Route: POST /api/v1/inventory/scan-dispatch
│   ├── plan.md                    # Story 3.1 & 3.2: QR Scan Dispatch & Concurrency Defense
│   └── develop.md                 # Row Locking, Atomic Decrement & Concurrency Test
└── phase-5-get-mutations/         # Route: GET /api/v1/inventory/mutations
    ├── plan.md                    # Story 4.1: Stock Movement Audit Log (Ledger)
    └── develop.md                 # Implementation Tasks & Verification
```

---

## 2. Phase & Route Mapping

| Phase | Route / Scope | Method | Persona / Primary Consumer | Key Responsibility |
|---|---|---|---|---|
| **Phase 0** | Infrastructure & Foundation | N/A | Cross-cutting | Prisma schema, seed data, env validation, mock auth, error handling, QR parser |
| **Phase 1** | `/api/v1/inventory/items` | `GET` | Warehouse Supervisor (Web) | Master feed catalog with real-time stock and `is_low_stock` alert flag |
| **Phase 2** | `/api/v1/inventory/batches` | `GET` | Warehouse Supervisor (Web) | Batch listing with remaining quantities, expiration dates, and active status |
| **Phase 3** | `/api/v1/inventory/inbound` | `POST` | Field/Warehouse Staff (Mobile) | Inbound stock receiving: upserts batch, increments master stock, writes audit log |
| **Phase 4** | `/api/v1/inventory/scan-dispatch` | `POST` | Field Staff (Mobile Scanner) | Scans QR code, atomically decrements stock with **race-condition defense**, writes audit log |
| **Phase 5** | `/api/v1/inventory/mutations` | `GET` | Warehouse Supervisor (Web) | Chronological audit trail (Stock Ledger) with filtering by mutation type |

---

## 3. Architectural Rules Compliance (`AGENTS.md`)

All development across phases must strictly adhere to the layered architecture:
1. **Route (`*.routes.ts`)**: Mounts paths, applies validation and mock auth middlewares.
2. **Controller (`*.controller.ts`)**: Parses HTTP requests, passes parameters to the Use-Case, formats responses. **Zero business or database logic**.
3. **Use-Case (`*.use-case.ts`)**: Encapsulates a single business operation. **All multi-table mutations MUST use `prisma.$transaction`** and propagate the `tx` client to repositories.
4. **Repository (`*.repository.ts`)**: Encapsulates Prisma queries. **Must accept optional `tx: Prisma.TransactionClient`** parameter.
5. **Validation & Errors**: All inputs validated via Zod schemas (`*.schema.ts`). Business failures must throw subclasses of `AppError` (`BadRequestError`, `NotFoundError`), caught by centralized `error-handler.middleware.ts`.
