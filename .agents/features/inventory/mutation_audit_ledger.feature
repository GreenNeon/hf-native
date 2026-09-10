Feature: Stock Mutation Audit Ledger
  As an operations supervisor
  I want to view the chronological, immutable stock movement audit log
  So that I can track inventory changes and ensure accountability

  Background:
    Given the following feed items exist in the system:
      | SKU       | Name                               |
      | HF-BR-01  | HiFeed Broiler Starter Super       |
      | HF-SIL-02 | HiFeed Silase Jagung Fermentasi    |
    And the following stock mutations exist in the ledger:
      | Timestamp           | Type     | SKU       | Batch              | Quantity | Operator | Note                                   |
      | 2026-09-13 10:00:00 | INBOUND  | HF-BR-01  | BATCH-2026-HF01-A  | 500      | staff-01 | Penerimaan rutin dari Pabrik Utama     |
      | 2026-09-13 11:30:00 | INBOUND  | HF-SIL-02 | BATCH-2026-HFSIL-B | 300      | staff-02 | Penerimaan rutin dari Pabrik Utama     |
      | 2026-09-13 14:00:00 | DISPATCH | HF-BR-01  | BATCH-2026-HF01-A  | -100     | staff-03 | Pengiriman ke Peternakan Mitra Subang  |
      | 2026-09-13 15:45:00 | DISPATCH | HF-SIL-02 | BATCH-2026-HFSIL-B | -50      | staff-01 | Pengiriman ke Peternakan Mitra Subang  |

  Rule: Mutations are listed in reverse chronological order

    Scenario: Viewing the default audit ledger
      When the operations supervisor requests the stock mutation ledger
      Then the system displays the mutations
      And the mutation at 15:45:00 appears first
      And the mutation at 10:00:00 appears last

  Rule: The audit ledger can be filtered by movement type

    Scenario: Filtering the ledger by INBOUND movements
      When the operations supervisor filters the ledger by INBOUND type
      Then the system displays only the INBOUND mutation records
      And the system does not display any DISPATCH records

    Scenario: Filtering the ledger by DISPATCH movements
      When the operations supervisor filters the ledger by DISPATCH type
      Then the system displays only the DISPATCH mutation records
      And the system does not display any INBOUND records

  Rule: The audit ledger can be filtered by feed item or batch

    Scenario: Filtering the ledger by a specific feed item
      When the operations supervisor filters the ledger by feed item "HiFeed Broiler Starter Super"
      Then the system displays only the mutations for SKU "HF-BR-01"
      And the system does not display mutations for SKU "HF-SIL-02"

    Scenario: Filtering the ledger by a specific batch
      When the operations supervisor filters the ledger by batch "BATCH-2026-HFSIL-B"
      Then the system displays only the mutations for batch "BATCH-2026-HFSIL-B"
      And the system does not display mutations for batch "BATCH-2026-HF01-A"

    Scenario: Combining multiple filters
      When the operations supervisor filters the ledger by INBOUND type and feed item "HiFeed Broiler Starter Super"
      Then the system displays only the INBOUND mutation for SKU "HF-BR-01"
      And the system does not display the DISPATCH mutation for SKU "HF-BR-01"

  Rule: Results are paginated with configurable limits

    Scenario: Viewing the default paginated results
      Given the system contains 60 stock mutations
      When the operations supervisor requests the stock mutation ledger
      Then the system displays the first 50 mutation records
      And the system indicates there are 60 records in total

    Scenario: Navigating with custom limits and offsets
      Given the system contains 60 stock mutations
      When the operations supervisor requests the stock mutation ledger with limit 10 and offset 50
      Then the system displays the remaining 10 mutation records

    Scenario: Total count reflects applied filters
      When the operations supervisor filters the ledger by DISPATCH type
      Then the system indicates there are 2 records in total

  Rule: Each mutation record includes resolved reference data

    Scenario: Viewing mutation details
      When the operations supervisor requests the stock mutation ledger
      Then the system displays the mutation record for "HF-BR-01"
      And the record includes the product name "HiFeed Broiler Starter Super"
      And the record includes the batch number "BATCH-2026-HF01-A"
      And the record includes the movement details and operator notes

  Rule: Invalid query parameters are rejected

    Scenario Outline: Submitting invalid parameters for the audit ledger
      When the operations supervisor requests the stock mutation ledger with <Parameter> set to <InvalidValue>
      Then the system rejects the request
      And the system indicates the parameter is invalid

      Examples:
        | Parameter | InvalidValue |
        | type      | OUTBOUND     |
        | limit     | 101          |
        | offset    | -5           |
