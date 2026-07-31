# eREQUEST360 Component Library Specification

**Version:** 1.1 (Updated with Master-Detail Layout Pattern)  
**Status:** Approved  
**Framework Target:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons  

---

## 1. Overview

This document specifies the standard component primitives and composite UI modules for eREQUEST360. All components are built on top of `shadcn/ui` (Radix UI primitives styled with Tailwind CSS) to ensure full WCAG 2.1 AA accessibility, keyboard predictability, and visual consistency.

---

## 2. Master → Detail Composite Navigation Pattern

Used for aggregate configuration workspaces (`SCR-003`, and reusable for `SCR-012`, `SCR-013`, `SCR-006`, `SCR-004`). Replaces split-screen layout with full-width master management grids and dedicated detail and child workspace sub-routes.

### 2.1 Parent Summary Banner (`components/card-programmes/parent-summary-banner.tsx`)
Displayed at the top of all child entity management pages (`Segments`, `Charges`, `References`, `Audit`) to maintain context orientation. Displays Programme Code, Name, Card Brand, BIN, Active Status, and an "Edit Parent" action trigger.

### 2.2 Accessible Tooltip (`components/ui/tooltip.tsx`)
Provides hover/focus label overlays for icon-only buttons (Edit, Delete, Clone, Refresh, Assign, Back, View) across data tables and action bars.

### 2.3 Breadcrumb Bar (`components/ui/breadcrumb.tsx`)
Standardized breadcrumb navigation path (e.g., `Configuration > Card Programmes > AG-CL-NGN > Charges`) ensuring predictable hierarchical navigation.

```typescript
interface MasterDetailLayoutProps<T> {
  // Master list props
  items: T[];
  selectedItem: T | null;
  onSelectItem: (item: T) => void;
  renderMasterItem: (item: T, isSelected: boolean) => React.ReactNode;
  masterSearchPlaceholder?: string;
  onMasterCreate?: () => void;
  isLoading?: boolean;
  
  // Detail workspace props
  detailHeader?: React.ReactNode;
  tabs: {
    id: 'general' | 'segments' | 'charges' | 'audit' | 'usage';
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }[];
}
```

### 2.4 DataGrid Selection Framework

A reusable row selection architecture for configuration and operational data tables.

#### Components & Primitives
1. **`useRowSelection<T>` Hook (`hooks/use-row-selection.ts`)**: Reusable state management for grid selection.
   - Provides `selectedIds`, `selectedCount`, `selectedItems`, `isSelected()`, `toggleRow()`, `selectAll()`, `clearSelection()`, `toggleSelectAll()`, `isAllSelected`, `isSomeSelected`, `isNoneSelected`.
2. **`Checkbox` Primitive (`components/ui/checkbox.tsx`)**: Form control supporting standard HTML props and `indeterminate` state (`ref.current.indeterminate = true`).
3. **`SelectionToolbar` Component (`components/ui/selection-toolbar.tsx`)**: Sticky or embedded status toolbar displaying:
   - Selection count badge (e.g. `"3 selected"` or `"No items selected"`)
   - `[Clear Selection]` trigger button
   - `[Bulk Actions]` disabled trigger button with tooltip (*"Bulk actions will be enabled in a future release."*)

#### Behavior Rules
- **Select All Checkbox**: Header checkbox in column 1. Selects all currently filtered/displayed rows when clicked; clears all when clicked again.
- **Indeterminate State**: Displays a dash icon (`indeterminate = true`) when 1 or more rows are selected, but fewer than the total visible row count.
- **Event Isolation**: Row checkbox clicks must execute `e.stopPropagation()` to prevent unwanted navigation into detail inspectors.

---

## 3. Core UI Primitives

### 3.1 Button (`components/ui/button.tsx`)

| Variant | Tailwind Classes | Usage / Guidelines |
|---------|------------------|--------------------|
| `primary` | `bg-primary text-primary-foreground hover:bg-primary/90` | Main call to action per page (e.g. "Create Request", "Submit", "Save Configuration"). Max one primary button per primary workflow view. |
| `secondary` | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` | Secondary/cancel actions, toolbar filters, drawers, and modal dismissals. |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Irreversible/dangerous actions ("Reject Request", "Hotlist Card", "Deactivate User"). |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Table row action menus, breadcrumb links, icon-only buttons. |
| `outline` | `border border-primary text-primary hover:bg-primary/10` | Secondary primary-equivalent actions ("Export Excel", "Download PDF"). |

---

### 3.2 Status Badge (`components/ui/status-badge.tsx`)

Used across tables, detail pages, and dashboards to present request and entity state consistently.

```typescript
export type StatusType = 
  | 'PENDING' | 'PENDING_APPROVAL' | 'PENDING_AUTHORIZATION' 
  | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'HOTLISTED' 
  | 'SETTLEMENT_FAILED' | 'ACTIVE' | 'INACTIVE';

interface StatusBadgeProps {
  status: StatusType | boolean;
  label?: string;
  showIcon?: boolean;
  className?: string;
}
```

---

### 3.3 Form Input & Select Controls (`components/ui/input.tsx`, `select.tsx`)

Form fields use React Hook Form + Zod schema validation.

- **Accessibility:** Includes `aria-invalid={!!error}` and `aria-describedby` helper IDs.
- **Length Limit Support:** `maxLength={35}` with `0/35` character counter.
- **Required Field Marker:** Red asterisk `<span className="text-destructive">*</span>`
- **Focus State:** `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

---

### 3.4 Action Confirmation Dialog (`components/ui/dialog.tsx`)

Explicit modal dialog for confirming sensitive operations (e.g. Deactivating a Card Programme). Supports mandatory remarks for Maker users.

---

### 3.5 Row Action Dropdown Menu (`components/ui/dropdown-menu.tsx`)

Standard popup dropdown for table row actions:
- `Edit Programme`
- `Toggle Status (Activate / Deactivate)`
- `View Audit Logs`

---

## 4. Toast Notifications Specification

Global notifications triggered via `useToast()` hook (`shadcn/ui` toast):

```typescript
toast({
  title: "Request Approved Successfully",
  description: "Request #REQ-2026-004 has been sent for settlement.",
  variant: "success", // default, destructive, success, warning, info
});
```

---


## Master-Detail Layout

Purpose:
Reusable layout for all configuration modules.

Components:

- Filter Bar
- Master List
- Detail Panel
- Entity Header
- Tab Strip
- Child Grid
- Pagination
- Empty State
- Loading State

Used By:

- Card Programmes
- Card Segments
- Card Charges
- Branches
- Users
- Roles
- Permissions

## Assignment Dialog

Purpose:

Assign child entities to a parent.

Examples:

- Programme → Segments
- Programme → Charges
- User → Roles
- Role → Permissions

Functions:

- Search
- Multi-select
- Priority
- Default selection
- Save
- Cancel

**End of Component Library Specification**
