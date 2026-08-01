Normative Reference: All screens and components described in this document shall conform to docs/ui/ui_standards.md.

# eREQUEST360 Component Library Specification

**Version:** 1.2 (Updated for React Router Master-Detail Architecture & DataGrid Selection Standards)  
**Status:** Approved Specification  
**Framework Target:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons  

---

## 1. Overview

This document specifies the standard component primitives, composite UI modules, and custom hooks for eREQUEST360. All components are built using React, TypeScript, Tailwind CSS, and `shadcn/ui` (Radix UI primitives styled with Tailwind CSS) to ensure WCAG 2.1 AA accessibility, keyboard predictability, and enterprise visual consistency.

---

## 2. Parent → Child Workspace Architecture Pattern

Configuration and operational entities follow the **Master → Detail Route Architecture Pattern** (reference implementation established by `SCR-003 Card Programmes Master`).

### Architecture Breakdown
1. **Master Management Grid (`/card-programmes`)**: Full-width data table listing all master records with search, filters, row selection, and sortable headers.
2. **Parent Details Inspector (`/card-programmes/:id`)**: Aggregate detail inspector presenting parent record overview, key operational attributes, and workspace navigation triggers.
3. **Parent Summary Banner (`ParentSummaryBanner`)**: Persistent orientation header displayed at the top of all child management pages to maintain parent context.
4. **Child Workspaces (`/card-programmes/:id/*`)**: Dedicated full-width sub-routes for managing child relationship entities:
   - **`Segments`** (`/card-programmes/:id/segments`): Customer segment eligibility and fallback flags.
   - **`Charges`** (`/card-programmes/:id/charges`): Fee profiles, GL account entries, DR/CR posting rules, and NGN pricing.
   - **`References`** (`/card-programmes/:id/references`): Target system integration mappings (Flexcube, Postilion, FIRS).
   - **`Audit`** (`/card-programmes/:id/audit`): Change audit trail and Maker-Checker history log.

---

## 3. DataGrid Framework & Selection Primitives

### 3.1 `useRowSelection<T>` Hook (`hooks/use-row-selection.ts`)

Generic React hook providing type-safe selection state management across configuration and operational data tables.

#### Import & Signature
```typescript
import { useRowSelection, UseRowSelectionOptions, UseRowSelectionReturn } from '../hooks/use-row-selection'

export interface UseRowSelectionOptions<T> {
  items: T[]
  getKey?: (item: T) => string | number
}
```

#### Public API Reference
| Property / Method | Return Type | Description |
|---|---|---|
| `selectedIds` | `Set<string \| number>` | Set containing unique keys of all currently selected rows. |
| `selectedCount` | `number` | Total number of selected items (`selectedIds.size`). |
| `selectedItems` | `T[]` | Array of full item objects corresponding to `selectedIds`. |
| `isSelected(id)` | `(id: string \| number) => boolean` | Returns `true` if the specified item ID is selected. |
| `toggleRow(id)` | `(id: string \| number) => void` | Toggles selection state for a single row ID. |
| `selectAll()` | `() => void` | Selects all currently rendered/filtered items. |
| `deselectAll()` | `() => void` | Clears all row selections (alias of `clearSelection`). |
| `clearSelection()` | `() => void` | Clears all row selections. |
| `toggleSelectAll()` | `() => void` | Selects all items if `isAllSelected` is false; otherwise deselects all. |
| `isAllSelected` | `boolean` | `true` when items length > 0 and all visible items are selected. |
| `isSomeSelected` | `boolean` | `true` when 1 or more items are selected, but fewer than `items.length` (Indeterminate). |
| `isNoneSelected` | `boolean` | `true` when zero items are selected. |
| `handleSelectAllChange` | `(checked: boolean) => void` | Direct checkbox change event handler for header Select All checkbox. |

---

### 3.2 `Checkbox` Primitive (`components/ui/checkbox.tsx`)

Enhanced HTML checkbox form primitive supporting `indeterminate` visual states and keyboard accessibility.

#### Component Signature & Props
```typescript
export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
  label?: string
}
```

#### Behaviour & Rules
- **Indeterminate State**: Implemented via DOM ref synchronization (`combinedRef.current.indeterminate = !!indeterminate`). Displays a dash/minus visual indicator when partially selected (`isSomeSelected`).
- **Select All Header Checkbox**: Used in table header column 1 with `indeterminate={isSomeSelected}` and `checked={isAllSelected}`.
- **Event Propagation Rule**: Table row checkboxes **must** call `e.stopPropagation()` on `onClick` or container wrapper clicks to prevent row checkbox toggling from unintentionally triggering row navigation into detail inspectors.

---

### 3.3 `SelectionToolbar` Component (`components/ui/selection-toolbar.tsx`)

Selection status bar rendered immediately above data grid tables to communicate selection state and provide bulk action controls.

#### Component Signature & Props
```typescript
export interface SelectionToolbarProps {
  selectedCount: number
  totalCount?: number
  onClearSelection: () => void
  bulkActionsDisabledTooltip?: string
  customActions?: React.ReactNode
  className?: string
}
```

#### Behaviour & Rules
- **Selection Count Display**: Renders count badge pill (`"0"` or `"N"`). Shows `"X items selected"` when `selectedCount > 0`, or `"No items selected"` with optional `(N total)` count when `selectedCount === 0`.
- **Clear Selection Button**: `[Clear Selection]` ghost button renders automatically when `selectedCount > 0`. Clicking invokes `onClearSelection()`.
- **Bulk Actions Placeholder**: Renders a secondary disabled `[Bulk Actions]` button wrapped in a `Tooltip` displaying: *"Bulk actions will be enabled in a future release."*

---

## 4. DataGrid Column Header Sorting

### 4.1 `SortableHeader` Component (`components/ui/sortable-header.tsx`)

Reusable header button component enabling 3-state column sorting on data tables.

#### Component Signature & Props
```typescript
export type SortOrder = 'asc' | 'desc' | null

export interface SortableHeaderProps {
  label: string
  sortField: string
  currentSortField: string | null
  currentSortOrder: SortOrder
  onSort: (field: string) => void
  align?: 'left' | 'center' | 'right'
  className?: string
}
```

#### Specifications & Behavior
- **Purpose**: Enables users to sort grid records by clicking column header buttons.
- **Sort Cycle**: Clicking a column header toggles sorting:
  1. `Unsorted (null)` ➔ **`Ascending ('asc')`**
  2. **`Ascending ('asc')`** ➔ **`Descending ('desc')`**
  3. **`Descending ('desc')`** ➔ **`Unsorted (null)`**
- **Visual Indicators**:
  - `ArrowUp` icon (bold blue) displayed when active column is sorted `asc`.
  - `ArrowDown` icon (bold blue) displayed when active column is sorted `desc`.
  - `ArrowUpDown` icon (muted gray, visible on hover) displayed when column is unsorted.
- **Typical Usage**: Integrated inside table `<th>` elements across master and child workspace grids.
- **Accessibility Considerations**: Renders a semantic `<button type="button">` with `select-none`, clear focus styles, and high-contrast color states.

---

## 5. Parent Summary Banner Component

### 5.1 `ParentSummaryBanner` (`components/card-programmes/parent-summary-banner.tsx`)

Contextual banner component rendered at the top of all child workspace management pages (`Segments`, `Charges`, `References`, `Audit`).

#### Component Signature & Props
```typescript
export interface ParentSummaryBannerProps {
  programme: CardProgramme
  onEditParent?: () => void
  onBackToDetails?: () => void
  onBackToList?: () => void
  currentChildName?: string
}
```

#### Specifications & Behavior
- **Purpose**: Prevents user disorientation by permanently displaying parent product identity, active status, key routing parameters, and navigation triggers when managing child entities.
- **Required Fields**:
  - Parent Identifiers: `card_programme_code`, `card_programme_name`, `card_type` Brand, `active` StatusBadge.
  - Attributes Strip: `bin` Prefix, `platform_indicator`, `pan_length`, `currentChildName`.
- **Layout & Structure**:
  - **Left**: Back to Details button (`ArrowLeft` icon in tooltip), Programme Code, Brand Badge, Status Badge, Programme Name heading.
  - **Center**: 4-column attribute summary card (`BIN`, `Platform`, `PAN Length`, `Active Context`).
  - **Right**: `[Edit Parent]` secondary button and `[All Programmes]` ghost button.
- **Design Rationale**: Replaces split-screen left panels with a lightweight top banner, allowing child workspace tables to consume 100% full screen width.

---

## 6. Core UI Primitives

### 6.1 Button (`components/ui/button.tsx`)
Supports `primary`, `secondary`, `destructive`, `ghost`, `outline` variants, `sm`/`md`/`lg` sizes, and `isLoading` spinner state.

### 6.2 Status Badge (`components/ui/status-badge.tsx`)
Presents entity state (`ACTIVE`, `INACTIVE`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`) using standardized HSL color tokens.

### 6.3 Form Input & Select Controls (`components/ui/input.tsx`, `select.tsx`)
Accessible form inputs supporting `maxLength` limits, character counters (`0/35`), red asterisk required markers, and ₦ currency input prefixes.

### 6.4 Confirmation Dialog (`components/ui/dialog.tsx`)
Explicit modal dialog for confirming sensitive operations (e.g. status activation/deactivation) with mandatory Maker remarks.

### 6.5 Action Dropdown Menu (`components/ui/dropdown-menu.tsx`)
Standardized row action dropdown (`Edit`, `Toggle Status`, `View Audit Logs`).

### 6.6 Accessible Tooltip (`components/ui/tooltip.tsx`)
Hover/focus label overlay for icon-only action triggers across headers, toolbars, and table rows.

### 6.7 Breadcrumbs (`components/ui/breadcrumb.tsx`)
Hierarchical breadcrumb path (e.g., `Configuration > Card Programmes > AG-CL-NGN > Charges`) ensuring clear route awareness.

---

## 7. Component Usage Matrix

The matrix below documents which reusable components are deployed across the `SCR-003 Card Programmes` reference implementation routes:

| Screen Code & Route | `Breadcrumb` | `PageHeader` | `ParentSummaryBanner` | `SortableHeader` | `useRowSelection` | `Checkbox` | `SelectionToolbar` | `StatusBadge` | `Tooltip` | `Button` | `Sheet` / `Dialog` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`SCR-003` Master List** (`/card-programmes`) | **✓** | **✓** | — | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** |
| **`SCR-003` Details Inspector** (`/card-programmes/:id`) | **✓** | **✓** | — | — | — | — | — | **✓** | **✓** | **✓** | **✓** |
| **`SCR-003` Create Form** (`/card-programmes/new`) | **✓** | **✓** | — | — | — | — | — | — | **✓** | **✓** | — |
| **`SCR-003` Edit Form** (`/card-programmes/:id/edit`) | **✓** | **✓** | — | — | — | — | — | — | **✓** | **✓** | — |
| **`SCR-003` Segments Workspace** (`/:id/segments`) | **✓** | — | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** |
| **`SCR-003` Charges Workspace** (`/:id/charges`) | **✓** | — | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** |
| **`SCR-003` References Workspace** (`/:id/references`) | **✓** | — | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | **✓** | — |
| **`SCR-003` Audit Workspace** (`/:id/audit`) | **✓** | — | **✓** | **✓** | **✓** | **✓** | **✓** | — | **✓** | **✓** | — |

**End of Component Library Specification**
