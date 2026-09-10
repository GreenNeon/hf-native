Feature: Master Feed Catalog & Low Stock Alerting
  As a warehouse operator
  I want to view the feed product catalog with stock levels
  So that I can monitor inventory and receive low-stock alerts

  Rule: Warehouse operators can view the complete feed catalog

    Scenario: The feed catalog displays all items in alphabetical order
      Given the following feed items exist:
        | sku       | name                            | category | current_stock | min_stock | unit |
        | HF-SIL-02 | HiFeed Silase Jagung Fermentasi | RUMINANT | 50            | 20        | DRUM |
        | HF-BR-01  | HiFeed Broiler Starter Super    | POULTRY  | 100           | 30        | SAK  |
      When the warehouse operator views the feed catalog
      Then the system displays the catalog items in the following order:
        | sku      | name                            |
        | HF-BR-01 | HiFeed Broiler Starter Super    |
        | HF-SIL-02| HiFeed Silase Jagung Fermentasi |

    Scenario: Viewing an empty feed catalog
      Given no feed items exist in the system
      When the warehouse operator views the feed catalog
      Then the system displays an empty list

  Rule: Items at or below minimum stock are flagged as low stock

    Scenario: Stock below minimum triggers low stock alert
      Given the feed item "HF-BR-01" has a current stock of 15 and a minimum stock of 20
      When the warehouse operator views the feed catalog
      Then the system displays the item "HF-BR-01" with a low stock alert

    Scenario: Stock at exact minimum boundary is flagged
      Given the feed item "HF-BR-01" has a current stock of 20 and a minimum stock of 20
      When the warehouse operator views the feed catalog
      Then the system displays the item "HF-BR-01" with a low stock alert

    Scenario: Stock above minimum is not flagged
      Given the feed item "HF-BR-01" has a current stock of 25 and a minimum stock of 20
      When the warehouse operator views the feed catalog
      Then the system displays the item "HF-BR-01" without a low stock alert

    Scenario: Zero stock with zero minimum threshold is flagged
      Given the feed item "HF-BR-01" has a current stock of 0 and a minimum stock of 0
      When the warehouse operator views the feed catalog
      Then the system displays the item "HF-BR-01" with a low stock alert

  Rule: Catalog can be filtered by category and searched by name or SKU

    Background:
      Given the following feed items exist:
        | sku       | name                            | category | current_stock | min_stock | unit |
        | HF-BR-01  | HiFeed Broiler Starter Super    | POULTRY  | 100           | 30        | SAK  |
        | HF-SIL-02 | HiFeed Silase Jagung Fermentasi | RUMINANT | 50            | 20        | DRUM |

    Scenario: Filter by category
      When the warehouse operator filters the catalog by category "POULTRY"
      Then the system displays only the item "HF-BR-01"

    Scenario: Search by name with case-insensitive substring match
      When the warehouse operator searches the catalog for "broiler"
      Then the system displays only the item "HF-BR-01"

    Scenario: Search by SKU with partial match
      When the warehouse operator searches the catalog for "SIL-02"
      Then the system displays only the item "HF-SIL-02"

  Rule: Invalid query parameters are rejected

    Scenario Outline: Rejecting empty query parameters
      When the warehouse operator queries the catalog with <filter_type> as "<value>"
      Then the system rejects the request

      Examples:
        | filter_type | value |
        | category    |       |
        | search      |       |
