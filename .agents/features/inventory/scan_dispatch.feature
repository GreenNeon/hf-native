Feature: QR Code Scan & Outbound Stock Dispatch
  As a warehouse operator
  I want to dispatch feed stock by scanning QR codes
  So that inventory records accurately reflect physical stock movements

  Rule: Successful dispatch decrements stock from both the batch and master catalog
    Background:
      Given the system contains feed item "HiFeed Broiler Starter Super" with SKU "HF-BR-01"
      And the feed item has a total stock of 100 sacks
      And the system contains an active batch "BATCH-2026-HF01-A" with 50 sacks remaining
      And the warehouse operator is logged in

    Scenario: Dispatching a valid quantity updates inventory levels
      When the warehouse operator scans a QR code containing valid batch data for "BATCH-2026-HF01-A"
      And the operator dispatches 10 sacks
      Then the system reduces the batch remaining quantity to 40 sacks
      And the system reduces the master feed item stock to 90 sacks
      And the system confirms the dispatch is successful

    Scenario: Dispatching creates an audit trail entry
      When the warehouse operator scans a QR code containing valid batch data for "BATCH-2026-HF01-A"
      And the operator dispatches 10 sacks
      Then the system creates a dispatch audit trail entry
      And the audit entry records the operator, the batch "BATCH-2026-HF01-A", and the quantity of 10 sacks
      And the audit entry records the current timestamp

  Rule: A fully dispatched batch transitions to depleted status
    Scenario: Dispatching exact remaining quantity depletes the batch
      Given the system contains an active batch "BATCH-2026-HF01-A" with 50 sacks remaining
      When the warehouse operator scans the QR code for "BATCH-2026-HF01-A"
      And the operator dispatches exactly 50 sacks
      Then the system reduces the batch remaining quantity to 0 sacks
      And the system updates the batch status to depleted

  Rule: Expired batches cannot be dispatched
    Scenario: Attempting to dispatch from an expired batch
      Given the system contains a batch "BATCH-2025-HF01-B" that expired on "2025-12-31"
      When the warehouse operator scans the QR code for "BATCH-2025-HF01-B"
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the dispatch
      And the system provides a batch-expired error including the expiration date "2025-12-31"

  Rule: Dispatch quantity cannot exceed remaining batch stock
    Scenario: Requesting more stock than available
      Given the system contains an active batch "BATCH-2026-HF01-A" with 50 sacks remaining
      When the warehouse operator scans the QR code for "BATCH-2026-HF01-A"
      And the operator attempts to dispatch 60 sacks
      Then the system rejects the dispatch
      And the system provides an insufficient-stock error showing 50 available versus 60 requested

  Rule: QR code payloads must be valid and consistent
    Background:
      Given the warehouse operator is ready to scan a QR code

    Scenario: Scanning non-JSON text
      When the warehouse operator scans a QR code containing plain text "BATCH-2026-HF01-A"
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the payload as malformed

    Scenario: Scanning JSON primitives or arrays
      When the warehouse operator scans a QR code containing a JSON array of batch data
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the payload as malformed

    Scenario: Scanning a payload missing required fields
      When the warehouse operator scans a QR code missing the SKU field
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the payload
      And the system provides aggregated validation errors for the missing fields

    Scenario: Scanning a payload with impossible calendar dates
      When the warehouse operator scans a QR code with an expiration date of "2026-02-29"
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the payload due to an invalid date

    Scenario: Scanning a payload with extra fields
      Given the system contains an active batch "BATCH-2026-HF01-A" with 50 sacks remaining
      When the warehouse operator scans a QR code containing valid data and an extra "location" field
      And the operator dispatches 10 sacks
      Then the system confirms the dispatch is successful
      And the system silently ignores the extra field

    Scenario: Scanning a payload with a mismatched SKU
      Given the system contains an active batch "BATCH-2026-HF01-A" associated with SKU "HF-BR-01"
      When the warehouse operator scans a QR code for "BATCH-2026-HF01-A" containing SKU "HF-BR-02"
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the dispatch due to a SKU mismatch

  Rule: The batch must exist in the system
    Scenario: Scanning an unknown batch number
      Given the system does not contain batch "BATCH-9999-UNKNOWN"
      When the warehouse operator scans a QR code for "BATCH-9999-UNKNOWN"
      And the operator attempts to dispatch 10 sacks
      Then the system rejects the dispatch with a not-found error

  Rule: Concurrent dispatches cannot cause negative stock
    Scenario: Multiple operators dispatching simultaneously from the same batch
      Given the system contains an active batch "BATCH-2026-HF01-A" with 10 sacks remaining
      When 10 warehouse operators simultaneously scan the QR code for "BATCH-2026-HF01-A"
      And each operator attempts to dispatch 2 sacks
      Then the system processes the concurrent requests
      And the system approves exactly 5 dispatches
      And the system rejects exactly 5 dispatches with an insufficient-stock error
      And the batch remaining quantity becomes 0 sacks

  Rule: Dispatch input must pass strict validation
    Scenario Outline: Invalid dispatch inputs
      Given the warehouse operator is logged in
      When the warehouse operator scans a QR code with <payload>
      And the operator attempts to dispatch <quantity> sacks
      Then the system rejects the dispatch due to invalid input

      Examples:
        | payload             | quantity |
        | empty content       | 10       |
        | valid batch details | 0        |
        | valid batch details | -5       |
