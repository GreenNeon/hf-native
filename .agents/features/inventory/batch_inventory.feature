Feature: Batch Inventory & FEFO Expiry Tracking
  As an operations supervisor
  I want to view inventory batches and their expiration status
  So that I can ensure First-Expired, First-Out (FEFO) stock rotation

  Background:
    Given the following feed items exist in the system:
      | SKU       | Name                            |
      | HF-BR-01  | HiFeed Broiler Starter Super    |
      | HF-SIL-02 | HiFeed Silase Jagung Fermentasi |
    And the following inventory batches exist:
      | Batch Number       | Feed Item | Quantity | Expiration Date | Stored Status |
      | BATCH-2026-HF01-A  | HF-BR-01  | 500      | 2026-10-15      | ACTIVE        |
      | BATCH-2026-HF01-B  | HF-BR-01  | 1000     | 2026-12-01      | ACTIVE        |
      | BATCH-2026-HF01-C  | HF-BR-01  | 300      | 2026-08-10      | ACTIVE        |
      | BATCH-2026-HF01-D  | HF-BR-01  | 0        | 2026-07-01      | ACTIVE        |
      | BATCH-2026-HFSIL-A | HF-SIL-02 | 200      | 2026-11-20      | ACTIVE        |
    And the current system date is "2026-09-13"

  Rule: Batches are ordered by First-Expired, First-Out (FEFO)

    Scenario: Batches are sorted by expiration date ascending
      When the operations supervisor requests the list of inventory batches
      Then the system displays the batches ordered by earliest expiration date first
      And the batch "BATCH-2026-HF01-C" appears before "BATCH-2026-HF01-A"

  Rule: Batch status is computed dynamically based on quantity and expiration

    Scenario: Active batch with future expiry and positive quantity
      When the operations supervisor views the details for batch "BATCH-2026-HF01-A"
      Then the system displays the batch status as "ACTIVE"

    Scenario: Depleted status overrides expiration when quantity is zero
      When the operations supervisor views the details for batch "BATCH-2026-HF01-D"
      Then the system displays the batch status as "DEPLETED"
      But the system does not display the batch status as "EXPIRED"

    Scenario: Expired batch with past expiry and positive quantity
      When the operations supervisor views the details for batch "BATCH-2026-HF01-C"
      Then the system displays the batch status as "EXPIRED"

  Rule: Batches can be filtered by their effective status

    Scenario: Filtering by ACTIVE status excludes dynamically expired batches
      When the operations supervisor filters the batches by status "ACTIVE"
      Then the system displays batch "BATCH-2026-HF01-A"
      But the system does not display batch "BATCH-2026-HF01-C"

    Scenario: Filtering by EXPIRED status includes dynamically expired batches
      When the operations supervisor filters the batches by status "EXPIRED"
      Then the system displays batch "BATCH-2026-HF01-C"
      But the system does not display batch "BATCH-2026-HF01-A"

    Scenario: Filtering by DEPLETED status returns only empty batches
      When the operations supervisor filters the batches by status "DEPLETED"
      Then the system displays batch "BATCH-2026-HF01-D"
      But the system does not display batch "BATCH-2026-HF01-C"

  Rule: Batches can be filtered by feed item

    Scenario: Filtering batches by specific feed item
      When the operations supervisor filters the batches for feed item "HF-SIL-02"
      Then the system displays batch "BATCH-2026-HFSIL-A"
      But the system does not display batch "BATCH-2026-HF01-A"

  Rule: Invalid query parameters are rejected

    Scenario Outline: Rejecting invalid query parameters for batch inventory
      When the operations supervisor requests the list of batches with <Parameter> set to "<Value>"
      Then the system rejects the request
      And the system returns a validation error for the <Parameter>

      Examples:
        | Parameter    | Value          |
        | feed_item_id | -5             |
        | feed_item_id | abc            |
        | status       | INVALID_STATUS |
