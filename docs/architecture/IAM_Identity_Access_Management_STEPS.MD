IAM (Identity & Access Management)
IAM_Identity_Access_Management.MD
==================================

STEP 1 ✔
--------
Review and execute

010_iam_alignment.sql

Deliverable
-----------
IAM schema aligned.


STEP 2
------
Create

011_iam_seed_roles.sql

Purpose
-------
Insert the system roles.

Examples

SUPER_ADMIN
TENANT_ADMIN
BRANCH_SUBMITTER
BRANCH_CHECKER
OPERATIONS_OFFICER
OPERATIONS_CHECKER
INTERNAL_CONTROL
AUDITOR
API_SERVICE
SCHEDULER


Deliverable
-----------
iam.roles populated.


STEP 3
------
Create

012_iam_seed_permissions.sql

Purpose
-------
Insert every permission supported by eREQUEST360.

Organize by module.

Example

IAM
----
iam.user.view
iam.user.create
iam.user.edit
iam.user.disable

REQUEST
--------
request.create
request.edit
request.cancel
request.view

request.authorize

request.override_duplicate

request.bulk_upload

request.bulk_authorize

CHARGE
-------
charge.calculate
charge.post
charge.reverse

CARD
----
card.issue
card.reissue
card.replace
card.hotlist

DELIVERY
---------
delivery.dispatch
delivery.receive

NOTIFICATION
------------
notification.sms
notification.email

AUDIT
------
audit.view

CONFIG
-------
config.edit

...

Deliverable
-----------
iam.permissions populated.


STEP 4
------
Create

013_iam_seed_role_permissions.sql

Purpose
-------
Assign permissions to roles.

Example

SUPER_ADMIN
    ↓
All permissions

BRANCH_SUBMITTER
    ↓
request.create
request.edit
account.enquiry

BRANCH_CHECKER
    ↓
request.authorize
request.reject

API_SERVICE
    ↓
request.create
account.enquiry

Deliverable
-----------
Role matrix completed.


STEP 5
------
Develop the Authentication Service.

Responsibilities

• Login
• Password verification
• Password hashing
• JWT generation
• JWT refresh
• Password expiry
• Failed login count
• Account locking
• Last login update

Deliverable

/auth/login
/auth/logout
/auth/refresh


STEP 6
------
Develop Authorization Middleware.

Responsibilities

• Read JWT

• Resolve user

• Resolve roles

• Resolve permissions

• Authorize endpoint

Deliverable

Slim Middleware


STEP 7
------
Develop IAM Administration APIs.

Examples

GET /users

POST /users

PUT /users

DELETE /users

GET /roles

GET /permissions

POST /roles/{role}/permissions

GET /service-accounts

POST /service-accounts


STEP 8
------
Develop IAM Administration UI.

Screens

✔ Users

✔ Roles

✔ Permissions

✔ Role Permissions

✔ User Roles

✔ Branch Assignment

✔ Service Accounts

✔ Service Account Roles


STEP 9
------
Testing

Test

✓ Login

✓ JWT

✓ Role lookup

✓ Permission lookup

✓ Multiple roles

✓ Service account login

✓ Authorization middleware

✓ Branch restrictions

✓ Multi-tenant isolation

Deliverable
-----------
IAM Module Complete.