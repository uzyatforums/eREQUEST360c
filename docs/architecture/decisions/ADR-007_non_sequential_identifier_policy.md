# ADR-007: Non-Sequential Identifier Policy and Grandfathering Rules

## Status
Accepted

## Context
Following an architecture audit of eREQUEST360's database schemas, ORM models, API routes, 
and user interfaces, the application was found to rely extensively on sequential integer 
identifiers (`INT IDENTITY(1,1)`, `BIGINT IDENTITY(1,1)`, and `autoincrement=True`). 
Furthermore, sequential integers are currently exposed across external REST endpoints, 
frontend URL routes, and derived business reference codes (e.g. `work_item_number = f"MC-{work_item.id:08d}"`).

In enterprise banking environments, predictable sequential identifiers present significant 
architectural and security concerns:
1. **Bank Architecture & Security Policy:** Bank policy explicitly mandates: 
   *"No sequential identifier."*
2. **Predictability & Identifier Enumeration:** Sequential identifiers exposed externally allow 
   unauthorized parties to predict valid resource addresses, infer transactional volumes, 
   and perform sequential resource harvesting.
3. **Identifier Role Separation:** High-integrity system design necessitates separating internal 
   persistence mechanics from externally addressable resource identifiers and human-facing 
   business references.

eREQUEST360 requires a forward-looking architectural decision that enforces non-sequential 
identifiers for all future work while maintaining stability for existing systems.

## Decision
eREQUEST360 formally adopts the **Non-Sequential Identifier Policy**.

### 1. New Entity Identifiers
From the effective date of this policy forward, no new entity or table in eREQUEST360 shall 
be designed with a sequential identifier.
- **Prohibited Generation Mechanisms:**
  - SQL Server `IDENTITY` / `IDENTITY(1,1)`
  - SQL Server `SEQUENCE` objects
  - Application-level `MAX(id) + 1` logic
  - Monotonically incrementing integer counters
  - Identifiers derived or formatted from another sequential identifier
  - Predictable sequential business or reference numbers
- **Mandated Mechanism for New Transactional / Operational Entities:**
  - Prefer cryptographically random UUIDs (`UUIDv4`), represented in SQL Server as 
    `UNIQUEIDENTIFIER` (generated via application logic or standard random generators).
  - **Explicit Prohibition:** `NEWSEQUENTIALID()` SHALL NOT be used for identifiers intended 
    to satisfy this policy, as it produces sequential, predictable values.

### 2. Natural / Business Keys
Where an entity possesses a genuine, stable natural or business code, that code may serve 
as its primary identifier.
- **Permitted Examples:** `branch_code`, `status_code`, `role_code`, `permission_code`, 
  `card_type`, `processing_mode_code`, `state_code`.
- **Anti-Pattern Prohibited:** Do NOT add surrogate UUID columns mechanically to reference 
  or lookup entities that already possess an appropriate, stable natural identifier.

### 3. Grandfathering Rule for Existing Sequential Identifiers
Existing database tables with sequential `IDENTITY` primary keys are **grandfathered**.
- **No Blanket Refactoring:** Existing `IDENTITY` primary keys SHALL NOT be migrated or 
  converted in bulk merely to comply with this policy. Existing keys will be evaluated and 
  addressed separately, incrementally, and by explicit domain work.
- **Strict Freeze on Exposure:** No new functionality shall:
  - Expose an existing sequential surrogate ID through a new external API;
  - Introduce a new frontend route using an existing sequential surrogate ID;
  - Derive a new business/reference number from an existing sequential surrogate ID.
- **Request Module Exception:** The final role, structure, and grandfathering status of 
  `request_id` is specifically excluded from this blanket grandfathering rule and is 
  deferred to the dedicated Request Processing architecture review (see Section 8 & Scope).

### 4. External Identifier Surface Rules
Externally addressable transactional entities must use an opaque, non-sequential identifier.
Sequential database surrogate keys must never be newly exposed through:
- External REST API request/response contracts;
- Frontend / browser URL routes;
- External integrations and webhook payloads;
- Customer-facing outputs, statements, and receipts;
- Reports intended to identify business entities;
- Business tracking numbers and reference codes.

### 5. Business References
Human-facing business tracking and reference codes (e.g. request reference numbers, work 
item tracking numbers, settlement vouchers) must be non-sequential and must never be 
derived from sequential database surrogate keys.
- The exact format, length, and generation algorithm for business numbers (e.g. `request_number`, 
  `work_item_number`) will be decided separately for each domain to ensure operational usability 
  without predictability.

### 6. Exclusion of Ordering and Positional Values
This policy does **NOT** prohibit integer values whose sole purpose is ordering, sorting, 
relative priority, versioning, or retry counting.
- **Permitted Ordering Values:** `priority`, `sequence_no`, `action_sequence`, `display_order`, 
  `version_no`, `retry_count`.
- **Rationale:** These columns establish relative sequence within an isolated parent context 
  (e.g. line items within a charge header, immutable action sequence within an audit trail); 
  they do not serve as entity identifiers.

### 7. Security & Authorization Principle
Opaque and non-sequential identifiers reduce enumeration and predictability risks, but are 
**NOT a substitute for authorization**.
- Opaque identifiers make enumeration substantially more difficult, but they do **NOT** prevent 
  Insecure Direct Object References (IDOR).
- Every API endpoint and data-access layer must continue to enforce tenant isolation (`client_id`), 
  role-based permissions (`require_permission`), branch boundaries (`assert_branch_access`), 
  and ownership validation on every request, regardless of whether the identifier is an opaque 
  UUID or a natural code.

## Scope
- Applies to all new database schemas, tables, entities, ORM models, API routes, and UI pages 
  created in eREQUEST360.
- Applies to all new external integration surfaces, webhooks, and client exports.
- Governs the remediation of existing modules whenever they undergo planned architectural revisions.
- **Explicit Reservation on Request Identifiers:** This ADR does **not** decide whether the existing 
  `request_id` is grandfathered, whether it remains `BIGINT`, becomes `UUID`, is removed, or has 
  another role. All decisions regarding Request entity identifiers are reserved for the dedicated 
  Request Processing architecture review.

## Consequences

### Positive
- **Reduced Identifier Enumeration Risk:** Opaque non-sequential identifiers prevent straightforward sequential 
  enumeration and make externally exposed entity identifiers substantially less predictable.
- **Architectural Policy Compliance:** Aligns system design with bank enterprise security policies.
- **Clean Identifier Separation:** Establishes clear boundaries between persistence mechanics, 
  external API resource identifiers, and business-facing references.

### Negative / Trade-Offs
- **Storage & Index Footprint:** `UNIQUEIDENTIFIER` (16 bytes) consumes more storage than `INT` 
  (4 bytes) or `BIGINT` (8 bytes).
- **Index Fragmentation Considerations:** Non-sequential random UUIDs (`UUIDv4`) can cause B-tree 
  leaf page splits if used as clustered primary keys in SQL Server, requiring thoughtful indexing 
  strategies (e.g. separate clustered indexes or fill-factor tuning) where high-throughput insert 
  tables are introduced.

## Known Existing Exceptions / Technical Debt (Backlog Only)
The identifier audit identified the following known compliance exceptions in existing code. 
These are logged as technical debt and are **NOT authorized for remediation under this ADR**:
1. **`request.requests` Sequential Exposure:** Primary key `request_id` (`BIGINT IDENTITY`) is 
   exposed directly across API endpoints (`/requests/{request_id}`), Pydantic models, and UI routes.
2. **Missing Documented Request Identifiers:** The documented three-tier identifiers `request_uid` 
   (`UUID`) and `request_number` (`VARCHAR`) are not yet implemented in database DDL or ORM models.
3. **Maker/Checker Work Item Sequential Endpoints:** `maker_checker.work_items.id` is exposed 
   directly across all operational endpoints (`/maker-checker/{id}`).
4. **Derived Work Item Reference:** `maker_checker.work_items.work_item_number` is derived 
   directly as `f"MC-{work_item.id:08d}"` from database `IDENTITY`.
5. **Configuration Master Routes:** Configuration APIs and frontend routes for card programmes, 
   card segments, charges, and segment charges expose numeric surrogate IDs in paths (`/config/card-programmes/{id}`).
6. **Polymorphic Entity References in Shared Engines:** `maker_checker.work_items.entity_id` 
   and `audit.audit_events.entity_id` are defined as `BIGINT`, assuming all entity targets have 
   numeric primary keys.

## High-Level Remediation Strategy (Future Phasing)
Remediation of grandfathered technical debt will follow an incremental, non-breaking roadmap:
- **Phase A (Request Module Architecture Review):** During the dedicated Request Processing 
  architecture review, determine the final roles and generation mechanisms of `request_id`, 
  `request_uid`, and `request_number` in accordance with this ADR. No Request identifier structure 
  is prescribed by this ADR.
- **Phase B (Maker/Checker Decoupling):** Update `work_item_number` to use an opaque, non-sequential 
  reference generator. Align Maker/Checker REST endpoints to resolve by `work_item_number` as 
  originally specified in the Maker/Checker Implementation Contract.
- **Phase C (Polymorphic Engines Generalization):** Support non-numeric entity keys in `maker_checker` 
  and `audit` (formalized in [ADR-008: Polymorphic Entity Reference Architecture](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-008_polymorphic_entity_reference_architecture.md), 
  which establishes canonical `entity_key VARCHAR(64)` across shared engines, superseding earlier tentative exploratory proposals).
- **Phase D (Master Data Routing):** Transition configuration master routes to stable business codes 
  (e.g. `/card-programmes/:code`) or opaque UUIDs.

## Relationship to Existing Architecture Documents & ADRs
- **Extends and Formalizes:** [eREQUEST360_Architecture_v1.0.md Section 5.2](file:///c:/python/eREQUEST360c/docs/architecture/eREQUEST360_Architecture_v1.0.md#L794-L806) 
  (Surrogate Keys principle that numeric IDs should not appear in API contracts or URLs).
- **Supports:** [ADR-005: Global Card Types Master](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-005_card_type_vs_card_programme.md) 
  (affirming the use of natural business codes for reference masters).
- **Refines:** [ADR-001: Route-Based Navigation](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-001_route_based_navigation.md) 
  and [AGENTS.md](file:///c:/python/eREQUEST360c/.agents/AGENTS.md) 
  (clarifying that route parameters `:id` in future modules must be opaque identifiers or business codes, not database sequential integers).
- **Complemented by:** [ADR-008: Polymorphic Entity Reference Architecture](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-008_polymorphic_entity_reference_architecture.md) 
  (establishing canonical `entity_key VARCHAR(64)` for shared polymorphic references across Maker/Checker and Audit without modifying grandfathered domain table primary keys).
