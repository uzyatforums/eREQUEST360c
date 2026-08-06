# API Route Naming Convention

## Purpose

This document defines the standard URI structure for all eREQUEST360 REST APIs.

## Principles

- React SPA routes and REST API routes must never share the same URI.
- Configuration modules are exposed under the `/config` namespace.
- Operational modules are exposed under their functional namespace.
- Authentication endpoints are exposed under `/auth`.
- Future API versioning may introduce a common `/api/v1` prefix without changing the logical grouping.

## Current Route Structure

### Authentication

```
/auth/login
/auth/logout
/auth/refresh
```

### Configuration Modules

```
/config/branches
/config/states
/config/card-types
/config/card-programmes
/config/card-segments
/config/card-segment-programmes
/config/card-charges
/config/request-types
/config/request-categories
...
```

### Operational Modules

```
/requests
/cards
/notifications
/reports
```

### Maker / Checker

```
/maker-checker
```

## Future Direction

When external API versioning becomes necessary (for SaaS or public integrations), the current routes may be migrated under:

```
/api/v1/auth
/api/v1/config/...
/api/v1/requests
...
```

### Route Ownership

Each REST resource SHALL have a single owning router.

Duplicate implementations of the same HTTP method and path are prohibited.

Example:

✓ branches.py
    GET    /config/branches
    POST   /config/branches
    PUT    /config/branches/{id}
    ...

✗ config_api.py
    GET /config/branches


### Tenant Isolation

Every configuration endpoint SHALL enforce tenant scoping.

No endpoint may bypass tenant isolation based solely on role
(e.g. super_admin).

Cross-tenant access requires an explicit platform-level role
and an explicit architectural decision.

Until then, the existing namespace structure remains the project standard.