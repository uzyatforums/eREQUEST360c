# eREQUEST360 Business Rules Catalogue
Version: 1.0
Status: Living Document
Owner: Architecture

---

# Purpose

This document records business rules that govern eREQUEST360.

Its purpose is to provide a single authoritative source for functional behaviour that must remain consistent across:

- Database
- Backend APIs
- Frontend
- Workflow Engine
- Maker/Checker
- Reporting
- Future enhancements

This is **not** a requirements document.

This is **not** a technical design document.

This document captures agreed business behaviour.

---

# Rule Format

Each rule consists of:

- Rule ID
- Title
- Description
- Scope
- Exceptions
- Notes

Rule IDs are permanent.

New rules are appended.
Existing IDs are never reused.

---

# Authentication

## BR-001 — External Authentication

**Description**

The platform supports external enterprise authentication providers (LDAP, Active Directory, SSO, OAuth, OpenID Connect, etc.).

Passwords need not exist inside eREQUEST360.

**Scope**

Authentication.

**Notes**

Development and demonstration environments may use Local Authentication.

---

## BR-002 — Local Authentication

**Description**

When external identity services are unavailable, authentication may be performed locally using credentials stored within eREQUEST360.

This mode is intended for:

- development
- testing
- demonstrations
- standalone deployments

---

# Branch Resolution

## BR-010 — Effective Branch

Each authenticated user has one effective branch for the duration of a session.

The effective branch is determined during authentication.

---

## BR-011 — Branch Scoped Users

Users assigned branch-scoped roles must have one active branch assignment.

Login fails if no active branch assignment exists.

---

## BR-012 — Head Office Users

Head Office users are not constrained by branch simply because they belong to Head Office.

Whether branch filtering applies depends on the operation being performed.

---

# Requests

## BR-020 — Request Branch

Every request records:

- Request Branch
- Account Branch
- Pickup Branch

These serve different business purposes.

---

## BR-021 — One Branch Banking

Customers may initiate requests at any branch.

Request Branch is not required to equal Account Branch.

---

## BR-022 — Approval Restrictions

By default, branch approvers may approve only requests initiated by their own branch.

Exceptions require explicit business policy.

---

# Card Programmes

## BR-030 — Copy Card Programme

Copy duplicates a Card Programme within the same tenant.

The copied programme inherits the source client_id.

Cross-tenant copy is not supported.

---

# Card Segments

## BR-040 — Segment Assignment

Card Segments are managed centrally.

Card Programmes only assign or unassign segments.

Segment creation and maintenance occur in the Card Segments module.

---

## BR-041 — Programme Selection Order

Within a Card Segment, Card Programmes are ordered by:

1. Card Brand
2. Programme Selection Order

Lower numbers have higher priority.

---

## BR-042 — Bulk Processing

During bulk processing:

The requested Card Brand is determined from the import file.

Only programmes belonging to that brand participate in automatic selection.

The programme with the lowest Programme Selection Order is selected.

---

## BR-043 — Branch Processing

During normal branch processing, operators explicitly choose the Card Programme.

Programme Selection Order affects only the ordering of the dropdown list.

---

## BR-044 — Duplicate Programme Selection Order

For the same:

- Tenant
- Card Segment
- Card Brand

Programme Selection Order must be unique.

The application enforces this rule.

---

# Configuration

## BR-050 — Active Configuration Records

Configuration master tables are not physically deleted.

Records are activated or deactivated.

Inactive records remain available for:

- audit
- historical reference
- reporting

---

## BR-051 — Relationship Tables

Relationship tables represent active relationships.

Where business history is unnecessary, relationships are removed rather than deactivated.

Audit history records the change.

---

# Maker / Checker

## BR-060 — Configurable Approval

Maker/Checker is policy-driven.

Whether an operation requires approval is determined by configuration.

No business function is permanently hardcoded to require approval.

---

# Audit

## BR-070 — Audit History

Audit history is the authoritative source for operational history.

Audit records supplement, but do not replace, business data.

---

# Future Considerations

The following are recognised future enhancements:

- Regional scope
- Zonal scope
- Processing centre scope
- Multi-branch user assignments
- External Identity Providers
- Tenant federation

These are not part of Version 1.