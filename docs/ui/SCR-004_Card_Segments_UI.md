# SCR-004 – Card Segments UI Specification

**Version:** 1.0  
**Status:** Draft  
**Module:** Configuration  
**Screen ID:** SCR-004

---

# 1. Purpose

The Card Segments screen allows authorized users to manage Card Segments and the Card Programmes assigned to them.

The screen provides a single location for:

- Viewing Card Segments
- Creating Card Segments
- Editing Card Segments
- Activating and Deactivating Card Segments
- Managing Card Programme assignments
- Maintaining Programme Selection Order
- Viewing Audit History

---

# 2. Navigation

Menu Path:

Configuration

→ Card Segments

Route:

/card-segments

---

# 3. Screen Layout

The screen consists of:

- Page Header
- Toolbar
- Search Area
- Card Segments Grid
- Right-side Drawer (Create/Edit)
- Assignment Drawer
- Audit History Drawer

---

# 4. Page Header

Title

Card Segments

Description

Manage customer segments and their assigned Card Programmes.

---

# 5. Toolbar

Buttons may include:

- New
- Refresh
- Export
- Audit History

Button visibility depends on user permissions.

---

# 6. Search Area

The following filters are available:

- Segment Code
- Segment Name
- Active Status

Search executes without reloading the page.

---

# 7. Card Segments Grid

Columns

- Segment Code
- Segment Name
- Description
- Active
- Created By
- Created Date
- Last Modified By
- Last Modified Date

Actions

- View
- Edit
- Activate
- Deactivate
- Assign Programmes
- Audit History

---

# 8. Create / Edit Drawer

The right-side drawer contains:

General Information

- Segment Code
- Segment Name
- Description
- Active

Buttons

- Save
- Cancel

The drawer width follows the eREQUEST360 Design System.

---

# 9. Programme Assignment

Selecting "Assign Programmes" opens a dedicated drawer.

The drawer contains:

Assigned Card Programmes

Columns

- Card Brand
- Card Programme
- Programme Selection Order
- Remove

Toolbar

- Add Programme

---

# 10. Programme Selection Order

Programme Selection Order is maintained separately for each Card Brand.

Operators reorder programmes using:

- Move Up
- Move Down

The application automatically resequences the list.

Operators never edit sequence numbers directly.

---

# 11. Add Programme

The Add Programme dialog displays only:

- Active Card Programmes
- Card Programmes not already assigned

The operator selects:

- Card Programme

The system automatically places the programme at the bottom of the ordering for its Card Brand.

---

# 12. Remove Programme

Removing a programme:

- requests confirmation;
- deletes the relationship;
- automatically resequences remaining programmes;
- records an audit event.

---

# 13. Validation Messages

Examples

Duplicate Segment Code

"Segment Code already exists."

Duplicate Segment Name

"Segment Name already exists."

Duplicate Programme

"This Card Programme has already been assigned."

Programme Selection Order Conflict

"Programme Selection Order conflict detected."

Inactive Programme

"Inactive Card Programmes cannot be assigned."

---

# 14. Approval Policy Behaviour

The UI does not determine whether Maker/Checker is required.

When Save is clicked, the backend returns either:

Immediate Processing

or

Pending Approval

The UI displays the appropriate confirmation message.

---

# 15. Audit History

Selecting Audit History displays:

- Action
- User
- Date
- Old Value
- New Value

Audit information is read-only.

---

# 16. Permissions

Typical permissions include:

- CARD_SEGMENT_VIEW
- CARD_SEGMENT_CREATE
- CARD_SEGMENT_EDIT
- CARD_SEGMENT_ACTIVATE
- CARD_SEGMENT_DEACTIVATE
- CARD_SEGMENT_ASSIGN_PROGRAMME
- CARD_SEGMENT_REMOVE_PROGRAMME

Permissions determine which actions are visible.

---

# 17. Empty State

When no Card Segments exist:

Display:

"No Card Segments have been configured."

Provide a prominent:

New Card Segment

button.

---

# 18. Loading State

Display skeleton loaders while data is loading.

Buttons remain disabled until loading completes.

---

# 19. Error State

Errors returned by the backend are displayed inline where appropriate.

Unexpected errors are displayed using the standard eREQUEST360 error dialog.

---

# 20. Responsive Behaviour

The screen supports desktop and tablet layouts.

On smaller screens:

- filters collapse;
- drawers remain right-aligned;
- grids support horizontal scrolling.

---

# 21. Related Documents

- docs/design/SCR-004_Card_Segments.md
- docs/api/SCR-004_Card_Segments_API.md
- docs/design/eREQUEST360_Business_Rules_Catalogue_v1.0.md
- docs/ui/eREQUEST360_Design_System_v1.1.md

---

# Revision History

| Version | Date | Author | Notes |
|----------|------|--------|------|
| 1.0 | TBD | PN SYSTEMS | Initial UI Specification |