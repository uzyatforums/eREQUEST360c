================================================================================
1. VISION
================================================================================

eREQUEST 360 is a multi-tenant, API-first card lifecycle management platform
designed to support the complete lifecycle of debit, prepaid and credit cards,
from request through production, issuance, delivery and post-issuance services.

The platform is designed to:

• Serve multiple banks from a single deployment.
• Operate online or standalone using local integration replicas.
• Support Branch, API, Mobile, Internet Banking, USSD, Agency Banking, Bulk and Instant channels.
• Be highly configurable with minimal hardcoding.
• Be modular and independently extensible.
================================================================================
2. ARCHITECTURAL PRINCIPLES
================================================================================

The architecture of eREQUEST 360 is governed by the following principles.

• Request is the business orchestrator.

• Eligibility performs all business validation.

• Request owns the request lifecycle and state machine.

• Charges occur after a request is accepted but before authorization.

• Authorization (Maker / Checker) is generic.

• RBAC controls access to every business function.

• Configuration replaces hardcoding.

• Every business event is auditable.

• Every external dependency has a local implementation.

• Business modules communicate through interfaces rather than directly.
================================================================================
eREQUEST 360 IMPLEMENTATION ROADMAP
================================================================================

ARCHITECTURAL PRINCIPLES
------------------------
• One database serves multiple tenants (banks).
• Every business record belongs to one tenant.
• Request is the business orchestrator.
• Request owns the workflow/state machine.
• RBAC controls authorization.
• Configuration drives behaviour.
• Platform must be able to run standalone using local integration replicas.

================================================================================
1. IAM (Identity & Access Management)
================================================================================

Purpose
-------
Authentication and authorization.

Responsibilities
----------------
• Human users
• Service Accounts (API / Scheduler / Internal Services)
• Roles
• Permissions
• Role-Permission mapping
• User-Role mapping
• User-Branch mapping
• Login
• Password policies
• Account locking
• Session/JWT support

Main tables
-----------
iam.users
iam.service_accounts
iam.roles
iam.permissions
iam.role_permissions
iam.user_roles
iam.user_branches

Notes
-----
• Tenant-aware
• Branch-aware
• RBAC only
• No business rules

================================================================================
2. PLATFORM
================================================================================

Purpose
-------
Infrastructure used by every module.

Responsibilities
----------------
• Scheduler
• Background Jobs
• Event Log
• File Repository
• Feature Flags
• Health Checks
• Job History

Main tables
-----------
platform.jobs
platform.job_history
platform.event_log
platform.feature_flags
platform.file_repository

================================================================================
3. INTEGRATION
================================================================================

Purpose
-------
Communication with external systems and standalone simulation.

Responsibilities
----------------
Core Banking Gateway
Switch Gateway
SMS Gateway
Email Gateway
Courier Gateway

Standalone replicas

• Local Accounts
• Local Customers
• Local Branches
• Local Transactions
• Local Card Accounts

Simulators

• SMS
• Email
• Switch
• Courier

Message queues

• Outbound Queue
• Inbound Queue

Logging

• Request
• Response
• Retry
• Errors

Integration Principles
----------------------

• Business modules never communicate directly with external systems.

• All external communication passes through Integration Gateways.

• Every external gateway has a local implementation for standalone operation.

• Gateway failures must never corrupt business state.

• Every request and response is logged for auditing and troubleshooting.

Main tables
-----------
integration.gateway_logs
integration.outbound_queue
integration.inbound_queue

integration.local_accounts
integration.local_customers
integration.local_transactions
integration.local_cards

integration.sms_outbox
integration.email_outbox

================================================================================
4. CONFIGURATION
================================================================================

Purpose
-------
Business configuration.

Responsibilities
----------------

Tenant Management

Supported Request Channels
• BRANCH
• API
• MOBILE
• INTERNET
• USSD
• AGENCY
• BULK
• INSTANT

Request Channels

Branches

Card Programmes

Card Types

Card Designs

Card Segments

Request Categories

Charge Rules

Business Rules

Delivery Methods

Courier Configuration

Notification Templates

Feature Configuration

Main tables
-----------
config.tenants
config.request_channels
config.branches
config.card_programmes
config.card_types
config.card_designs
config.card_segments
config.request_categories
config.delivery_methods
config.couriers

================================================================================
5. BUSINESS RULES
================================================================================

Purpose
-------

Centralize configurable business policies.

Responsibilities
----------------

Programme eligibility

Segment rules

Product restrictions

Duplicate rules

Charge rules

Minimum balance rules

Exception rules

Authorization rules

The Eligibility, Charge and Request modules evaluate these rules but do not own
their configuration.

================================================================================
6. ELIGIBILITY
================================================================================

Purpose
-------
Determine whether a request is acceptable.

Receives
--------
Tenant
Channel
Account Number
Selected Card Programme

Checks
------
Retrieve account

Retrieve customer

Retrieve balances

Retrieve account status

Retrieve segment

Determine eligible programmes

Verify selected programme

Duplicate Rules

Product Rules

Disallowed Products

Minimum Balance

Account Status (PND, Dormant, etc.)

Charge Rules

Business Rules

Returns
-------
PASS

or

Detailed rejection reason(s)

No database updates.

Eligibility is a pure business validation engine. It performs no state transitions
and persists no business data.

================================================================================
7. REQUEST
================================================================================

*** BUSINESS ORCHESTRATOR ***

The Request module coordinates the end-to-end lifecycle of every card request by
orchestrating all other business modules.

Responsibilities
----------------

Receive request

Call Eligibility

Persist request

Create history

Maintain state machine

Initiate charge posting

Queue notifications

Queue production

Everything begins here.

Request Processing Flow
-----------------------

Channel
    │
    ▼
Request
    │
    ▼
Eligibility
    │
    ▼
PASS
    │
    ▼
Persist Request
    │
    ▼
Charge
    │
    ├── Failed
    │
    ├── Unknown
    │
    └── Success
           │
           ▼
Authorization
           │
           ▼
Card Production
           │
           ▼
Delivery
           │
           ▼
Completed

Main tables
-----------
request.requests
request.history
request.statuses
request.status_transitions
request.special_approvals

State Machine
-------------
RECEIVED

↓

ELIGIBILITY_FAILED

or

PENDING_CHARGE

↓

CHARGE_FAILED

CHARGE_UNKNOWN

or

PENDING_APPROVAL

↓

APPROVED

↓

READY_FOR_PRODUCTION

↓

IN_PRODUCTION

↓

READY_FOR_DISPATCH

↓

DISPATCHED

↓

RECEIVED

↓

COMPLETED

================================================================================
8. CHARGE
================================================================================

Purpose
-------
Financial processing.

Responsibilities
----------------

Determine pricing

Determine accounting entries

Call Core Banking

Handle retries

Handle reconciliation

Handle reversals

Return status to Request

Tables
------
charge.transactions
charge.accounting_entries
charge.reconciliation
charge.reversals

================================================================================
9. AUTHORIZATION (Maker / Checker)
================================================================================

Purpose
-------
Authorization.

Responsibilities
----------------

Approve

Reject

Escalate

Special Approval

Duplicate Approval

No Charge Approval

Uses RBAC permissions.

================================================================================
9. CARD
================================================================================

Purpose
-------
Card lifecycle.

Responsibilities
----------------

Production

Personalization

Card Account Creation

Inventory

Instant Issuance

Issued Cards

Lifecycle

Replacement

Renewal

Hotlisting

PIN

Tables
------
card.cards
card.production_batches
card.production_items
card.lifecycle
card.inventory

================================================================================
10. DELIVERY
================================================================================

Purpose
-------
Move card to customer.

Supports

Branch Collection

Home Delivery

Courier Delivery

Responsibilities
----------------

Dispatch

Tracking

Proof of Delivery

Branch Receipt

Customer Receipt

Tables
------
delivery.requests
delivery.tracking
delivery.proof_of_delivery

================================================================================
11. NOTIFICATION
================================================================================

Purpose
-------
Notify users and customers.

Channels
--------

SMS

Email

Push

Webhook

Templates

Retries

Audit

Standalone simulation

================================================================================
12. AUDIT
================================================================================

Purpose
-------
Enterprise audit.

Responsibilities
----------------

Who

What

When

Where

Before

After

API logs

Business logs

Security logs

Immutable history

================================================================================
13. REPORTING
================================================================================

Operational Reports

Exception Reports

Audit Reports

Production Reports

Charge Reports

SLA Reports

================================================================================
14. BULK
================================================================================

Bulk Upload

Bulk Validation

Bulk Charges

Bulk Approval

Bulk Production

Bulk Notifications

================================================================================
15. INSTANT ISSUANCE
================================================================================

Branch instant issuance

Instant personalization

Instant printing

Instant PIN

Instant activation

================================================================================

REQUEST TRACEABILITY

Every request is traceable to:

Tenant
    ↓
Channel
    ↓
User / Service Account
    ↓
Branch
    ↓
Account
    ↓
Card Programme
    ↓
Request Lifecycle

================================================================================
================================================================================
GUIDING PRINCIPLES
================================================================================

• Request is the business orchestrator.

• Eligibility performs business validation only.

• Charges occur only after a request has been accepted.

• Authorization is generic and permission-driven.

• RBAC controls access to every business function.

• Configuration replaces hardcoded business rules.

• Every business operation is auditable.

• Every request is fully traceable.

• Business modules communicate through interfaces.

• Every external integration has a standalone implementation.


## 5. Database Design Principles

### 5.1 Multi-Tenant Data Isolation

eREQUEST360 is designed as a **multi-tenant SaaS platform**. Although future deployments may use one database per tenant, the platform must also support multiple tenants sharing a single database.

To ensure consistent tenant isolation, the following rules apply:

1. **Every tenant-owned table MUST contain a `client_id` column.**
2. **Every relationship between tenant-owned tables SHOULD include `client_id` as part of the foreign key wherever both parent and child are tenant-owned.**
3. **`client_id` is considered part of the logical business key for all tenant-owned data.**
4. All queries against tenant-owned tables **must filter by `client_id`** unless the operation is explicitly system-wide.
5. Tenant isolation should be enforced at both the application and database levels wherever practical.
6. Every unique business key should be unique **within a client**, not globally, unless explicitly intended to be global.

Example:

Parent table:

config.card_charges_headers

| client_id | id | charge_name |
|-----------|----|-------------|
| 1 | 15 | CHG-MC-NGN |
| 2 | 15 | CHG-MC-NGN |

Child table:

config.card_charge_entries

| client_id | charge_header_id | charge_type | amount |
|-----------|------------------|-------------|--------|
| 1 | 15 | CARD_FEE | 1000.00 |

Recommended foreign key:

(client_id, charge_header_id)
    →
(client_id, id)

This guarantees that a child record cannot reference a parent belonging to another tenant.

---

### 5.2 Surrogate Keys

The platform adopts surrogate keys for internal database relationships.

The following principles apply:

- Every table shall have an `id` column as its surrogate primary key.
- Surrogate keys exist solely to simplify joins and improve performance.
- Business logic must rely on business codes (for example, `card_programme_code`, `segment_code`, `issuance_mode_code`, `charge_name`) rather than numeric IDs.
- Numeric IDs are implementation details and should never appear in API contracts, request payloads, URLs, reports, configuration files, or business documentation unless there is a specific technical requirement.
- Every business entity should expose a meaningful code that remains stable over time.
- Foreign keys inside the database should reference surrogate keys (`id`), while user interfaces, support tools, and reports should display the corresponding business codes.


Architecture Note

I recommend adding this to your architecture document.

core Schema

Purpose

The core schema contains business entities that normally originate from the Core Banking System (e.g., Oracle Flexcube/FCUBS), but which may also be locally maintained when eREQUEST360 operates in Standalone mode.

These tables are not configuration tables. They represent the bank's operational master data used by the application.

Examples include:

core.customers
core.accounts
core.account_balances (future)
core.customer_contacts (future)

In Integrated mode, eREQUEST360 accesses the Core Banking System through the configured provider implementation and may not use these tables.

In Standalone mode, these tables become the application's source of business data.