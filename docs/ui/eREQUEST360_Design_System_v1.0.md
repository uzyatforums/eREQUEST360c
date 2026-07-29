# eREQUEST360 UI Design Guide v1.0
**Version:** 1.0
**Status:** Draft
**Author:** PN SYSTEMS LTD
**Project:** eREQUEST360 – Enterprise Card Request & Lifecycle Management System

---

# 1. Vision

eREQUEST360 shall present a modern, enterprise-grade banking application that is:

- Professional
- Clean
- Efficient
- Predictable
- Fast
- Secure
- Easy to learn

The interface is designed primarily for bank operations staff who use the application continuously throughout the workday.

The UI must reduce cognitive load and maximize productivity.

---

# 2. Design Philosophy

The UI should communicate confidence.

Users should never wonder:

- Where am I?
- What should I do next?
- Did the system save my work?
- What happens if I click this?

Every screen should answer those questions naturally.

---

# 3. Design Principles

## 3.1 Consistency

All screens shall follow identical layout principles.

Buttons remain in the same locations.

Tables behave identically.

Forms look identical.

Icons have identical meanings.

---

## 3.2 Simplicity

Every screen should display only information necessary for the current task.

Avoid unnecessary decorations.

Avoid excessive colors.

Avoid visual clutter.

---

## 3.3 Visibility

Important information must stand out.

Examples:

Pending approvals

Charge failures

Rejected requests

Duplicate requests

System alerts

---

## 3.4 Speed

Users should complete common operations with minimal clicks.

Target:

No common operation should require more than 3-4 clicks.

---

## 3.5 Security

Potentially destructive actions must require confirmation.

Examples:

Delete

Deactivate

Reverse

Cancel

Unlock User

---

# 4. Technology Stack

Frontend

- React
- Vite
- TypeScript

UI Framework

- Tailwind CSS

Components

- shadcn/ui

Icons

- Lucide Icons

Tables

- TanStack Table

Charts

- Recharts

State Management

- React Query
- Context API

---

# 5. Application Layout

```
+----------------------------------------------------------------------------------+
| eREQUEST360                                   🔔 Notifications   User ▼          |
+----------------------------------------------------------------------------------+
| Dashboard       |                                                       Search 🔍|
| Requests        |--------------------------------------------------------------- |
| Approvals       |                                                               |
| Eligibility     |                                                               |
| Configuration   |                     Main Workspace                            |
| Charges         |                                                               |
| Reports         |                                                               |
| Audit           |                                                               |
| Administration  |                                                               |
+----------------------------------------------------------------------------------+
| Connected | DEV | Version 1.0.0                                                  |
+----------------------------------------------------------------------------------+
```

---

# 6. Navigation Structure

Dashboard

Requests

- New Request
- My Requests
- Pending Approval
- Processing Queue
- Completed Requests

Card Management

- Card Programmes
- Card Types
- Card Designs
- Segments
- Eligibility

Configuration

- Branches
- Request Types
- Processing Modes
- Delivery Methods
- Charges

Administration

- Users
- Roles
- Permissions

Audit

Reports

---

# 7. Color Palette

Primary

Deep Blue

Purpose

Primary actions

Navigation

Headers

---

Success

Green

Purpose

Completed

Approved

Success notifications

---

Warning

Amber

Purpose

Pending

Awaiting approval

Incomplete actions

---

Danger

Red

Purpose

Rejected

Errors

Failed transactions

---

Information

Blue

Purpose

Information

Read-only notices

---

Neutral

Gray

Purpose

Backgrounds

Borders

Disabled controls

---

# 8. Typography

Page Title

32px

Semibold

Section Heading

22px

Medium

Table Header

14px

Semibold

Body Text

14px

Regular

Small Text

12px

Regular

Monospace

Request IDs

Reference Numbers

Audit IDs

---

# 9. Buttons

Primary

Solid Blue

Examples

Save

Submit

Approve

Create

---

Secondary

Outlined

Examples

Edit

Search

Refresh

---

Danger

Solid Red

Examples

Delete

Deactivate

Cancel Request

---

Ghost

Minimal

Examples

View

Details

Help

---

# 10. Status Badges

Draft

Gray

Submitted

Blue

Pending Approval

Amber

Approved

Green

Rejected

Red

Ready for Issuance

Teal

Issued

Purple

Completed

Dark Green

Charge Failed

Orange

Duplicate

Dark Orange

---

# 11. Tables

Every table shall support

✓ Sorting

✓ Filtering

✓ Search

✓ Pagination

✓ Column resizing

✓ Sticky header

✓ Export to Excel

✓ Export to CSV

✓ Responsive column widths

Default page size

25 rows

---

# 12. Search Standards

Every master screen shall contain

Search box

Status filter

Branch filter (where applicable)

Date range (where applicable)

Reset filters

Refresh

---

# 13. Forms

Preferred Layout

Two-column layout

Desktop

Single-column

Tablet

Single-column

Mobile

Required fields

Red *

Validation

Inline

No modal validation dialogs

---

# 14. Form Actions

Always bottom-right

Cancel

Save

Submit

Approve

Reject

Never place Save at top of page.

---

# 15. Page Template

------------------------------------------------

Page Title

Breadcrumb

Search

Toolbar

--------------------------------------------

Data Grid

--------------------------------------------

Pagination

------------------------------------------------

---

# 16. Configuration Screens

Every configuration page follows exactly the same layout.

Toolbar

Search

Filters

Add

Refresh

Export

Main Grid

Right-side Edit Drawer

Save

Cancel

---

# 17. Request Entry

Tabs

General

Customer

Card

Charges

Documents

Approval History

Audit

Users never scroll through one massive page.

---

# 18. Dashboard

Top KPIs

Today's Requests

Pending Approval

Cards Issued

Charge Failures

Duplicate Requests Prevented

Ready for Dispatch

Second Section

Recent Requests

Recent Activity

System Alerts

Third Section

Request Lifecycle Pipeline

---

# 19. Request Lifecycle Visualization

Submitted

↓

Pending Approval

↓

Approved

↓

Ready for Issuance

↓

Issued

↓

Completed

Each stage displays

Number of requests

Average processing time

Clicking a stage filters requests.

---

# 20. Notifications

Top-right toast notifications

Green

Success

Amber

Warning

Red

Error

Blue

Information

Duration

4 seconds

---

# 21. Confirmation Dialog

Title

Action

Message

Confirmation text

Buttons

Cancel

Confirm

Danger actions use red Confirm button.

---

# 22. Audit Display

Audit history appears chronologically.

Each record displays

Timestamp

User

Action

Old Value

New Value

IP Address

Remarks

---

# 23. Icons

Single icon library

Lucide

No emoji in production.

Icons supplement text.

Icons never replace text.

---

# 24. Accessibility

Keyboard navigation

Visible focus states

High color contrast

Screen reader labels

Minimum touch target

44px

---

# 25. Performance Goals

Dashboard

< 2 seconds

Search

< 1 second

Save

Immediate visual feedback

Large tables

Virtual scrolling

Lazy loading

---

# 26. UI Standards

Every page shall include

✓ Page title

✓ Breadcrumb

✓ Search

✓ Toolbar

✓ Data grid or content

✓ Consistent buttons

✓ Consistent spacing

✓ Success notifications

✓ Error handling

✓ Loading indicator

✓ Empty-state message

---

# 27. Screen Inventory

Phase 1

Login

Dashboard

Card Programmes

Card Types

Branches

Request Types

Processing Modes

Users

Roles

Permissions

Phase 2

New Request

My Requests

Pending Approval

Approval Details

Eligibility

Charges

Customer Search

Card Lifecycle

Phase 3

Audit

Reports

System Monitoring

Notifications

Administration

---

# 28. Design Rule

No new feature shall be considered complete until:

- Backend is functional.
- API is documented.
- UI follows this guide.
- User workflow is validated.
- Audit trail is implemented.
- Responsive behavior is verified.
- Accessibility requirements are met.

---

# 29. Future Enhancements

Dark Mode

User-customizable dashboard

Saved searches

Keyboard shortcuts

Bulk operations

Real-time notifications

Workflow analytics

Custom themes

Multi-language support

---

# 30. Guiding Principle

> **eREQUEST360 is an enterprise banking platform, not a consumer application.**

The interface should communicate professionalism, trust, clarity, and operational efficiency. Every design decision should help bank staff process requests accurately, quickly, and confidently.

---

**End of Document**