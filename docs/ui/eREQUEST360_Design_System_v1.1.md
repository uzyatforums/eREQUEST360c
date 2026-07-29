# eREQUEST360 UI Design System v1.1

**Version:** 1.1  
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

---

## 2. Version 1.1 Improvements & Justifications

Design System v1.1 builds upon the initial v1.0 foundation to introduce critical enterprise banking enhancements:

| # | Improvement | Description | Reasoning & Architectural Justification |
|---|-------------|-------------|------------------------------------------|
| 1 | **Dual-Control (Maker-Checker) UX Semantics** | Added dedicated visual badges, work-item queue counters, and side-by-side payload diff viewers for pending maker-checker actions. | Aligns UI with `docs/architecture/025-032` Maker-Checker engine. Prevents accidental self-approval by Makers and provides explicit audit context for Checkers. |
| 2 | **Tenant & Branch Context Switcher** | Header component displaying active Tenant (`client_id`) and Branch (`branch_code`) with multi-tenant indicator. | Supports multi-tenant backend architecture (`docs/architecture/eREQUEST360_Architecture_v1.0.md` Section 5.1). Guarantees user awareness of operating client scope. |
| 3 | **Command Palette (`Ctrl+K` / `Cmd+K`)** | Global quick-action overlay allowing keyboard navigation to any screen or searching requests by ID/Account number. | Enhances power-user speed (Target < 1s lookup), fulfilling the operational speed principle (#3.4). |
| 4 | **Expanded Design Tokens & Color Palette** | Standardized HSL color variables with defined WCAG 2.1 AA contrast ratios for light/dark themes and 10 state badges. | Ensures accessibility compliance (#24) and guarantees consistent badge coloring across table rows, status history, and dashboards. |
| 5 | **Standardized Master-Detail Drawers (Sheet UI)** | Mandated slide-over right-side drawers for record creation/editing rather than navigating away or launching blocking popups. | Keeps user context intact, reduces page loads, and provides smooth multi-tasking on high-resolution workstation monitors. |
| 6 | **Explicit Action Confirmation Dialogs** | Defined mandatory double-check confirmation dialogs with required remarks fields for sensitive operations (Approve, Reject, Hotlist, Link Account). | Prevents catastrophic operational errors on financial card accounts (#3.5 Security). |
| 7 | **Responsive Column Priority Grid** | Formulated column hide/show priorities (`priority-1` to `priority-4`) for data tables across wide, desktop, and tablet breakpoints. | Guarantees dense financial grids remain readable on varying branch workstation display sizes without horizontal overflow breaks. |

---

## 3. Design Principles & Guidelines

### 3.1 Consistency
All pages follow identical 3-tier layout hierarchy: **Page Header -> Filter & Action Bar -> Data Grid / Workspace**. Button colors, icon choices, and notification patterns remain uniform across all 15+ sub-modules.

### 3.2 Information Density & Spatial Rhythm
Bank operators process large volumes of requests daily. Interface density uses compact 36px table row heights, 8px base spacing grid, and standard 14px body typography to display complete record context without unnecessary whitespace padding.

### 3.3 Defensive Banking UX
- **No Silent Failures:** Every API call produces clear visual feedback (Toast notification, inline error banner, or skeleton loader).
- **Destructive Action Safety:** Critical operations (Hotlisting, Policy Deviation Overrides, User Deactivation) use red solid primary buttons and require confirmation text or remarks.
- **Unsaved Changes Guard:** Leaving a modified form drawer prompts an unsaved changes alert modal.

---

## 4. Color System & Tokens

eREQUEST360 uses a curated HSL color palette engineered for high contrast (WCAG 2.1 AA compliant > 4.5:1 for normal text).

### 4.1 Primary & Functional Palette

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

### 4.2 Status Color Mapping Table

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

## 5. Typography

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

## 6. Layout Specification

### 6.1 Header (Top Navigation Bar)
- **Height:** 56px (`h-14`)
- **Tenant Context Indicator:** Displays current Tenant Name & ID with multi-tenant switcher dropdown (Super Admin only).
- **Branch Context Indicator:** Displays current user's active branch code.
- **Global Command Search:** Input trigger launching `Ctrl+K` palette.
- **Notifications Trigger:** Bell icon with live badge counter for pending approvals or failed settlements.
- **User Profile Menu:** Displays avatar, user ID, role badge, and Logout trigger.

### 6.2 Collapsible Sidebar
- **Width:** 240px expanded (`w-60`), 64px collapsed (`w-16`).
- **Grouping:** Logically segmented into **Core Workflows**, **Dual-Control Queue**, **System Management**, and **Analytics**.
- **Badge Indicators:** Displays real-time pending counters (e.g., Maker-Checker queue pending count).

### 6.3 Status Bar (Footer)
- **Height:** 28px (`h-7`)
- **Metadata:** Shows DB connection status, target DB name (`erequest360c`), API version, environment flag (`DEVELOPMENT` / `STAGING` / `PRODUCTION`), and security session inactivity countdown timer.

---

## 7. Standard Component Patterns

### 7.1 Data Tables (`TanStack Table` + `shadcn/ui`)
- **Row Density:** 36px row height with alternating row hover highlight (`hover:bg-muted/50`).
- **Sticky Header:** Top header remains fixed during vertical scroll.
- **Toolbar:** Integrated Search Input (instant debounced filter), Status Filter dropdown, Branch Filter, Date Picker, Export (CSV/Excel) button, and Column Visibility toggle.
- **Pagination:** Bottom right displaying `Showing 1-25 of 142 items` with Page Size Selector `[25, 50, 100]` and Next/Prev controls.

### 7.2 Form Drawers (`Sheet Component`)
- **Position:** Slides in from the right edge, occupying 480px width (Desktop) or 100% (Mobile).
- **Header:** Sticky top header with title, close icon `X`, and description.
- **Body:** Scrollable form controls grouped into distinct card sections with standard 16px gaps.
- **Footer:** Fixed bottom bar with `Cancel` (Secondary Outline) on left and `Save Changes` (Primary Solid) on right.

### 7.3 Modal Dialogs
- **Width:** 450px to 600px centered overlay with backdrop blur.
- **Usage:** Confirmation for critical actions, password resets, hotlisting confirmation, or approval rejection comments.

---

## 8. Accessibility & Responsive Standards

### 8.1 Accessibility (WCAG 2.1 AA)
- **Keyboard Navigation:** Full support for `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape` key handlers on all interactive elements.
- **Focus Rings:** Visible high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).
- **Screen Reader Labels:** All icons have corresponding `aria-label` or hidden screen-reader text (`sr-only`).
- **Target Sizes:** Touch/click targets minimum 44px x 44px or 36px with padding buffer.

### 8.2 Responsive Layout Breakpoints

| Breakpoint | Screen Width | Sidebar State | Form Layout | Table Columns Displayed |
|------------|--------------|---------------|-------------|-------------------------|
| `xl / 2xl` | >= 1280px | Expanded (240px) | 2-Column Grid | All Columns (Priority 1 - 4) |
| `lg` | 1024px - 1279px | Expanded (240px) | 2-Column Grid | Priority 1, 2, 3 Columns |
| `md` | 768px - 1023px | Collapsed (64px) | Single Column | Priority 1, 2 Columns |
| `sm / mobile` | < 768px | Hidden (Drawer toggle) | Single Column | Priority 1 Columns + Expandable Row |

---

## 9. Design System Completion Checklist

A UI component or screen design is compliant with Design System v1.1 when:

- [x] Uses standard HSL design tokens from Section 4.
- [x] Adheres to WCAG 2.1 AA color contrast standards.
- [x] Includes standard Page Header, Toolbar, Content Container, and Breadcrumbs.
- [x] Form fields include inline validation messages and mandatory `*` indicators.
- [x] All status tags map to official status badges defined in Section 4.2.
- [x] Integrates Maker-Checker dual control indicators where applicable.
- [x] All actions provide immediate visual feedback (toast / loader).
- [x] Responsive layout collapses gracefully down to tablet/mobile viewports.

---

**End of eREQUEST360 Design System v1.1**
