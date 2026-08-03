# eREQUEST360 UI Standards
**Version:** 1.0
**Status:** Draft
**Last Updated:** 01-Aug-2026

---

# 1. Purpose

This document defines the standard user interface architecture, navigation, behaviour, and visual conventions for every screen within eREQUEST360.

All future modules SHALL conform to these standards unless an approved exception exists.

SCR-003 (Card Programmes Master) serves as the reference implementation.

---

# 2. Design Principles

The UI shall be:

- Banking-oriented rather than consumer-oriented.
- Consistent throughout the application.
- Fast to navigate.
- Keyboard-friendly.
- Maker/Checker ready.
- Mobile responsive where practical.
- Accessible.
- Predictable.

Users should never need to learn a new interface when moving between modules.

---

# 3. Navigation Architecture

All maintenance modules shall use:

**Master → Detail Navigation**

instead of slide-out drawers.

Example:

```
Configuration
    Card Programmes
        Details
            Segments
            Charges
            References
            Audit
```

---

# 4. React Router

Every screen SHALL have its own URL.

Examples:

```
/card-programmes
/card-programmes/new
/card-programmes/15
/card-programmes/15/edit
/card-programmes/15/segments
/card-programmes/15/charges
/card-programmes/15/references
/card-programmes/15/audit
```

Benefits:

- Browser Refresh
- Browser Back
- Browser Forward
- Deep Links
- Bookmarking

must work without exception.

---

# 5. Page Layout

Every page consists of:

```
-------------------------------------------------
Header
-------------------------------------------------
Breadcrumb
-------------------------------------------------
Page Title
-------------------------------------------------
Toolbar
-------------------------------------------------
Content
-------------------------------------------------
Footer (optional)
-------------------------------------------------
```

---

# 6. Master List Screens

Every master screen SHALL include:

- Search
- Filter
- Refresh
- New
- Export (future)
- Column Chooser
- Records Per Page selector
- Pagination
- Sortable Columns
- Row Selection

---

# 7. Maintenance Forms

Maintenance shall use dedicated pages.

Drawers SHALL NOT be used.

Typical routes:

```
/new
/edit
```

Forms should use logical sections.

Example:

```
General Information

Financial Rules

Operational Controls

Notifications

Audit Information
```

---

# 8. Parent Summary Banner

Every child workspace shall display a summary banner showing:

- Parent Code
- Parent Name
- Status
- Key identifiers

Example:

```
Programme Code
Programme Name
Card Scheme
BIN
Status
```

---

# 9. Breadcrumbs

Every page below level one SHALL display breadcrumbs.

Example:

```
Configuration

>

Card Programmes

>

AG-CL-NGN

>

Charges
```

Breadcrumb items shall be clickable.

---

# 10. Data Grids

Every grid SHALL support:

✔ Sorting

✔ Row Selection

✔ Select All

✔ Indeterminate Selection

✔ Column Resizing (future)

✔ Column Reordering (future)

✔ Column Chooser

✔ Pagination

✔ Refresh

✔ Keyboard Navigation (future)

---

# 11. Row Selection

All operational grids SHALL support:

□ Select Row

☑ Select All

Selection Toolbar

Bulk Actions (future)

Rows shall remain selected until:

- cleared
- page changes
- user refreshes (configurable)

---

# 12. Sorting

Every column header shall be clickable.

Sort cycle:

```
Unsorted

↓

Ascending

↓

Descending

↓

Unsorted
```

Sort indicators shall be visible.

---

# 13. User Preferences

User preferences shall be persisted.

Examples:

Global

- Theme
- Language
- Landing Page

Screen

- Hidden Columns
- Column Order
- Column Width
- Records Per Page
- Default Sort
- Filters

---

# 14. Lookup Controls

Foreign keys SHALL use dropdowns.

Examples:

Client

Branch

Card Scheme

Segment

Charge Header

Currency

NOT free-text.

---

# 15. Read-only Fields

System-managed fields SHALL be read-only.

Examples:

Created By

Created Date

Modified By

Modified Date

Version

---

# 16. Currency Standards

Supported currencies:

Multi-currency platform (NGN, USD, EUR, GBP, etc.)

Input fields:

Numeric values only. Currency symbols (₦, $, €, £, etc.) MUST NOT be embedded inside amount input fields; monetary fields inherit currency from the parent business entity.

Data grids:

ISO currency code column (NGN, USD, EUR, GBP, etc.)

Dollar ($) icons SHALL NOT be used unless explicitly representing USD transactions.

Currency-neutral icons (e.g. Coins, Receipt) are required.

---

# 17. Icons

Icons should reflect banking operations.

Preferred examples:

Receipt

Banknote

Credit Card

Ledger

Branch

Customer

Audit

Settings

Avoid decorative or misleading icons.

---

# 18. Tooltips

Every icon-only button SHALL have a tooltip.

Examples:

Edit

Delete

Clone

Refresh

Approve

Reject

Assign

---

# 19. Placeholder Pages

Modules not yet implemented SHALL use React routes.

Placeholder pages shall NEVER expose backend API endpoints.

Example:

```
/branches
```

NOT

```
/config/branches
```

---

# 20. Audit Information

Every configuration module SHALL include:

Created By

Created Date

Modified By

Modified Date

Version

where applicable.

---

# 21. Maker / Checker Readiness

Configuration modules should be designed with Maker/Checker support in mind.

Future capabilities include:

- Pending Changes
- Approval Queue
- Reject with Reason
- Compare Before/After
- Approval History
- Bulk Approval

---

# 22. Performance

Pages should:

- load quickly
- minimise unnecessary API calls
- preserve state during navigation
- refresh without losing context

---

# 23. SCR-003 Reference Module

The Card Programmes module (SCR-003) is the reference implementation for:

- Navigation
- Layout
- Forms
- Parent Summary Banner
- Child Workspaces
- Row Selection
- Sortable Grids
- Routing
- Breadcrumbs

Future modules shall reuse these patterns.

---

# 24. Future Enhancements

Planned reusable capabilities include:

- Saved Searches
- Advanced Filters
- Export to Excel
- Import
- Column Freeze
- Virtual Scrolling
- Multi-select Bulk Processing
- Personal Dashboards
- User-configurable Landing Pages