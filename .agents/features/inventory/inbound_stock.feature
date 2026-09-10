Feature: Inbound Stock Receiving & Batch Creation
  As a warehouse operator
  I want to register incoming stock into batches
  So that accurate inventory levels and tracking are maintained

  Background:
    Given the system has a registered feed item "HiFeed Broiler Starter Super" with SKU "HF-BR-01"
    And the system has a registered feed item "HiFeed Silase Jagung Fermentasi" with SKU "HF-SIL-02"

  Rule: New batches are registered with correct initial quantities

    Scenario: Receiving a new batch creates it with matching initial and current quantities
      When the warehouse operator receives 500 units of "HF-BR-01" into a new batch "BATCH-2026-HF01-A" expiring on "2027-01-15"
      Then the system registers the batch "BATCH-2026-HF01-A"
      And the batch shows an initial quantity of 500 units
      And the batch shows a current quantity of 500 units

    Scenario: A QR payload is automatically generated for the new batch
      When the warehouse operator receives 200 units of "HF-SIL-02" into a new batch "BATCH-2026-HFSIL-B" expiring on "2027-02-20"
      Then the system generates a QR payload for batch "BATCH-2026-HFSIL-B"
      And the QR payload contains the batch number, SKU, and expiration date

    Scenario: The master feed item stock is incremented by the received quantity
      Given the feed item "HF-BR-01" has a total stock of 1000 units
      When the warehouse operator receives 300 units of "HF-BR-01" into a new batch "BATCH-2026-HF01-C" expiring on "2027-03-10"
      Then the feed item "HF-BR-01" shows a total stock of 1300 units

    Scenario: An inbound audit trail entry is created recording the operation
      When the warehouse operator "staff-02" receives 150 units of "HF-SIL-02" into a new batch "BATCH-2026-HFSIL-C" expiring on "2027-04-05"
      Then the system records an inbound audit entry for batch "BATCH-2026-HFSIL-C"
      And the audit entry shows the operator "staff-02", a quantity of 150 units, and the current time

  Rule: Existing batches can be replenished with additional stock

    Background:
      Given a batch "BATCH-2026-HF01-A" exists for "HF-BR-01" with initial quantity 500 and current quantity 200

    Scenario: Adding quantity to an existing batch increments its current quantity
      When the warehouse operator receives 100 additional units into batch "BATCH-2026-HF01-A"
      Then the batch "BATCH-2026-HF01-A" shows a current quantity of 300 units

    Scenario: A depleted batch is reactivated to ACTIVE status when replenished
      Given the batch "BATCH-2026-HF01-A" has a current quantity of 0 units and is marked as depleted
      When the warehouse operator receives 50 additional units into batch "BATCH-2026-HF01-A"
      Then the batch "BATCH-2026-HF01-A" shows a current quantity of 50 units
      And the batch is marked as active

    Scenario: The original initial quantity is preserved when replenishing
      When the warehouse operator receives 100 additional units into batch "BATCH-2026-HF01-A"
      Then the batch "BATCH-2026-HF01-A" retains an initial quantity of 500 units

  Rule: Batch numbers cannot be shared across different feed items

    Scenario: Attempting to receive stock using a batch number associated with a different SKU is rejected
      Given a batch "BATCH-2026-HF01-A" exists for "HF-BR-01"
      When the warehouse operator attempts to receive stock for "HF-SIL-02" using batch "BATCH-2026-HF01-A"
      Then the system rejects the operation
      And the system provides a message that the batch number is already assigned to a different product

  Rule: Only registered feed items can receive stock

    Scenario: Receiving stock for an unregistered SKU is rejected
      When the warehouse operator attempts to receive 100 units of an unregistered SKU "HF-UNKNOWN" into a new batch
      Then the system rejects the operation
      And the system provides a product not found message

  Rule: Operator identity is tracked for every inbound operation

    Scenario: The operator identity is recorded in the audit trail
      When the warehouse operator "supervisor-jane" receives stock for "HF-BR-01" into batch "BATCH-2026-HF01-D" expiring on "2027-05-10"
      Then the system records an inbound audit entry for batch "BATCH-2026-HF01-D"
      And the audit entry shows the operator "supervisor-jane"

    Scenario: When no operator identity is provided, the system uses the default operator
      When an unidentified warehouse operator receives stock for "HF-BR-01" into batch "BATCH-2026-HF01-E" expiring on "2027-05-10"
      Then the system records an inbound audit entry for batch "BATCH-2026-HF01-E"
      And the audit entry shows the default operator "staff-01"

    Scenario: Operator identities are trimmed of whitespace
      When the warehouse operator "  operator-jim  " receives stock for "HF-BR-01" into batch "BATCH-2026-HF01-F" expiring on "2027-05-10"
      Then the system records an inbound audit entry for batch "BATCH-2026-HF01-F"
      And the audit entry shows the operator "operator-jim"

    Scenario: Whitespace-only operator identities fall back to the default operator
      When the warehouse operator provides a whitespace-only identity and receives stock for "HF-BR-01" into batch "BATCH-2026-HF01-G" expiring on "2027-05-10"
      Then the system records an inbound audit entry for batch "BATCH-2026-HF01-G"
      And the audit entry shows the default operator "staff-01"

  Rule: Inbound data must pass strict validation

    Scenario Outline: Rejecting inbound stock with invalid data
      When the warehouse operator attempts to receive stock with <Condition>
      Then the system rejects the operation
      And the system provides a validation error message

      Examples:
        | Condition                                                                  |
        | an invalid SKU format "invalid-sku"                                        |
        | an invalid batch format "invalid-batch"                                    |
        | an expired date "2025-01-01" which is in the past                          |
        | a non-positive quantity of 0 units                                         |
        | a negative quantity of -50 units                                           |
