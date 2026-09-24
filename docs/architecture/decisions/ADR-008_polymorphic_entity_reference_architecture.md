# ADR-008: Polymorphic Entity Reference Architecture

## Status
Accepted

## Context
Following the formal adoption of [ADR-007: Non-Sequential Identifier Policy](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-007_non_sequential_identifier_policy.md), eREQUEST360 permits heterogeneous domain entity identifier types across its subsystems:
1. **Grandfathered Sequential Identifiers:** Existing configuration and operational tables retaining internal `INT` or `BIGINT IDENTITY` surrogate primary keys;
2. **Natural / Business Key Identifiers:** Reference masters and operational entities using alphanumeric string keys (e.g. `branch_code VARCHAR(10)`, `role_code VARCHAR(50)`, `status_code VARCHAR(20)`);
3. **Non-Sequential Unique Identifiers:** Future transactional entities utilizing opaque identifiers such as `UUIDv4` (`UNIQUEIDENTIFIER`).

However, the application's shared polymorphic infrastructure—specifically the generic dual-control engine (`maker_checker.work_items`) and enterprise audit logging (`audit.audit_events`, `audit.audit_snapshots`)—historically defined entity references strictly as:
```sql
entity_id BIGINT NOT NULL
```
and typed them across Python ORM models, Pydantic schemas, and service interfaces as `entity_id: int`.

This architectural constraint produced critical systemic issues:
- **Natural-Key Breakage:** Entities lacking integer surrogate keys (such as `Branch`, which uses natural key `branch_code VARCHAR(10)`) could not be represented natively in Maker/Checker, forcing domain services to submit fake sentinel values (`entity_id = 0`). This bypassed database-level duplicate pending work protection and disabled executor dispatching.
- **Incompatibility with Future UUID Entities:** Under ADR-007, future entities (such as the forthcoming Request Processing architecture) cannot be logged in `audit.audit_events` or processed via `maker_checker.work_items` without raising type and conversion exceptions.
- **Tenant Isolation Deficit in Audit Trail:** Neither `audit.audit_events` nor `audit.audit_snapshots` possessed a `client_id` column. If two tenants share an entity identifier (such as `branch_code '001'` or a surrogate integer ID restarting per tenant), direct audit queries without an upstream domain table join cannot guarantee multi-tenant partitioning.
- **Audit Semantic Defect:** In `src/api/audit_service.py`, `log_audit_event` erroneously persisted the action classification `event_type.event_code` into the `entity_type` column, corrupting the semantic separation between the domain entity being audited and the action being performed.

A unified architectural decision is required to govern how shared subsystems store, query, and enforce integrity for references to heterogeneous domain entities.

---

## Decision

eREQUEST360 formally adopts the **Polymorphic Entity Reference Architecture**.

### 1. Canonical String Representation (`entity_key VARCHAR(64)`)
Shared infrastructure subsystems that refer polymorphically to heterogeneous domain entities shall use:
```sql
entity_key VARCHAR(64)
```
replacing the historical `BIGINT`-only `entity_id` column.

The purpose of `entity_key` is to store the canonical textual representation of the target domain entity's actual primary key:
- **Grandfathered Numeric Surrogate Keys:** Stored as the canonical decimal string representation of the integer primary key (e.g. `17` $\rightarrow$ `"17"`).
- **Natural / Business Keys:** Stored directly as the natural alphanumeric string key (e.g. `branch_code "001"` $\rightarrow$ `"001"`, `role_code "CHECKER"` $\rightarrow$ `"CHECKER"`).
- **Future UUID Keys:** Stored as the standard canonical 36-character hyphenated UUIDv4 string (e.g. `"f47ac10b-58cc-4372-a567-0e02b2c3d479"`).

### 2. Tenant-Qualified Polymorphic Logical Identity
In shared subsystems, an entity reference is never evaluated in isolation. The logical identity of a referenced domain entity is strictly composite:
- **In Maker/Checker:**
  $$\text{Logical Identity} = \text{client\_id} + \text{entity\_type\_code} + \text{entity\_key}$$
- **In Enterprise Audit:**
  $$\text{Logical Identity} = \text{client\_id} + \text{entity\_type} + \text{entity\_key}$$

### 3. Decentralized Key Interpretation (Executor Responsibility)
The shared Maker/Checker engine and Audit subsystem SHALL NOT contain central `switch` statements, registry lookups, or type-coercion tables to interpret `entity_key`.
- The shared engines treat `entity_key` as an opaque, canonical string.
- The entity-specific executor (or domain service) is solely responsible for interpreting, parsing, or casting `entity_key` according to the target domain table's actual schema:
  - Grandfathered integer-key entities: Executor casts `int(work_item.entity_key)` when querying the domain table.
  - Natural-key entities: Executor uses `work_item.entity_key` directly.
  - UUID-key entities: Executor parses `work_item.entity_key` into a UUID object or ORM-compatible format.

### 4. Maker/Checker `CREATE` Semantics & Elimination of Sentinel `0`
For `CREATE` operations where the target domain entity does not yet exist:
```
entity_key = NULL
operation_code = 'CREATE'
```
- **Prohibition of Sentinels:** The legacy convention of passing `entity_id = 0` is strictly prohibited. No sentinel or placeholder values (such as `0`, `"0"`, `""`, or `"NEW"`) shall represent a non-existent entity.
- **Post-Execution Key Assignment:** After checker approval and successful domain execution, the entity-specific executor SHALL assign the newly minted canonical `entity_key` to the `MakerCheckerWorkItem` prior to database transaction commit.
- **Duplicate Protection Semantics:**
  - Database-level duplicate-pending protection (`UIX_mc_work_items_unique_pending_entity`) operates exclusively on existing entities where `entity_key IS NOT NULL`.
  - Because `CREATE` proposals have `entity_key = NULL`, the shared database index intentionally does not and cannot detect duplicate `CREATE` proposals.
  - Validation against duplicate proposed business codes for new entities remains domain-specific and belongs to domain pre-validation checks. Generic JSON substring or payload searching is NOT an architectural requirement.

### 5. Tenant-Qualified Audit Trail & Semantic Separation
To ensure immutable compliance and complete multi-tenant isolation:
- **Schema Alignment:** Both `audit.audit_events` and `audit.audit_snapshots` shall store:
  ```sql
  client_id  INT NOT NULL
  entity_key VARCHAR(64) NOT NULL
  ```
- **Write-Time Capture:** New audit records MUST capture `client_id` explicitly at event creation time. Tenant ownership must not rely upon future lookups of domain tables or current user context, ensuring historical audit records remain fully intact and partitionable even if the underlying domain entity is later deleted.
- **Semantic Separation:** Audit data models and logging interfaces shall maintain strict semantic separation between domain entity classification and action classification:
  - `entity_type` (VARCHAR(50)): Represents the domain entity classification (e.g. `"request"`, `"card_programme"`, `"card_segment"`, `"branch"`, `"user"`).
  - `event_type_id` / `event_code` (VARCHAR(30)): Represents the specific action or event performed (e.g. `"REQUEST_CREATED"`, `"CARD_PROGRAMME_ACTIVATED"`, `"AUTH_LOGIN_SUCCESS"`).
  - The historical defect in `src/api/audit_service.py` where `event_type.event_code` was written into `entity_type` is classified as technical debt to be remediated under the migration implementation plan.
- **Absence of Polymorphic Database FKs:** No database-level foreign key constraints from `audit` or `maker_checker` to domain tables shall be introduced. Referential validation is managed at the application and executor layers.

---

## Historical Data Evidence & Pre-Migration Audit

A comprehensive read-only audit of the existing SQL Server database (`UZYELITEBK\EREQDEV/erequest360c`) was performed to evaluate migration feasibility:

### 1. Maker/Checker Inventory (`maker_checker.work_items`)
- **Total Rows:** **`2`**
- **Row Breakdown:**
  - `entity_id > 0`: **2** (Row 100 with `entity_id = 5`; Row 101 with `entity_id = 37`).
  - `entity_id = 0`: **0**
  - `entity_id < 0`: **0**
- **Conversion Assessment:** Converting existing rows via `CAST(entity_id AS VARCHAR(64))` yields `"5"` and `"37"`. Zero rows use sentinels or negative integers. The conversion preserves the exact semantic meaning of 100% of existing rows without exception.

### 2. Audit Trail Inventory (`audit.audit_events` & `audit.audit_snapshots`)
- **`audit.audit_events` Total Rows:** **`280`**
  - Directly resolvable to `client_id` via snapshot JSON or domain table joins: **`274`** (97.86%).
  - Ambiguous rows: **`0`**.
  - Initially orphaned rows: **`6`** (2.14%).
- **`audit.audit_snapshots` Total Rows:** **`261`**
  - Directly resolvable to `client_id`: **`256`** (98.08%).
  - Ambiguous rows: **`0`**.
  - Initially orphaned rows: **`5`** (1.92%).

The orphaned audit rows arose during prior development test cycles where temporary configuration profiles (`config.card_charges_headers` IDs 16, 17, 18 and `config.card_segment_programme_charges` ID 36) were created, audited, and subsequently hard-deleted from domain tables.

### 3. Tenant Backfill Principle for Migration 022
For the upcoming database migration (`022_polymorphic_entity_key_and_audit_tenant_alignment.sql`), historical `client_id` backfill shall use deterministic evidence in strict priority order:
1. `client_id` already captured in historical `snapshot_data`, where valid;
2. Tenant ownership resolved from the historical domain entity, where the entity still exists and resolves uniquely;
3. For otherwise orphaned historical records only, uniquely resolved user attribution (`performed_by` $\rightarrow$ `iam.users.client_id`) may be used as an explicit one-time historical recovery mechanism.

**Strict Migration Precondition:**
The third mechanism is strictly a one-time migration recovery tool and SHALL NOT become runtime logic. If any historical record remains unresolved or ambiguous after exhausting approved mechanisms, **the migration script MUST halt with an error**. There shall be no default tenant, no fallback to `client_id = 1`, and no invented tenant ownership.

---

## Technical Feasibility & Migration Sequence Reference

Inspection of the `database/migrations/` catalog confirms that migration numbers up to `021` (`021_enforce_card_segment_programmes_tenant_integrity.sql`) are already allocated.

Therefore, the implementation migration for this decision shall be designated:
```
database/migrations/022_polymorphic_entity_key_and_audit_tenant_alignment.sql
```

The historical audit confirms that migration `022` is technically feasible and safe:
- `maker_checker.work_items` contains no zero/negative sentinels;
- Zero ambiguous rows exist across the audit trail;
- All historical audit events resolve cleanly under the approved backfill gates.

---

## Relationship to Other Architectural Decisions

- **Complements [ADR-007: Non-Sequential Identifier Policy](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-007_non_sequential_identifier_policy.md):**  
  ADR-007 governs the creation and external exposure of domain entity identifiers. ADR-008 governs how shared cross-cutting infrastructure polymorphically references those heterogeneous identifiers. ADR-008 does NOT require altering grandfathered domain table primary keys merely because they are referenced through `entity_key`.
- **Supports [ADR-001: Route-Based Navigation](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-001_route_based_navigation.md) & [ADR-005: Global Card Types Master](file:///c:/python/eREQUEST360c/docs/architecture/decisions/ADR-005_card_type_vs_card_programme.md):**  
  Affirms natural business keys and opaque identifiers as first-class entity references in dual-control and audit workflows.
- **Request Boundary Reservation:**  
  ADR-008 explicitly DOES NOT decide the Request Processing identifier architecture. The final roles and generation mechanisms of `request_id`, `request_number`, and `request_uid` remain reserved for the dedicated Request Processing review. ADR-008 merely ensures that the shared polymorphic reference architecture is fully capable of storing future UUID or canonical Request keys without further schema redesign.
- **Branch Module Architecture:**  
  Branch configuration exemplifies the necessity of ADR-008: existing branches are natively represented as `entity_key = branch.branch_code`. Implementing `BranchExecutor` in `src/api/entity_executors/branch_executor.py` is recognized as necessary follow-up technical debt, but is not prescribed as part of ADR-008 itself.

---

## Scope Exclusions

To maintain disciplined architectural boundaries, ADR-008 explicitly DOES NOT:
1. Alter or convert existing domain-table primary keys (e.g. `config.card_programmes.id` remains `INT`);
2. Decide or implement Request Processing entity identifiers;
3. Implement `BranchExecutor` or alter branch approval policies;
4. Author or execute migration script `022`;
5. Introduce typed parallel foreign key columns (`entity_id_bigint`, `entity_id_uuid`, etc.);
6. Introduce a centralized shared entity-reference registry table;
7. Prescribe generic JSON payload substring querying for duplicate `CREATE` proposals.

---

## Security, Audit, and Operational Consequences

### Positive Consequences
- **True Heterogeneous Support:** Shared engines seamlessly support grandfathered integer keys, natural business keys, and modern UUIDs without branching DDL or parallel column bloat.
- **Strict Multi-Tenant Isolation:** Capturing `client_id` directly in `audit.audit_events` and `audit.audit_snapshots` ensures audit records are indexed and partitioned by tenant at the database level.
- **Elimination of Magic Numbers:** Eliminating `entity_id = 0` removes dangerous sentinel logic and restores native database pending protection for natural-key updates.
- **Audit Semantic Integrity:** Restoring the distinction between `entity_type` and `event_code` establishes clean, standard querying across enterprise compliance inspectors.

### Operational Constraints & Guardrails
- **No Implicit Referential Integrity:** The database cannot enforce foreign keys on polymorphic columns. Domain services and executors remain strictly responsible for validating that a referenced entity exists and belongs to the caller's tenant.
- **Explicit Conversion in Executors:** Grandfathered modules must explicitly execute `int(work_item.entity_key)` within their executor implementations.
- **Opaque Keys Do Not Replace Authorization:** While non-sequential keys eliminate predictable enumeration, all endpoints must continue enforcing role and tenant authorization controls.
