# eREQUEST360 UI Design System v1.1

**Version:** 1.1 (Updated for Master-Detail Configuration Standard)  
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

All master configuration modules (e.g. Card Programmes `SCR-003`, Card Segments `SCR-012`, Card Charges `SCR-013`) follow the standard **2-Column Master-Detail Layout**:

```
+---------------------------------------------------------------------------------------------------+
| PAGE HEADER: Title, Description, Breadcrumbs, Global Actions [+ New Entity]                      |
+--------------------------------------------------+------------------------------------------------+
| MASTER SELECTOR PANEL (LEFT: 380px / 35%)        | DETAIL WORKSPACE PANEL (RIGHT: FLEX-1 / 65%)   |
| - Integrated Search Bar                          | - Active Entity Header & Metadata Bar          |
| - Compact Master List Rows                       | - Action Dropdown [...]                        |
| - Active Selection Highlight                     | - Sub-Tab Navigation Bar:                      |
| - Status Badges                                  |   [General] [Segments] [Charges] [Audit] [Usage]|
| - Pagination Controls                            | - Tab Workspace Content Area                   |
+--------------------------------------------------+------------------------------------------------+
```

### Key Principles of Master–Detail Layout
1. **Single-Click Selection:** Single-clicking any row in the left Master Selector sets it as active (`border-l-4 border-l-blue-600 bg-blue-50/50`) and populates the right Detail Workspace without a full page reload.
2. **Contextual Sub-Tabs:** Detail workspaces present 5 standard tabs:
   - **`[General]`**: Core database parameters mapping the master table.
   - **`[Segments]`**: Mapped customer segment groups and eligibility associations.
   - **`[Charges]`**: Fee headers, entries, GL accounting rules, and pricing structure.
   - **`[Audit]`**: Embedded audit log timeline from `audit.audit_events` filtered by entity ID.
   - **`[Usage]`**: Operational metrics, total card volume, and linked request history.
3. **Drawer Editing:** Creating and editing master entities continues to use the slide-over Sheet drawer (`480px` width) to preserve context.

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
| `Heading 2` | 16px (1.0rem) | 500 (Medium) | 1.4 | Form Section Labels, Drawer Subheaders |
| `Body Standard` | 14px (0.875rem) | 400 (Regular) | 1.5 | Grid Cells, Form Field Values, Body Copy |
| `Body Medium` | 14px (0.875rem) | 500 (Medium) | 1.5 | Table Column Headers, Button Labels |
| `Caption / Small` | 12px (0.75rem) | 400 (Regular) | 1.4 | Helper text, Timestamp subtitles, Footers |
| `Monospace Code` | 13px (0.8125rem) | 500 (Medium) | 1.4 | Request ID `REQ-2026-001`, Account `1011122200` |

---

## 5. Standard Component Patterns

### 5.1 Data Tables & Master Selector Grids
- **Row Density:** 36px row height with alternating row hover highlight (`hover:bg-muted/50`).
- **Active Selection Highlight:** `border-l-4 border-l-blue-600 bg-blue-50/50`.
- **Pagination:** Bottom right displaying `Showing 1-25 of 142 items` with Page Size Selector `[10, 25, 50]` and Next/Prev controls.

### 5.2 Form Drawers (`Sheet Component`)
- **Position:** Slides in from the right edge, occupying 480px width (Desktop) or 100% (Mobile).
- **Header:** Sticky top header with title, close icon `X`, and description.
- **Body:** Scrollable form controls with length limits (`maxLength={35}`) and character counters (`0/35`).
- **Footer:** Fixed bottom bar with `Cancel` (Secondary Outline) on left and `Save Changes` (Primary Solid) on right.

### 5.3 Action Confirmation Dialogs
- **Usage:** Explicit double-check confirmation dialogs with required remarks for status changes (`Activate` / `Deactivate`).

---

## 6. Accessibility & Responsive Standards

### 6.1 Accessibility (WCAG 2.1 AA)
- **Form Controls:** Include `aria-invalid` and `aria-describedby` helper IDs.
- **Keyboard Navigation:** Full support for `Tab`, `Enter`, `Space`, and `Escape` key handlers on all interactive elements.

---

**End of eREQUEST360 Design System v1.1**
