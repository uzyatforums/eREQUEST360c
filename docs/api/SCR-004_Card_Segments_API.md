# SCR-004 – Card Segments API

**Module:** Configuration  
**Screen Reference:** SCR-004  
**Database Schema:** config  
**Primary Table:** config.card_segments  
**Related Tables:**
- config.card_segment_programmes
- config.card_programmes
- audit.audit_events

---

# 1. Purpose

The Card Segments API manages customer card segments and the assignment of Card Programmes to those segments.

A Card Segment represents a customer classification (for example Retail, Corporate, Commercial, Youth, Elite) that determines which Card Programmes are available during card issuance.

This API exposes two logical capabilities:

1. Card Segment Master maintenance.
2. Card Programme assignment and ordering within a Card Segment.

The API is intentionally independent of the UI and defines the contract consumed by all clients.

---

# 2. General Principles

- All operations are tenant-aware.
- All operations are permission controlled.
- Approval behaviour is determined dynamically by the Approval Policy Framework.
- No Maker/Checker behaviour is hardcoded.
- All successful maintenance operations generate audit events.
- Relationship assignment is binary:
    - Assign = INSERT
    - Unassign = DELETE
- There is no Active flag on the Card Segment Programme relationship.

---

# 3. Authentication

All endpoints require a valid JWT.

The authenticated user is represented by CurrentUserContext.

The API uses:

- client_id
- user_id
- effective_branch_code
- permissions
- roles

from the authenticated session.

---

# 4. Endpoint Summary

| Method | Endpoint | Purpose |
|---------|----------|---------|
| GET | /card-segments | List Card Segments |
| GET | /card-segments/{id} | Retrieve Card Segment |
| POST | /card-segments | Create Card Segment |
| PUT | /card-segments/{id} | Update Card Segment |
| POST | /card-segments/{id}/activate | Activate Card Segment |
| POST | /card-segments/{id}/deactivate | Deactivate Card Segment |
| GET | /card-segments/{id}/programmes | List Assigned Card Programmes |
| POST | /card-segments/{id}/programmes | Assign Card Programme |
| DELETE | /card-segments/{id}/programmes/{programmeId} | Unassign Card Programme |
| POST | /card-segments/{id}/programmes/reorder | Reorder Card Programmes |

---

# 5. Endpoint Specifications

The following sections describe each endpoint in detail.

Each endpoint shall define:

- Purpose
- Required Permission
- Approval Policy Behaviour
- Request
- Response
- Validation Rules
- Business Rules
- Audit Events
- Error Responses

Each endpoint specification will be completed in subsequent revisions of this document.

---

# 6. Common Validation Rules

The following rules apply throughout this API unless stated otherwise.

## Card Segment Code

- Mandatory.
- Unique within tenant.
- Immutable after creation unless business policy permits.

---

## Card Segment Name

- Mandatory.
- Unique within tenant.

---

## Active Status

Card Segments use Active/Inactive status.

Inactive Card Segments:

- cannot be selected for new requests;
- remain visible for enquiry and historical reporting;
- preserve referential integrity.

---

## Card Programme Assignment

A Card Programme may be assigned only once to the same Card Segment.

Duplicate assignments are rejected.

---

## Programme Selection Order

Programme Selection Order determines the preferred Card Programme within a Card Segment and Card Brand.

Rules:

- numbering starts at 1;
- lower number = higher priority;
- uniqueness is enforced within:

    (Card Segment, Card Brand)

Interactive requests display programmes sorted by Programme Selection Order.

Bulk processing automatically selects the first eligible programme.

---

# 7. Approval Policy Integration

Whether an operation requires approval is determined by the Approval Policy Framework.

The Card Segments module does not contain hardcoded Maker/Checker decisions.

Examples:

- Create Segment
- Edit Segment
- Activate Segment
- Deactivate Segment
- Assign Programme
- Remove Programme
- Reorder Programmes

may either:

- execute immediately, or
- create a pending approval request,

depending entirely on Approval Policy configuration.

---

# 8. Audit Requirements

The following actions generate audit events:

- Segment Created
- Segment Updated
- Segment Activated
- Segment Deactivated
- Programme Assigned
- Programme Removed
- Programme Reordered

Audit entries are written through the Audit Framework.

---

# 9. Error Handling

The API returns standard REST responses.

Typical status codes include:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation Error |
| 401 | Authentication Required |
| 403 | Permission Denied |
| 404 | Resource Not Found |
| 409 | Business Rule Conflict |
| 422 | Approval Required / Business Validation Failure |
| 500 | Internal Server Error |

---

# 10. Related Documents

- docs/design/SCR-004_Card_Segments.md
- docs/design/eREQUEST360_Business_Rules_Catalogue_v1.0.md
- docs/ui/screen_registry.md
- docs/architecture/eREQUEST360_Architecture_v1.0.md

---

# Revision History

| Version | Date | Author | Notes |
|----------|------|--------|------|
| 1.0 | TBD | PN SYSTEMS | Initial API Contract |