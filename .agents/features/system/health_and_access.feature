Feature: System Health and Access Control
  As a system administrator
  I want the system to control access and monitor its own health
  So that operations run securely and reliably

  Rule: The system exposes a health check for monitoring
    Scenario: Monitoring system verifies system health
      When the monitoring system checks the health status
      Then the system reports a healthy status
      And the system provides the current timestamp

  Rule: Cross-origin requests are controlled by an allowlist
    Scenario: Client application from an allowed origin accesses the system
      Given the origin "https://hifeed-portal.company.internal" is on the allowlist
      When a client application requests data from the origin "https://hifeed-portal.company.internal"
      Then the system accepts the request

    Scenario: Client application from an unauthorized origin accesses the system
      Given the origin "https://unknown-site.com" is not on the allowlist
      When a client application requests data from the origin "https://unknown-site.com"
      Then the system rejects the request
      And the error message identifies "https://unknown-site.com" as the blocked origin

    Scenario: Mobile application makes a request without an origin header
      When the mobile application requests data without an origin identifier
      Then the system accepts the request

    Scenario: Any origin is allowed when the system is configured with a wildcard
      Given the system is configured to allow any origin
      When a client application requests data from the origin "https://new-vendor.example.com"
      Then the system accepts the request

  Rule: Requests to non-existent routes receive descriptive errors
    Scenario: Client requests an undefined service
      When the client application attempts a "POST" operation on the "/inventory/unknown-action" path
      Then the system rejects the request
      And the error message indicates that the "POST" operation on the "/inventory/unknown-action" path was not found

  Rule: Malformed request bodies are handled gracefully
    Scenario: Client sends an unreadable payload
      When the client application sends a request with an improperly formatted text body
      Then the system rejects the request
      And the error message indicates a malformed payload
