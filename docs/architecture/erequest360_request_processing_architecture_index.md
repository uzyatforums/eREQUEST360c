# eREQUEST360 — Request Processing Architecture Investigation Index

These documents capture the business rules established during the legacy New Request investigation before implementation work is delegated to Antigravity.

1. `erequest360_eligibility_architecture.md` — eligibility chain, activation rules, ordering, card-type grouping, server-side enforcement.
2. `erequest360_nocharge_architecture.md` — standing No-Charge Product, FIRST-CARD-ONLY, switch history, one-time No-Charge Approval, encryption boundary, request-level recording.
3. `erequest360_duplicate_detection_rules.md` — duplicate detection and duplicate approval rules documented separately.
4. `erequest360_request_acceptance_and_charging.md` — acceptance order, duplicate gate, post-commit settlement, retries, and separation of concerns.

Implementation principle: Antigravity should implement against these documented business decisions rather than infer missing behaviour from the legacy application. Where a document identifies an unresolved business rule, implementation should stop and obtain a decision.

## Request Identifier Model

The eREQUEST360 architecture establishes a three-tier identifier pattern for card requests:

- `request_id` — Internal database surrogate key (`BIGINT` / `BIGINT IDENTITY`). Used strictly for internal relational integrity, database joins, and primary key indexing. Must not be exposed as the external API identifier.
- `request_uid` — External unique identifier (`UUID` / `UNIQUEIDENTIFIER`). Used by external REST APIs, integrations, webhooks, and all externally visible request references to prevent integer enumeration vulnerabilities.
- `request_number` — Human/business-facing request reference (`VARCHAR` / string). Used for user-facing business identification, receipts, branch operational references, and customer communications.

> [!IMPORTANT]
> **Scope Note (ADR-007 Alignment):** ADR-007 does NOT decide the final roles, types, persistence mechanics, or generation mechanisms of:
> - `request_id`
> - `request_uid`
> - `request_number`
> 
> Those decisions remain reserved for the dedicated Request Processing architecture review.

