# Project Rules: eREQUEST360 Master Architecture & UI Standards

## Reference Implementation Standard: SCR-003 (Card Programmes)

`SCR-003` (Card Programmes Master) is the baseline reference implementation for all Configuration Master modules in eREQUEST360 (e.g. Card Segments, Charge Headers, Card Types, Branches, Reference Tables, etc.).

All future modules SHALL conform to the architectural, navigation, UI, and lifecycle standards established by `SCR-003`:

1. **Navigation Architecture**:
   - Master List → Details → Child Workspaces pattern (`/module`, `/module/new`, `/module/:id`, `/module/:id/edit`, `/module/:id/child-tab`).
   - Dedicated route pages instead of slide-over drawers or popups.
   - Full support for Browser Back, Forward, F5 Refresh, and Deep Link URL navigation.

2. **Standard Row Actions**:
   - 👁 **View**: Open read-only inspector route (`/module/:id`).
   - ✏ **Edit**: Modify existing record (`/module/:id/edit`).
   - 📄 **Copy**: Pre-populate Create form (`/module/new?copyFrom=:id`) using existing GET and POST endpoints without duplicating primary key, audit metadata, or unique business codes. Copy is strictly an intra-tenant duplication operation inheriting the source record's `client_id`; cross-tenant cloning is not supported in the current architecture.
   - 🔄 **Activate / Deactivate**: Toggle record status with Maker/Checker workflow integration where applicable.

3. **No-Delete Configuration Record Lifecycle**:
   - Configuration master records SHALL NOT expose a Delete UI action.
   - Retirement is managed strictly through deactivation to preserve audit trail, referential integrity, historical reporting, and regulatory compliance.

4. **Currency Field Standards**:
   - Multi-currency platform support (NGN, USD, EUR, GBP, etc.).
   - Monetary input fields contain numeric values only (no embedded currency symbols).
   - Inherited currency displayed once as contextual header information.
   - Data grids display ISO currency codes in a dedicated Currency column.
   - Currency-neutral financial icons (e.g. `Coins`, `Receipt`) used instead of Dollar (`$`) icons.

5. **Data Grids & Component Standards**:
   - Reusable `SortableHeader` column components.
   - DataGrid row selection framework (`useRowSelection`, `Checkbox` with `indeterminate` state, `SelectionToolbar`).
   - Mandatory tooltips on icon-only triggers.
   - Accessible WCAG 2.1 AA controls (`aria-` attributes, keyboard navigation).

6. **API Reuse & Documentation**:
   - Reuse existing REST API endpoints before proposing new ones.
   - Update documentation in `docs/ui/` whenever a new reusable standard is introduced.
