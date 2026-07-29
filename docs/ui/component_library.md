# eREQUEST360 Component Library Specification

**Version:** 1.1  
**Status:** Approved  
**Framework Target:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons  

---

## 1. Overview

This document specifies the standard component primitives and composite UI modules for eREQUEST360. All components are built on top of `shadcn/ui` (Radix UI primitives styled with Tailwind CSS) to ensure full WCAG 2.1 AA accessibility, keyboard predictability, and visual consistency.

---

## 2. Core UI Primitives

### 2.1 Button (`components/ui/button.tsx`)

| Variant | Tailwind Classes | Usage / Guidelines |
|---------|------------------|--------------------|
| `primary` | `bg-primary text-primary-foreground hover:bg-primary/90` | Main call to action per page (e.g. "Create Request", "Submit", "Save Configuration"). Max one primary button per primary workflow view. |
| `secondary` | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` | Secondary/cancel actions, toolbar filters, drawers, and modal dismissals. |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Irreversible/dangerous actions ("Reject Request", "Hotlist Card", "Deactivate User"). |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Table row action menus, breadcrumb links, icon-only buttons. |
| `outline` | `border border-primary text-primary hover:bg-primary/10` | Secondary primary-equivalent actions ("Export Excel", "Download PDF"). |

**Props Contract:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

---

### 2.2 Status Badge (`components/ui/status-badge.tsx`)

Used across tables, detail pages, and dashboards to present request and entity state consistently.

```typescript
export type StatusType = 
  | 'PENDING' | 'PENDING_APPROVAL' | 'PENDING_AUTHORIZATION' 
  | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'HOTLISTED' 
  | 'SETTLEMENT_FAILED' | 'ACTIVE' | 'INACTIVE';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  className?: string;
}
```

---

### 2.3 Form Input Controls (`components/ui/input.tsx`, `select.tsx`, `form.tsx`)

Form fields use React Hook Form + Zod schema validation.

- **Required Field Marker:** Red asterisk `<span className="text-destructive">*</span>`
- **Inline Error:** Form field helper text `<p className="text-xs text-destructive mt-1">{error.message}</p>`
- **Focus State:** `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`

---

## 3. Composite UI Components

### 3.1 Data Table (`components/shared/data-table.tsx`)

Built on `TanStack Table v8`. Standard grid container for all tabular domain data.

```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  filterOptions?: {
    columnId: string;
    title: string;
    options: { label: string; value: string }[];
  }[];
  onExportExcel?: () => void;
  isLoading?: boolean;
}
```

**Features:**
- Integrated search input with 300ms debounce
- Multi-column filtering (e.g. Filter by Status, Branch, Client)
- Sorting on click of column headers
- Page size switcher (`[25, 50, 100]` rows per page)
- Sticky header with shadow on scroll
- Empty state fallback displaying `Lucide.Inbox` icon and custom empty text.

---

### 3.2 Page Header (`components/shared/page-header.tsx`)

Standard top header section for all application pages.

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  makerCheckerPendingCount?: number;
}
```

---

### 3.3 Metric / KPI Card (`components/shared/kpi-card.tsx`)

Used on Executive and Operational dashboards to display real-time counters.

```typescript
interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: 'default' | 'warning' | 'destructive' | 'success';
}
```

---

### 3.4 Form Drawer Sheet (`components/shared/form-sheet.tsx`)

Slide-over right panel for creating/editing records without leaving grid context.

```typescript
interface FormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}
```

---

### 3.5 Maker-Checker Work Item Panel (`components/shared/maker-checker-panel.tsx`)

Dedicated component for reviewing pending Maker-Checker actions. Shows original payload vs updated payload diffs.

```typescript
interface MakerCheckerPanelProps {
  workItemId: number;
  entityType: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SPECIAL_APPROVAL';
  makerUser: string;
  submittedAt: string;
  payloadSummary: Record<string, any>;
  onApprove: (remarks?: string) => void;
  onReject: (remarks: string) => void;
}
```

---

### 3.6 Audit Timeline View (`components/shared/audit-timeline.tsx`)

Chronological activity feed displaying audit trail entries.

```typescript
interface AuditEntry {
  id: number;
  eventTime: string;
  performedBy: string;
  action: string;
  details?: { column: string; oldValue: string; newValue: string }[];
  remarks?: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
}
```

---

## 4. Toast Notifications Specification

Global notifications triggered via `useToast()` hook (`shadcn/ui` toast):

```typescript
toast({
  title: "Request Approved Successfully",
  description: "Request #REQ-2026-004 has been sent for settlement.",
  variant: "default", // default, destructive, success
});
```

- **Duration:** 4000ms default.
- **Position:** Bottom-right viewport overlay.

---

**End of Component Library Specification**
