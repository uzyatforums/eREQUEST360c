# ADR-004: Reusable DataGrid Selection & Sortable Column Header Framework

## Status
Accepted

## Context
Configuration and operational screens in eREQUEST360 display tabular data (Card Programmes, Segments, Charges, References, Requests, Users, Audit Logs) that require interaction capabilities:
- Selecting individual rows or selecting all visible rows.
- Displaying active selection counts and clear selection triggers.
- Supporting visual indeterminate checkbox states when partially selected.
- Sorting columns ascending and descending by clicking header labels.
- Preventing checkbox selection clicks from unintentionally opening detail inspector views.

Without a centralized architecture, individual screens implemented ad-hoc selection sets and custom sorting functions, leading to inconsistent UI behaviors and bug-prone code duplication.

## Decision
Standardize all data grids across eREQUEST360 using a unified, reusable **DataGrid Framework** consisting of four core primitives:

1. **`useRowSelection<T>` Hook (`hooks/use-row-selection.ts`)**: Type-safe React hook encapsulating row selection logic (`selectedIds: Set<string | number>`, `selectedCount`, `selectedItems`, `isSelected`, `toggleRow`, `selectAll`, `clearSelection`, `toggleSelectAll`, `isAllSelected`, `isSomeSelected`, `isNoneSelected`).
2. **`Checkbox` Primitive (`components/ui/checkbox.tsx`)**: Form primitive with DOM ref synchronization for `indeterminate` visual states (`ref.current.indeterminate = true`) when partially selected.
3. **`SelectionToolbar` Component (`components/ui/selection-toolbar.tsx`)**: Embedded toolbar displaying selection count badge, `[Clear Selection]` trigger button, and disabled `[Bulk Actions]` button wrapped in a release tooltip.
4. **`SortableHeader` Component (`components/ui/sortable-header.tsx`)**: Reusable table header button providing a 3-state column sorting cycle (`Unsorted` ➔ `Ascending` ➔ `Descending`) with visual directional icons (`ArrowUp`, `ArrowDown`, `ArrowUpDown`).

Furthermore, enforce the **Event Isolation Rule**: row selection checkboxes MUST execute `e.stopPropagation()` on `onClick` to isolate checkbox clicks from master table row navigation.

## Consequences
### Positive
- **Visual & Behavioral Consistency**: Data tables across all present and future modules behave identically.
- **Encapsulated & Tested Logic**: Hook state, indeterminate DOM ref handling, and sorting logic are centralized and reusable.
- **Navigation Safety**: Event isolation prevents accidental navigation into detail views when selecting checkboxes.

### Negative
- Developers must wrap table header labels in `<SortableHeader>` components and initialize `useRowSelection` for grid tables.

## Alternatives Considered
1. **Ad-Hoc Selection and Sort Logic per Screen**: Rejected due to code duplication, missing indeterminate header states, and inconsistent UI behaviors.
2. **Heavyweight Third-Party DataGrid Libraries (e.g. AG-Grid, TanStack Table)**: Deferred for current phase to maintain light bundle footprint, fast rendering speed, and 100% Tailwind CSS design control.

## References
- `docs/ui/component_library.md` (Section 3 & 4: DataGrid Framework)
- `docs/ui/ui_standards.md` (Section 10, 11, 12: Data Grids, Selection, Sorting)
- `docs/ui/UI_Standards_Checklist.md`
