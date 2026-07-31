# eREQUEST360 UI Standards & Production Readiness Checklist

**Version:** 1.1 (Updated with Master-Detail Configuration Standard)  
**Status:** Official UI Quality Standard  
**Author:** PN SYSTEMS LTD & eREQUEST360 Architecture Team  

---

## 1. Overview & Purpose

The **UI Standards & Production Readiness Checklist** defines the 15 mandatory design, security, accessibility, and code quality criteria required before any screen in eREQUEST360 is approved for production deployment.

Every screen built in eREQUEST360 must follow the Master-Detail reference patterns established by **`SCR-003` (Card Programmes Master)**.

---

## 2. Standard 15-Point UI Checklist

| # | Check Criterion | Mandatory Requirement | SCR-003 Reference Implementation | Status |
|---|-----------------|-----------------------|----------------------------------|--------|
| **1** | **Screen Code Registration** | Must be assigned a unique Screen Code (`SCR-XXX`) registered in `docs/ui/screen_registry.md`. | Registered as `SCR-003` in `screen_registry.md`. | [x] Passed |
| **2** | **Master-Detail Split Layout** | Master configuration screens must use 2-Column Split layout: Left Master Selector (`380px`), Right 5-Tab Detail Workspace (`General`, `Segments`, `Charges`, `Audit`, `Usage`). | 2-Column Master-Detail Layout specified for `SCR-003`. | [x] Passed |
| **3** | **Database Field Alignment** | Every field in the primary SQL table must be represented without truncation (`maxLength={35}` on codes). | Maps all columns of `config.card_programmes` with `maxLength={35}` on codes. | [x] Passed |
| **4** | **Master-Detail Sheet Drawer** | Record creation and editing must take place in slide-over Sheet drawers (`480px` width) rather than blocking popups. | `Sheet` component handles Create/Edit without losing context. | [x] Passed |
| **5** | **Row Action Menu (`...`)** | Every data grid row must feature a standardized dropdown menu containing context actions (`Edit`, `Toggle Status`, `View Audit Logs`). | `DropdownMenu` component integrated into row cells. | [x] Passed |
| **6** | **Confirmation Dialogs** | Destructive or status-changing operations must require explicit confirmation modals with optional/required remarks. | `Dialog` component handles activate/deactivate actions. | [x] Passed |
| **7** | **Dual-Control / Maker-Checker** | Maker users (`isMakerOnly`) must see clear workflow banners and submit actions to Maker-Checker work items. | Amber notice banner & `submitMakerCheckerWorkItem` API integration. | [x] Passed |
| **8** | **Audit Integration** | Must display creation/modification audit metadata and provide an embedded `[Audit]` tab and direct link to `SCR-014` (Audit Inspector). | Displays `created_by`, `created_date`, embedded audit tab, and `[View Audit Logs (SCR-014)]` trigger. | [x] Passed |
| **9** | **Status Badge Color Tokens** | Status indicators must use standard HSL badge tokens defined in Design System v1.1. | Uses `StatusBadge` (`bg-emerald-50 text-emerald-700 border-emerald-200` for Active). | [x] Passed |
| **10** | **Accessibility (WCAG 2.1 AA)** | Input controls must include `aria-invalid`, `aria-describedby`, keyboard navigation (`Esc`), and high-contrast focus rings. | `Input` and `Select` include full `aria-` attributes and keyboard handlers. | [x] Passed |
| **11** | **Input Length & Formatting** | Form inputs must enforce database column length limits (`maxLength`) and format sanitization (e.g. uppercase codes). | Enforces `maxLength={35}` with character counters (`0/35`) and regex validation. | [x] Passed |
| **12** | **Performance & Debouncing** | Instant search inputs must implement 300ms debounce to prevent performance degradation on large datasets. | 300ms `useEffect` debounce implemented in `DataTable`. | [x] Passed |
| **13** | **Loading & Skeleton States** | Grid and submit actions must display animated skeleton rows and loading spinners. | Animated skeleton rows and `isLoading` button spinners active. | [x] Passed |
| **14** | **Empty State Guidance** | Filtering or searching resulting in 0 records must display centered empty state with helpful guidance. | Centered `Inbox` icon with guidance text. | [x] Passed |
| **15** | **SAST / Security Patterns** | Code must prevent XSS/SQL injection patterns, use parameterization, and enforce strict TypeScript typing. | Sanitized inputs, strict TypeScript types, zero `eval` or unsafe HTML. | [x] Passed |

---

## 3. Approved Screen Reference Log

| Screen Code | Screen Name | Approval Date | Reference Implementation Path |
|-------------|-------------|---------------|-------------------------------|
| `SCR-003` | **Card Programmes Master** | 2026-07-29 | `frontend/src/pages/card-programmes.tsx` |

---

## Buttons

☐ Every icon has tooltip

☐ Every destructive action has confirmation

☐ Every dialog has Cancel

☐ ESC closes modal

☐ ENTER submits form

☐ Loading indicator displayed

☐ Double-click protection

☐ Disabled buttons visually distinct

**End of UI Standards & Production Readiness Checklist**
