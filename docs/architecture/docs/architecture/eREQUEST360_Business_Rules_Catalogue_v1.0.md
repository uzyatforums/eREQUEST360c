# eREQUEST360 Business Rules Catalogue
Version: 1.0
Status: Living Architecture Document
Owner: PN SYSTEMS LTD

---

# 1. Purpose

This document is the authoritative catalogue of approved business rules governing the behaviour of eREQUEST360.

Its objectives are to:

- document approved business rules independently of implementation;
- provide a single reference for developers, testers, business analysts and reviewers;
- ensure consistency between backend, frontend, database and documentation;
- minimise business logic duplication;
- provide traceability between requirements, implementation and testing.

This document intentionally contains business rules only.

Implementation details belong elsewhere.

---

# 2. Rule Format

Each rule has a permanent identifier.

Example:

BR-301

Once allocated, a Business Rule ID should never be reused.

Each rule contains:

- Status
- Description
- Business Rule
- Rationale
- Impacted Modules
- Related Database Objects

---

# 3. Identity & Authentication

## BR-100 — Authentication Provider

Status
Approved

Rule

Authentication shall be provider-independent.

The authentication mechanism may be:

- local database
- Active Directory
- LDAP
- OAuth
- SAML
- Azure AD
- future SaaS Identity Provider

The application must not assume any specific authentication provider.

Rationale

Allows offline development while supporting enterprise deployment.

---

## BR-101 — User Identity

Status
Approved

Rule

The application's canonical user identifier is username.

Email addresses are optional attributes.

The username presented at login depends on the configured authentication provider.

Examples

Development

victor

Enterprise

victor

(where Active Directory authenticates the username)

SaaS

victor@customerA

or

victor@pnsystems.com

depending on tenant configuration.

---

## BR-102 — Password Storage

Status
Approved

Rule

Passwords shall only exist where the configured authentication provider requires them.

When external authentication is enabled, the application must not maintain duplicate passwords.

---

# 4. Tenancy

## BR-200 — Tenant Isolation

Status
Approved

Rule

Every business object belongs to exactly one tenant.

Cross-tenant data access is prohibited unless explicitly implemented as a future feature.

---

## BR-201 — Copy Operations

Status
Approved

Rule

Copy operations are intra-tenant only.

Copied records inherit the source client_id.

Cross-tenant cloning is not supported.

---

# 5. Branch Operations

## BR-300 — Effective Branch Resolution

Status
Approved

Rule

Every authenticated session resolves one Effective Branch.

Head Office users may have no Effective Branch.

Branch-scoped users must have exactly one active branch assignment.

Failure to resolve an effective branch prevents login.

---

## BR-301 — Branch Assignment

Status
Approved

Rule

A branch-scoped user belongs to one primary branch.

Future releases may support multiple branches.

---

## BR-302 — Branch Scoping

Status
Approved

Rule

Branch filtering is determined by the operation being performed rather than the user's role alone.

Some operations require branch scoping.

Others intentionally operate across branches.

Rationale

One-Branch Banking allows customers to transact at any branch.

Operational restrictions depend on the activity.

---

## BR-303 — Request Ownership

Status
Approved

Rule

Requests record:

- Request Branch
- Account Branch
- Pickup Branch

These values represent different business concepts and shall never be treated as interchangeable.

---

# 6. Maker / Checker

## BR-400 — Configurable Approval

Status
Approved

Rule

Maker/Checker shall be configurable.

Configuration determines whether an operation requires approval.

Business modules shall not hardcode Maker/Checker behaviour.

---

## BR-401 — Configuration Modules

Status
Approved

Rule

Configuration maintenance may or may not require approval depending on Approval Policy configuration.

---

# 7. Card Programmes

## BR-500 — Programme Copy

Status
Approved

Rule

Programme Copy duplicates configuration only.

Copied programmes inherit the tenant.

Cross-tenant copy is prohibited.

---

# 8. Card Segments

## BR-600 — Card Segment Master

Status
Approved

Rule

Card Segments are maintained as a standalone configuration module.

Assignment of segments to programmes is performed from the Card Programme screen.

---

## BR-601 — Segment Assignment

Status
Approved

Rule

Assigning a segment creates a relationship record.

Unassigning removes the relationship record.

Relationship history is maintained through Audit Events.

No Active flag exists on the relationship.

---

## BR-602 — Segment Status

Status
Approved

Rule

Only the Card Segment master owns Active/Inactive state.

Assignments inherit the status of the underlying segment.

---

## BR-603 — Programme Selection Order

Status
Approved

Rule

Within a Card Segment, Card Programmes are ordered by:

1. Card Brand
2. Programme Selection Order

Programme Selection Order starts at 1.

Lower numbers have higher priority.

Selection Order must be unique within:

(Card Segment, Card Brand)

Rationale

Bulk requests specify Card Brand.

When multiple programme variants exist within the same brand, the system automatically selects the programme with the lowest Selection Order.

Branch requests display available programmes sorted by Selection Order.

---

# 9. Requests

## BR-700 — Branch Requests

Status
Approved

Rule

Branch users manually choose the required Card Programme.

Automatic programme selection does not occur.

---

## BR-701 — Bulk Requests

Status
Approved

Rule

Bulk processing automatically determines the Card Programme.

Selection uses:

- Customer Segment
- Requested Card Brand
- Programme Selection Order

---

# 10. Audit

## BR-800 — Audit Trail

Status
Approved

Rule

All configuration changes shall generate Audit Events.

Audit history replaces the need for historical inactive relationship records.

---

# 11. Design Principles

The following principles govern all future business rules.

1. Configuration over hardcoding.

2. Business rules belong in one place.

3. Authentication must be provider-independent.

4. Business operations determine branch scope.

5. Relationship tables model existence, not state.

6. Audit captures history.

7. All rules should be deterministic.

8. Business logic belongs in services, not UI.

9. Business logic should not be duplicated.

10. Every new feature should reference one or more Business Rule IDs.

---

# 12. Future Rules

Reserved for future modules including:

- Eligibility
- Charges
- Card Lifecycle
- Notifications
- Dispatch
- Inventory
- Reporting
- Dashboards
- Instant Cards
- Fraud
- Settlement