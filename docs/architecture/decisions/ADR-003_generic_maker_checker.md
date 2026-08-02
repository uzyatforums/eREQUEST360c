# ADR-003: Generic Non-Invasive Dual-Control (Maker-Checker) Work Item Engine

## Status
Accepted

## Context
Enterprise banking regulations mandate dual-control authorization (Maker-Checker) for sensitive administrative and operational actions, including:
- Modifying Card Programme product specifications.
- Activating or deactivating branch directory locations.
- Assigning security roles and permissions to users.
- Approving high-value card request exceptions.

In traditional monolithic architectures, Maker-Checker logic is frequently hardcoded directly inside business modules, or business tables are polluted with workflow columns (`is_pending_approval`, `proposed_changes_json`, `checker_id`, `checker_remarks`). This creates severe database schema clutter, code duplication, and coupling between business entities and approval state logic.

## Decision
Implement a **Generic, Decoupled Dual-Control Engine** in the `maker_checker` database schema.

Key Design Principles:
1. **Zero Business Domain Awareness**: The engine understands only generic concept primitives: `entity_type`, `entity_id`, `operation`, `status`, `before_payload`, and `after_payload`.
2. **Dedicated Schema**: All approval state and history tables reside in `maker_checker` (`work_items`, `work_item_actions`, `work_item_payloads`, `statuses`, `operations`, `entity_types`).
3. **Immutable JSON Payloads**: Proposed changes are stored as immutable JSON before/after snapshots.
4. **Decoupled Execution**: The Maker-Checker engine manages approval state transitions (`PENDING` ➔ `APPROVED` / `REJECTED` / `CANCELLED`) and action history, but DOES NOT update business tables directly. The calling business module remains responsible for committing approved changes upon authorization.

In the frontend UI, Maker users (`isMakerOnly`) see clear workflow notice banners and submit actions to Maker-Checker work items (`submitMakerCheckerWorkItem`), while Checker users review payload change diffs in the Maker-Checker Work Queue (`SCR-011`).

## Consequences
### Positive
- **Zero Schema Pollution**: Business domain tables (`config.card_programmes`, `config.branches`, `iam.users`) remain clean and unpolluted by approval workflow columns.
- **Universal Reusability**: The same engine handles approvals for any current or future business module without database schema modifications.
- **Complete Audit Trail**: Immutable before/after JSON snapshots provide exact audit diffs and automated change summary logs.

### Negative
- Business modules must construct JSON payloads when submitting items and implement execution handlers to apply changes upon approval.

## Alternatives Considered
1. **Adding Approval Columns to Every Business Table**: Rejected due to database schema clutter, lack of unified audit history, and high technical debt.
2. **Module-Specific Approval Workflows**: Rejected due to code duplication and inability to provide a centralized Maker-Checker approval queue.

## References
- `docs/implementation/maker_checker_contract.md` (Maker/Checker Contract Specification)
- `docs/architecture/eREQUEST360_Architecture_v1.0.md` (Section 1 & 4)
- `docs/architecture/Configuration_Data_Model.md` (Maker-Checker Schema)
- `docs/ui/ui_standards.md` (Section 21: Maker / Checker Readiness)
