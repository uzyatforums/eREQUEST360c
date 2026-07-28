# eREQUEST 360 Database Migration Strategy
Version: 1.0

---

# Purpose

This document defines the database migration strategy for the eREQUEST 360 platform.

The objectives are to:

- Standardize database design.
- Ensure all migration scripts are repeatable (idempotent).
- Keep each migration focused on a single responsibility.
- Produce a maintainable migration history.
- Support multi-tenant architecture from day one.

---

# Migration Philosophy

Each migration script should perform one logical unit of work.

Examples:

010_iam_alignment.sql

011_iam_seed_roles.sql

012_iam_seed_permissions.sql

013_iam_seed_role_permissions.sql

020_platform.sql

030_integration.sql

040_config.sql

...

This makes migrations:

- easier to review
- easier to rollback
- easier to test
- source-control friendly

---

# Database Standards

These standards apply to every schema.

---

## 1. Audit Columns (Mandatory)

Every business table shall contain:

```sql
active              bit             NOT NULL DEFAULT(1)

created_by          varchar(30)     NOT NULL

created_date        datetime        NOT NULL DEFAULT(GETDATE())

last_modified_by    varchar(30)     NULL

last_modified_date  datetime        NULL
```

This provides consistent auditing throughout the platform.

---

## 2. Primary Keys

Configuration tables should use surrogate keys.

Example

```sql
tenant_id
role_id
permission_id
channel_id
```

Business tables should also use surrogate keys unless a natural key is clearly superior.

---

## 3. Business Codes

Business logic should reference business codes.

Example

```
permission_code

request.create

request.approve

card.issue
```

The database relationships should reference IDs.

```
permission_id
```

This separates business meaning from database implementation.

---

## 4. Foreign Keys

Foreign keys should reference IDs.

Do not create foreign keys on business codes.

---

## 5. Tenant Ownership

Every tenant-owned table shall include

```sql
tenant_id int NOT NULL
```

Examples

```
iam.users

request.requests

card.cards

charge.transactions

notification.messages
```

Global reference tables such as

```
countries

currencies

languages
```

do not require tenant_id.

---

## 6. Soft Delete

Business data should never be physically deleted.

Instead

```sql
active bit
```

should be used.

---

## 7. Naming Standards

Schemas

```
iam
platform
integration
config
request
charge
approval
card
delivery
notification
audit
reporting
```

Tables

Plural

```
users
roles
permissions
requests
cards
transactions
```

---

# IAM Migration

The first migration will be

```
010_iam_alignment.sql
```

Its responsibilities are:

---

## Alter Existing Tables

### iam.roles

Add

```
role_id

role_type

system_role

display_order
```

---

### iam.users

Add

```
tenant_id

password_changed_date

failed_login_attempts

locked_until

last_login_date
```

---

## Create New Tables

Create

```
iam.permissions
```

Create

```
iam.role_permissions
```

Create

```
iam.user_roles
```

Create

```
iam.user_branches
```

Create

```
iam.service_accounts
```

Service Accounts represent non-human identities such as

- API integrations
- Scheduler
- Notification Engine
- Background Workers
- Internal Services

---

## Create Foreign Keys

Create all required foreign keys.

---

## Create Indexes

Create indexes required for

- authentication
- RBAC
- lookup performance

---

# Seed Scripts

Keep seed data separate.

Examples

```
011_iam_seed_roles.sql

012_iam_seed_permissions.sql

013_iam_seed_role_permissions.sql
```

This keeps schema migrations independent from reference data.

---

# Initial Roles

Examples

```
Super Admin

Admin

Branch Submitter

Branch Checker

Viewer

API Service

Scheduler
```

---

# Initial Permissions

Examples

```
request.create

request.update

request.cancel

request.approve

request.reject

charge.post

charge.reverse

card.issue

card.reissue

delivery.dispatch

notification.send

config.manage

audit.view
```

Permissions should represent business capabilities.

Avoid hard-coded Maker/Checker flags.

RBAC should determine authorization.

---

# Migration Principles

Every migration must be rerunnable.

Before creating objects

- verify table does not already exist
- verify column does not already exist
- verify index does not already exist
- verify foreign key does not already exist

Seed scripts should use

```
MERGE
```

or

```
IF NOT EXISTS
```

Never assume a clean database.

---

# Script Responsibilities

Each script should have one responsibility.

Good

```
010_iam_alignment.sql

011_iam_seed_roles.sql

012_iam_seed_permissions.sql

013_iam_seed_role_permissions.sql
```

Avoid

```
010_everything.sql
```

Large monolithic scripts become difficult to maintain and nearly impossible to review.

---

# Guiding Principle

The database should evolve through small, repeatable, deterministic migrations.

Every migration should be:

- rerunnable
- source-controlled
- independently testable
- independently reviewable
- safe to execute multiple times

This approach provides a robust migration framework suitable for a multi-tenant banking platform and establishes a solid foundation for the continued evolution of eREQUEST 360.