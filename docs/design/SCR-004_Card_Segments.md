# SCR-004 – Card Segments

**Version:** 1.0  
**Status:** Draft  
**Module:** Configuration  
**Screen ID:** SCR-004

---

# 1. Purpose

Card Segments define customer classifications that determine which Card Programmes are available to a customer during card issuance.

Examples include:

- Elite
- Personal
- Corporate
- Commercial
- Youth
- Student
- Royalty

A Card Segment does **not** issue cards directly.

Instead, it owns an ordered collection of eligible Card Programmes from which the system or operator selects during card issuance.

---

# 2. Scope

This module enables authorized users to:

- Create Card Segments
- Modify Card Segments
- Activate or Deactivate Card Segments
- Assign Card Programmes to a Segment
- Remove Card Programmes from a Segment
- Maintain Programme Selection Order
- View Segment details
- View Audit History

---

# 3. Out of Scope

This module does not:

- Create Card Programmes
- Configure Charges
- Configure Eligibility Rules
- Issue Cards
- Process Requests

These responsibilities belong to their respective modules.

---

# 4. Business Concepts

## Card Segment

A Card Segment represents a customer classification used by the bank when determining the products available to a customer.

Examples:

- Elite
- Personal
- Corporate
- SME
- Commercial

---

## Card Programme

A Card Programme represents a specific card product.

Examples:

- Verve Gold
- Verve Classic
- Visa Gold
- MasterCard Platinum

Card Programmes are maintained separately under SCR-003.

---

## Programme Selection Order

Programme Selection Order determines the preferred order in which Card Programmes are considered for a Card Segment.

The ordering is maintained independently for each:

- Card Segment
- Card Brand

Lower numbers represent higher priority.

---

# 5. Business Rules

## BR-001

Segment Code shall be unique within a tenant.

---

## BR-002

Segment Name shall be unique within a tenant.

---

## BR-003

Inactive Card Segments cannot receive new Card Programme assignments.

---

## BR-004

Inactive Card Programmes cannot be assigned to a Card Segment.

---

## BR-005

The same Card Programme cannot be assigned twice to the same Card Segment.

---

## BR-006

Programme Selection Order must be unique within:

(Card Segment + Card Brand)

---

## BR-007

Bulk processing shall automatically select the first eligible Card Programme according to Programme Selection Order.

---

## BR-008

Interactive requests shall display Card Programmes sorted by Programme Selection Order.

The operator makes the final selection.

---

## BR-009

Assigning a Card Programme creates a relationship record.

Removing a Card Programme deletes the relationship record.

Relationship existence is binary.

No Active flag exists on the relationship.

---

## BR-010

Every business action performed within this module shall generate an Audit event.

---

## BR-011

Whether Create, Edit, Activate, Deactivate, Assign or Remove operations require Maker/Checker approval shall be determined solely by the Approval Policy Framework.

No Maker/Checker behaviour shall be hardcoded within this module.

---

# 6. Conceptual Data Model

Primary Configuration Table

- config.card_segments

Relationship Table

- config.card_segment_programmes

Charge Relationship

- config.card_segment_programme_charges

Conceptual Relationship

Card Segment

↓

Card Segment Programme

↓

Card Programme

---

# 7. Functional Behaviour

## Creating a Segment

The operator captures:

- Segment Code
- Segment Name
- Description (optional)
- Priority
- Active Status

The Approval Policy Framework determines whether the request is processed immediately or routed through Maker/Checker.

---

## Assigning Card Programmes

Card Programmes are assigned from the list of existing active Card Programmes.

Assignment creates a relationship record.

Duplicate assignments are not permitted.

---

## Removing Card Programmes

Removing a Card Programme deletes the relationship.

Historical tracking is provided by the Audit Framework.

---

## Maintaining Programme Selection Order

Programme Selection Order is maintained separately for each Card Brand.

Operators reorder programmes using:

- Move Up
- Move Down

The application automatically resequences the list.

Operators do not manually enter sequence numbers.

---

# 8. Bulk Processing Behaviour

During Bulk Card Requests:

1. Determine the requested Card Brand.
2. Retrieve programmes assigned to the selected Card Segment.
3. Filter programmes matching the requested Card Brand.
4. Sort by Programme Selection Order.
5. Select the first eligible programme.

---

# 9. Interactive Request Behaviour

During Branch Card Requests:

1. Operator selects Card Segment.
2. System retrieves assigned Card Programmes.
3. Programmes are displayed sorted by Programme Selection Order.
4. Operator selects the desired programme.

Unlike Bulk Processing, the operator makes the final selection.

---

# 10. User Interface

The module consists of:

- Card Segments List
- Create/Edit Drawer
- Programme Assignment
- Audit History

The Programme Assignment screen presents:

- Card Brand
- Card Programme
- Programme Selection Order
- Move Up
- Move Down
- Remove

---

# 11. Security

Typical permissions include:

- CARD_SEGMENT_VIEW
- CARD_SEGMENT_CREATE
- CARD_SEGMENT_EDIT
- CARD_SEGMENT_ACTIVATE
- CARD_SEGMENT_DEACTIVATE
- CARD_SEGMENT_ASSIGN_PROGRAMME
- CARD_SEGMENT_REMOVE_PROGRAMME

Permission alone does not determine whether Maker/Checker is required.

Approval behaviour is governed by the Approval Policy Framework.

---

# 12. Audit Requirements

The following events shall be audited:

- Segment Created
- Segment Modified
- Segment Activated
- Segment Deactivated
- Programme Assigned
- Programme Removed
- Programme Selection Order Changed

---

# 13. Validation Rules

Validation includes:

- Duplicate Segment Code
- Duplicate Segment Name
- Duplicate Programme Assignment
- Duplicate Programme Selection Order
- Assignment of inactive Programmes
- Assignment to inactive Segments

---

# 14. Dependencies

This module depends on:

- SCR-003 Card Programmes
- Approval Policy Framework
- Maker/Checker Framework
- Audit Framework

---

# 15. Future Considerations

Future enhancements may include:

- Effective Dating
- Customer-specific Programme overrides
- Regional Programme Selection policies
- Brand-specific Programme Selection strategies
- Automatic recommendation of Programme Selection Order