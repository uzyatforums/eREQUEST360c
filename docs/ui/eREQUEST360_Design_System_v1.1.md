# eREQUEST360 UI Design System v1.1

**Version:** 1.1 (Updated for Dedicated React Router Route Architecture Standard)  
**Status:** Approved Specification  
**Author:** PN SYSTEMS LTD & eREQUEST360 Architecture Team  
**Project:** eREQUEST360 – Enterprise Multi-Tenant Card Request & Lifecycle Management Platform  

---

## 1. Vision & Executive Summary

eREQUEST360 is a mission-critical, enterprise-grade banking application used continuously by bank operations staff, branch submitters, authorizers, and system administrators. The primary interface objective is to maximize operational efficiency, eliminate human error during card request processing, enforce multi-tenant isolation, and present clear dual-control (Maker-Checker) status visibility.

### Core Philosophy
- **Predictable & Restrained:** Low cognitive overhead; actions, notifications, and navigation follow consistent rules across all modules.
- **Enterprise Trust:** Clean typography, precise data density, and clear visual hierarchy communicate security and precision.
- **Speed to Task:** Common operations (submitting requests, branch authorization, policy deviation reviews) require <= 3 clicks.
- **Dual-Control Awareness:** Clear visual demarcation of Maker vs. Checker actions, pending items counters, and mandatory audit trail logging.
- **Screen Code Registry Standard:** Every screen is assigned an immutable Screen Code (`SCR-001` through `SCR-015`) registered in `docs/ui/screen_registry.md`.

---

## 2. Master–Detail Configuration Architecture Standard

All master configuration modules (e.g. Card Programmes `SCR-003`, Card Segments `SCR-012`, Card Charges `SCR-013`) follow the standard **Master → Detail React Router Navigation Architecture**:

```
+---------------------------------------------------------------------------------------------------+
| PAGE HEADER: Title, Description, Breadcrumbs, Global Actions [+ New Entity]                      |
+---------------------------------------------------------------------------------------------------+
| FULL-WIDTH MASTER LIST GRID (/card-programmes)                                                    |
| - Integrated Search & Filter Controls, Sortable Column Headers, Row Selection & Checkbox Header   |
+---------------------------------------------------------------------------------------------------+

Route Navigation Hierarchy:
  /card-programmes                          (Full-Width Master Management List)
  ├── /card-programmes/new                  (Dedicated 5-Section Create Form Page)
  ├── /card-programmes/:id                  (Aggregate Parent Details Inspector)
  ├── /card-programmes/:id/edit             (Dedicated 5-Section Edit Form Page + Audit Log)
  ├── /card-programmes/:id/segments         (Customer Segment Eligibility Workspace)
  ├── /card-programmes/:id/charges          (Fee Profiles & Charge Posting Workspace)
  ├── /card-programmes/:id/references       (Integration Mapping Workspace)
  └── /card-programmes/:id/audit            (Audit Trail & Maker-Checker History Workspace)
```

### Key Principles of Master–Detail Route Architecture
1. **Route-Based Detail Navigation:** Clicking any row or View action navigates to the dedicated Parent Details Inspector (`/card-programmes/:id`) or target child workspace without losing history or browser capability.
2. **Contextual Child Workspaces:** Child workspace pages present full-width management tables topped with a `ParentSummaryBanner` to maintain parent orientation across sub-routes:
   - **`[Segments]`**: Mapped customer segment groups and eligibility associations (`/:id/segments`).
   - **`[Charges]`**: Fee headers, entries, GL accounting rules, and NGN pricing structure (`/:id/charges`).
   - **`[References]`**: Core banking, switch, and tax integration mappings (`/:id/references`).
   - **`[Audit]`**: Embedded audit log timeline and change history log (`/:id/audit`).
3. **Dedicated Maintenance Form Pages:** Creating (`/new`) and editing (`/:id/edit`) master entities use dedicated full-page routes with 5 logical full-width sections rather than slide-over drawers or popups.

---

## 3. Design Tokens & Color Palette

eREQUEST360 uses a curated HSL color palette engineered for high contrast (WCAG 2.1 AA compliant > 4.5:1 for normal text).

### 3.1 Primary & Functional Palette

```css
:root {
  /* Brand / Deep Navy Blue */
  --primary: 221.2 83.2% 53.3%;          /* #1E40AF - Deep Blue */
  --primary-foreground: 210 40% 98%;     /* #F8FAFC - White/Slate */
  
  /* Backgrounds & Neutrals */
  --background: 210 40% 98%;             /* #F8FAFC - Light Slate */
  --foreground: 222.2 84% 4.9%;          /* #020817 - Very Dark Slate */
  --card: 0 0% 100%;                     /* #FFFFFF - Pure White */
  --card-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;                /* #F1F5F9 - Light Gray */
  --muted-foreground: 215.4 16.3% 46.9%; /* #64748B - Muted Slate */
  --border: 214.3 31.8% 91.4%;           /* #E2E8F0 - Border Gray */
  
  /* Semantic Status Colors */
  --success: 142.1 76.2% 36.3%;          /* #16A34A - Green */
  --success-foreground: 355.7 100% 97.3%;
  --warning: 37.7 92.1% 50.2%;           /* #D97706 - Amber */
  --warning-foreground: 48 96.5% 98.8%;
  --destructive: 346.8 77.2% 49.8%;      /* #DC2626 - Red */
  --destructive-foreground: 355.7 100% 97.3%;
  --info: 199 89% 48%;                   /* #0284C7 - Info Blue */
  --info-foreground: 210 40% 98%;
}
```

### 3.2 Status Color Mapping Table

| Status Code | Display Label | Badge Background | Text Color | Border Color | Icon (Lucide) |
|-------------|---------------|------------------|------------|--------------|---------------|
| `PENDING` | Pending Settlement | `bg-amber-50` | `text-amber-700` | `border-amber-200` | `Clock` |
| `PENDING_APPROVAL` | Pending Approval | `bg-amber-100` | `text-amber-800` | `border-amber-300` | `AlertCircle` |
| `PENDING_AUTHORIZATION` | Pending Authorization | `bg-blue-50` | `text-blue-700` | `border-blue-200` | `ShieldAlert` |
| `APPROVED` | Approved | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | `CheckCircle2` |
| `COMPLETED` | Completed | `bg-green-100` | `text-green-800` | `border-green-300` | `CheckCheck` |
| `REJECTED` | Rejected | `bg-red-50` | `text-red-700` | `border-red-200` | `XCircle` |
| `HOTLISTED` | Hotlisted | `bg-purple-50` | `text-purple-700` | `border-purple-200` | `Flame` |
| `SETTLEMENT_FAILED` | Settlement Failed | `bg-rose-100` | `text-rose-800` | `border-rose-300` | `AlertTriangle` |
| `ACTIVE` | Active | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | `Check` |
| `INACTIVE` | Inactive | `bg-gray-100` | `text-gray-600` | `border-gray-300` | `MinusCircle` |

---

## 4. Typography

System font stack prioritizes native performance and legibility: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`. Monospaced data (Request IDs, Account Numbers, Card PAN hashes) uses `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.

| Style Level | Size | Weight | Line Height | Usage |
|-------------|------|--------|-------------|-------|
| `Display / Title` | 24px (1.5rem) | 600 (Semibold) | 1.2 | Main Page Headers |
| `Heading 1` | 20px (1.25rem) | 600 (Semibold) | 1.3 | Card Section Titles, Modal Headers |
| `Heading 2` | 16px (1.0rem) | 500 (Medium) | 1.4 | Form Section Labels, Page Subheaders |
| `Body Standard` | 14px (0.875rem) | 400 (Regular) | 1.5 | Grid Cells, Form Field Values, Body Copy |
| `Body Medium` | 14px (0.875rem) | 500 (Medium) | 1.5 | Table Column Headers, Button Labels |
| `Caption / Small` | 12px (0.75rem) | 400 (Regular) | 1.4 | Helper text, Timestamp subtitles, Footers |
| `Monospace Code` | 13px (0.8125rem) | 500 (Medium) | 1.4 | Request ID `REQ-2026-001`, Account `1011122200` |

---

## 5. Standard Component Patterns

### 5.1 Data Tables & Master Grids
- **Row Density:** 36px row height with alternating row hover highlight (`hover:bg-muted/50`).
- **Sortable Column Headers:** Clickable column headers supporting 3-state sorting cycle (`asc` -> `desc` -> `null`) with visual chevron direction indicators.
- **Pagination:** Bottom right displaying `Showing 1-25 of 142 items` with Page Size Selector `[10, 25, 50]` and Next/Prev controls.

### 5.2 Maintenance Form Pages (Dedicated React Router Routes)
- **Routes:** Creation (`/new`) and editing (`/:id/edit`) operate on dedicated full-page routes.
- **Form Layout:** Organized into 5 logical full-width sections (General Product Identity, Scheme & BIN Parameters, Financial Rules, Operational Controls, Audit Metadata).
- **Audit Metadata:** System-managed audit fields are rendered as read-only font-mono labels in edit mode.
- **Footer:** Fixed action bar with `Cancel` (Secondary Outline) on left and `Save Specifications` (Primary Solid) on right.

### 5.3 Action Confirmation Dialogs
- **Usage:** Explicit double-check confirmation dialogs with required remarks for status changes (`Activate` / `Deactivate`).

---

## 6. Accessibility & Responsive Standards

### 6.1 Accessibility (WCAG 2.1 AA)
- **Form Controls:** Include `aria-invalid` and `aria-describedby` helper IDs.
- **Keyboard Navigation:** Full support for `Tab`, `Enter`, `Space`, and `Escape` key handlers on all interactive elements.

---

**End of eREQUEST360 Design System v1.1**
