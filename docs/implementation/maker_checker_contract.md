# Maker/Checker Implementation Contract

Version: 1.0
Status: Approved for Implementation

---

# 1. Purpose

Implement a generic Maker/Checker engine for eREQUEST360.

The engine must be reusable by any business module and must not contain business-specific logic.

The engine shall:

- receive approval requests
- maintain approval state
- store before/after payloads
- maintain complete action history
- support approval
- support rejection
- support cancellation
- support resubmission

The engine shall NOT update business tables directly.

Business modules remain responsible for committing approved changes.

---

# 2. Scope

Version 1 supports:

✓ Single-level approval

✓ Generic entities

✓ Generic operations

✓ Complete audit history

✓ Automatic change summary

✓ JSON payload storage

Version 1 does NOT support:

- Multi-level approval
- Parallel approvals
- Workflow routing
- Escalation
- Delegation
- SLA monitoring

---

# 3. Guiding Principles

The Maker/Checker module shall not know anything about:

- Branches
- Card Programmes
- Requests
- Customers
- Charges

It only understands:

- Entity Type
- Entity ID
- Operation
- Status
- Payload

---

# 4. Database Objects

Lookup Tables

maker_checker.statuses

maker_checker.operations

maker_checker.entity_types

Operational Tables

maker_checker.work_items

maker_checker.work_item_actions

maker_checker.work_item_payloads

No additional tables are required for Version 1.

---

# 5. Work Item Lifecycle

PENDING

↓

APPROVED

or

REJECTED

or

CANCELLED

Rejected work items may be resubmitted.

Every transition must create an Action record.

---

# 6. Approval Model

Approval requirement is NOT determined by the Maker/Checker engine.

Approval policy belongs to IAM / Permission configuration.

Business flow:

Permission Check

↓

Approval Required?

YES
↓

MakerChecker

NO
↓

Execute Immediately

---

# 7. Business Responsibilities

Business module:

- validates request
- determines approval requirement
- builds before payload
- builds after payload

MakerChecker:

- creates work item
- stores payload
- records history
- manages state

Business module:

- commits approved changes

---

# 8. REST Endpoints

POST

/maker-checker/submit

Returns:

Work Item Number

GET

/maker-checker/pending

Returns:

Pending work items

GET

/maker-checker/{work_item_number}

Returns:

Current work item

GET

/maker-checker/{work_item_number}/payload

Returns:

Before / After payload

GET

/maker-checker/{work_item_number}/history

Returns:

Action history

POST

/maker-checker/{work_item_number}/approve

POST

/maker-checker/{work_item_number}/reject

POST

/maker-checker/{work_item_number}/cancel

POST

/maker-checker/{work_item_number}/resubmit

---

# 9. Payload

Payloads are stored as JSON.

Each work item contains:

Before Payload

After Payload

Entity Name

Payloads are immutable.

Resubmission creates a new Payload version.

---

# 10. Action History

Every action creates one history record.

Examples:

CREATE

SUBMIT

APPROVE

REJECT

CANCEL

RESUBMIT

Each action stores:

User

Date

Remarks

Automatically generated Change Summary

---

# 11. Automatic Change Summary

The application generates a human-readable summary from the payload difference.

Examples:

Branch name changed.

Charge amount changed from 1000 to 1500.

Posting account changed.

The summary is never entered manually.

---

# 12. Security

Authentication:

Existing JWT implementation.

Authorization:

Existing IAM permission model.

The Maker/Checker module performs no permission evaluation.

It assumes authorization has already been completed.

---

# 13. Service Responsibilities

Implement:

MakerCheckerRepository

MakerCheckerService

MakerCheckerRouter

DTOs

SQLAlchemy Models

Swagger Documentation

Unit Tests

Dependency Injection

No UI in Version 1.

---

# 14. Logging

Every state transition shall be logged.

Approval failures shall be logged.

Unexpected exceptions shall be logged.

Business payloads shall never be written to logs.

---

# 15. Definition of Done

Implementation is complete when:

✓ Swagger exposes all endpoints

✓ Submit works

✓ Pending list works

✓ Payload retrieval works

✓ History retrieval works

✓ Approve works

✓ Reject works

✓ Cancel works

✓ Resubmit works

✓ Automatic Change Summary works

✓ Unit tests pass

✓ No business module contains approval logic

The module is then ready for integration with the Branch Configuration module.

# 16. Non-Goals

The implementation SHALL NOT:

- redesign the database
- rename tables or columns
- introduce new database tables
- implement multi-level approval
- implement workflow routing
- implement UI
- modify existing IAM architecture
- modify business modules
- change API naming conventions