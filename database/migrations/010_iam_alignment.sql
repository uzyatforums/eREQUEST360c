/******************************************************************************
Project : eREQUEST 360
Module  : IAM
Script  : 010_iam_alignment.sql
Purpose : Align IAM schema with eREQUEST 360 architecture.
Author  : Uzy / ChatGPT

Notes
-----
- Non-destructive migration.
- Safe to execute multiple times.
- No seed data.
******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;


BEGIN TRY

BEGIN TRANSACTION;

--------------------------------------------------------------------------------
-- 1. ALTER iam.roles
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.roles') IS NULL
BEGIN
    THROW 50001, 'Table iam.roles does not exist.', 1;
END

--------------------------------------------------------
-- role_type
--------------------------------------------------------

IF COL_LENGTH('iam.roles','role_type') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD role_type varchar(30) NULL;
END

--------------------------------------------------------
-- system_role
--------------------------------------------------------

IF COL_LENGTH('iam.roles','system_role') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD system_role bit
        CONSTRAINT DF_iam_roles_system_role
        DEFAULT(0);
END

--------------------------------------------------------
-- display_order
--------------------------------------------------------

IF COL_LENGTH('iam.roles','display_order') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD display_order int NULL;
END

--------------------------------------------------------
-- created_by
--------------------------------------------------------

IF COL_LENGTH('iam.roles','created_by') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD created_by varchar(30) NULL;
END

--------------------------------------------------------
-- created_date
--------------------------------------------------------

IF COL_LENGTH('iam.roles','created_date') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD created_date datetime
        CONSTRAINT DF_iam_roles_created_date
        DEFAULT(GETDATE());
END

--------------------------------------------------------
-- last_modified_by
--------------------------------------------------------

IF COL_LENGTH('iam.roles','last_modified_by') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD last_modified_by varchar(30) NULL;
END

--------------------------------------------------------
-- last_modified_date
--------------------------------------------------------

IF COL_LENGTH('iam.roles','last_modified_date') IS NULL
BEGIN
    ALTER TABLE iam.roles
    ADD last_modified_date datetime NULL;
END

--------------------------------------------------------------------------------
-- 2. ALTER iam.users
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.users') IS NULL
BEGIN
    THROW 50002, 'Table iam.users does not exist.', 1;
END

--------------------------------------------------------
-- password_changed_date
--------------------------------------------------------

IF COL_LENGTH('iam.users','password_changed_date') IS NULL
BEGIN
    ALTER TABLE iam.users
    ADD password_changed_date datetime NULL;
END

--------------------------------------------------------
-- failed_login_attempts
--------------------------------------------------------

IF COL_LENGTH('iam.users','failed_login_attempts') IS NULL
BEGIN
    ALTER TABLE iam.users
    ADD failed_login_attempts int
        CONSTRAINT DF_iam_users_failed_login_attempts
        DEFAULT(0);
END

--------------------------------------------------------
-- locked_until
--------------------------------------------------------

IF COL_LENGTH('iam.users','locked_until') IS NULL
BEGIN
    ALTER TABLE iam.users
    ADD locked_until datetime NULL;
END

--------------------------------------------------------
-- last_login_date
--------------------------------------------------------

IF COL_LENGTH('iam.users','last_login_date') IS NULL
BEGIN
    ALTER TABLE iam.users
    ADD last_login_date datetime NULL;
END

--------------------------------------------------------
-- Ensure active has default constraint
--------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('iam.users')
      AND c.name = 'active'
)
BEGIN
    ALTER TABLE iam.users
    ADD CONSTRAINT DF_iam_users_active
        DEFAULT(1) FOR active;
END

--------------------------------------------------------
-- Ensure created_date has default
--------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('iam.users')
      AND c.name = 'created_date'
)
BEGIN
    ALTER TABLE iam.users
    ADD CONSTRAINT DF_iam_users_created_date
        DEFAULT(GETDATE()) FOR created_date;
END

/*
-----
*/
--------------------------------------------------------------------------------
-- 3. CREATE iam.permissions
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.permissions') IS NULL
BEGIN

    CREATE TABLE iam.permissions
    (
        permission_code        varchar(100) NOT NULL,

        module_name            varchar(50) NOT NULL,

        permission_name        varchar(100) NOT NULL,

        description            varchar(255) NULL,

        active                 bit NOT NULL
            CONSTRAINT DF_iam_permissions_active DEFAULT(1),

        created_by             varchar(30) NULL,

        created_date           datetime NOT NULL
            CONSTRAINT DF_iam_permissions_created_date DEFAULT(GETDATE()),

        last_modified_by       varchar(30) NULL,

        last_modified_date     datetime NULL,

        CONSTRAINT PK_iam_permissions
            PRIMARY KEY(permission_code)

    );

END;

--------------------------------------------------------------------------------
-- 4. CREATE iam.role_permissions
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.role_permissions') IS NULL
BEGIN

    CREATE TABLE iam.role_permissions
    (
        role_code              varchar(50) NOT NULL,

        permission_code        varchar(100) NOT NULL,

        active                 bit NOT NULL
            CONSTRAINT DF_iam_role_permissions_active DEFAULT(1),

        created_by             varchar(30) NULL,

        created_date           datetime NOT NULL
            CONSTRAINT DF_iam_role_permissions_created_date DEFAULT(GETDATE()),

        last_modified_by       varchar(30) NULL,

        last_modified_date     datetime NULL,

        CONSTRAINT PK_iam_role_permissions
            PRIMARY KEY
            (
                role_code,
                permission_code
            )

    );

END;

--------------------------------------------------------------------------------
-- Foreign Key : role_permissions -> roles
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_iam_role_permissions_roles'
)
BEGIN

    ALTER TABLE iam.role_permissions
    ADD CONSTRAINT FK_iam_role_permissions_roles
        FOREIGN KEY(role_code)
        REFERENCES iam.roles(role_code);

END;

--------------------------------------------------------------------------------
-- Foreign Key : role_permissions -> permissions
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_iam_role_permissions_permissions'
)
BEGIN

    ALTER TABLE iam.role_permissions
    ADD CONSTRAINT FK_iam_role_permissions_permissions
        FOREIGN KEY(permission_code)
        REFERENCES iam.permissions(permission_code);

END;

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_permissions_module'
)
BEGIN

    CREATE INDEX IX_iam_permissions_module
        ON iam.permissions(module_name);

END;

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_role_permissions_permission'
)
BEGIN

    CREATE INDEX IX_iam_role_permissions_permission
        ON iam.role_permissions(permission_code);

END;

/*
-------
*/
--------------------------------------------------------------------------------
-- 5. CREATE iam.user_roles
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.user_roles') IS NULL
BEGIN

    CREATE TABLE iam.user_roles
    (
        user_id                varchar(31) NOT NULL,

        role_code              varchar(50) NOT NULL,

        active                 bit NOT NULL
            CONSTRAINT DF_iam_user_roles_active DEFAULT(1),

        created_by             varchar(30) NULL,

        created_date           datetime NOT NULL
            CONSTRAINT DF_iam_user_roles_created_date DEFAULT(GETDATE()),

        last_modified_by       varchar(30) NULL,

        last_modified_date     datetime NULL,

        CONSTRAINT PK_iam_user_roles
            PRIMARY KEY
            (
                user_id,
                role_code
            )

    );

END;

--------------------------------------------------------------------------------
-- Foreign Key : user_roles -> users
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_iam_user_roles_users'
)
BEGIN

    ALTER TABLE iam.user_roles
    ADD CONSTRAINT FK_iam_user_roles_users
        FOREIGN KEY(user_id)
        REFERENCES iam.users(user_id);

END;

--------------------------------------------------------------------------------
-- Foreign Key : user_roles -> roles
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_iam_user_roles_roles'
)
BEGIN

    ALTER TABLE iam.user_roles
    ADD CONSTRAINT FK_iam_user_roles_roles
        FOREIGN KEY(role_code)
        REFERENCES iam.roles(role_code);

END;

--------------------------------------------------------------------------------
-- 6. CREATE iam.user_branches
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.user_branches') IS NULL
BEGIN

    CREATE TABLE iam.user_branches
    (
        user_id                varchar(31) NOT NULL,

        branch_id              varchar(10) NOT NULL,

        is_primary             bit NOT NULL
            CONSTRAINT DF_iam_user_branches_primary DEFAULT(0),

        active                 bit NOT NULL
            CONSTRAINT DF_iam_user_branches_active DEFAULT(1),

        created_by             varchar(30) NULL,

        created_date           datetime NOT NULL
            CONSTRAINT DF_iam_user_branches_created_date DEFAULT(GETDATE()),

        last_modified_by       varchar(30) NULL,

        last_modified_date     datetime NULL,

        CONSTRAINT PK_iam_user_branches
            PRIMARY KEY
            (
                user_id,
                branch_id
            )

    );

END;

--------------------------------------------------------------------------------
-- Foreign Key : user_branches -> users
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_iam_user_branches_users'
)
BEGIN

    ALTER TABLE iam.user_branches
    ADD CONSTRAINT FK_iam_user_branches_users
        FOREIGN KEY(user_id)
        REFERENCES iam.users(user_id);

END;

--------------------------------------------------------------------------------
-- 7. CREATE iam.service_accounts
--------------------------------------------------------------------------------

IF OBJECT_ID('iam.service_accounts') IS NULL
BEGIN

    CREATE TABLE iam.service_accounts
    (
        service_account_id     int IDENTITY(1,1) NOT NULL,

        client_id              int NOT NULL,

        username               varchar(100) NOT NULL,

        secret_hash            varchar(255) NOT NULL,

        description            varchar(255) NULL,

        active                 bit NOT NULL
            CONSTRAINT DF_iam_service_accounts_active DEFAULT(1),

        created_by             varchar(30) NULL,

        created_date           datetime NOT NULL
            CONSTRAINT DF_iam_service_accounts_created_date DEFAULT(GETDATE()),

        last_modified_by       varchar(30) NULL,

        last_modified_date     datetime NULL,

        CONSTRAINT PK_iam_service_accounts
            PRIMARY KEY(service_account_id)

    );

END;

--------------------------------------------------------------------------------
-- Foreign Key : service_accounts -> config.clients
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_iam_service_accounts_clients'
)
BEGIN

    ALTER TABLE iam.service_accounts
    ADD CONSTRAINT FK_iam_service_accounts_clients
        FOREIGN KEY(client_id)
        REFERENCES config.clients(id);

END;

--------------------------------------------------------------------------------
-- Unique username
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'UX_iam_service_accounts_username'
)
BEGIN

    CREATE UNIQUE INDEX UX_iam_service_accounts_username
        ON iam.service_accounts(username);

END;

--------------------------------------------------------------------------------
-- Additional indexes
--------------------------------------------------------------------------------

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_users_username'
)
BEGIN

    CREATE UNIQUE INDEX IX_iam_users_username
        ON iam.users(username);

END;

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_users_email'
)
BEGIN

    CREATE INDEX IX_iam_users_email
        ON iam.users(email);

END;

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_users_client'
)
BEGIN

    CREATE INDEX IX_iam_users_client
        ON iam.users(client_id);

END;

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_user_roles_role'
)
BEGIN

    CREATE INDEX IX_iam_user_roles_role
        ON iam.user_roles(role_code);

END;

IF NOT EXISTS
(
    SELECT *
    FROM sys.indexes
    WHERE name = 'IX_iam_user_branches_branch'
)
BEGIN

    CREATE INDEX IX_iam_user_branches_branch
        ON iam.user_branches(branch_id);

END;

/*
----
*/
IF OBJECT_ID('iam.service_account_roles') IS NULL
BEGIN

    CREATE TABLE iam.service_account_roles
    (
        service_account_id      int          NOT NULL,

        role_code               varchar(50)  NOT NULL,

        active                  bit          NOT NULL
            CONSTRAINT DF_iam_service_account_roles_active
            DEFAULT(1),

        created_by              varchar(30) NULL,

        created_date            datetime NOT NULL
            CONSTRAINT DF_iam_service_account_roles_created
            DEFAULT(GETDATE()),

        last_modified_by        varchar(30) NULL,

        last_modified_date      datetime NULL,

        CONSTRAINT PK_iam_service_account_roles
            PRIMARY KEY
            (
                service_account_id,
                role_code
            )

    );

END;


IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name='FK_iam_service_account_roles_service_account'
)
BEGIN
    ALTER TABLE iam.service_account_roles
    ADD CONSTRAINT FK_iam_service_account_roles_service_account
    FOREIGN KEY(service_account_id)
    REFERENCES iam.service_accounts(service_account_id);
END;



IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys
    WHERE name='FK_iam_service_account_roles_role'
)
BEGIN
    ALTER TABLE iam.service_account_roles
    ADD CONSTRAINT FK_iam_service_account_roles_role
    FOREIGN KEY(role_code)
    REFERENCES iam.roles(role_code);
END;



/*
----
*/
--------------------------------------------------------------------------------
-- Replace unique username index for users
--------------------------------------------------------------------------------

IF EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_iam_users_username'
      AND object_id = OBJECT_ID('iam.users')
)
BEGIN
    DROP INDEX IX_iam_users_username
    ON iam.users;
END;


IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_iam_users_client_username'
      AND object_id = OBJECT_ID('iam.users')
)
BEGIN
    CREATE UNIQUE INDEX UX_iam_users_client_username
        ON iam.users(client_id, username);
END;


/*
---
*/
--------------------------------------------------------------------------------
-- Replace unique username index for service accounts
--------------------------------------------------------------------------------

IF EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_iam_service_accounts_username'
      AND object_id = OBJECT_ID('iam.service_accounts')
)
BEGIN
    DROP INDEX UX_iam_service_accounts_username
    ON iam.service_accounts;
END;


IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_iam_service_accounts_client_username'
      AND object_id = OBJECT_ID('iam.service_accounts')
)
BEGIN
    CREATE UNIQUE INDEX UX_iam_service_accounts_client_username
        ON iam.service_accounts(client_id, username);
END;


/*
---
*/
--------------------------------------------------------------------------------
-- Commit
--------------------------------------------------------------------------------

COMMIT TRANSACTION;

END TRY

BEGIN CATCH

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;

END CATCH;

