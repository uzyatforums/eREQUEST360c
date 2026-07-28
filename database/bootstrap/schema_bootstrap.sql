/*
Clean bootstrap script for a virgin erequest360c database.
This script creates the phase-1 schemas and the initial foundation tables.
It intentionally avoids legacy dbo moves and renames.
*/

SET NOCOUNT ON;
GO

IF DB_ID(N'erequest360c') IS NULL
BEGIN
    CREATE DATABASE [erequest360c];
END
GO

USE [erequest360c];
GO

-- Create schemas if they do not already exist
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'config')
    EXEC('CREATE SCHEMA [config]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'iam')
    EXEC('CREATE SCHEMA [iam]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'request')
    EXEC('CREATE SCHEMA [request]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'eligibility')
    EXEC('CREATE SCHEMA [eligibility]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'audit')
    EXEC('CREATE SCHEMA [audit]');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'switch')
    EXEC('CREATE SCHEMA [switch]');
GO

-- IAM foundation
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'iam' AND t.name = N'users')
BEGIN
    CREATE TABLE [iam].[users] (
        user_id VARCHAR(31) NOT NULL PRIMARY KEY,
        client_id INT NULL,
        branch_id VARCHAR(10) NULL,
        username VARCHAR(100) NULL,
        email VARCHAR(64) NULL,
        password_hash VARCHAR(255) NULL,
        role_code VARCHAR(50) NOT NULL,
        phone_1 VARCHAR(20) NULL,
        active BIT NOT NULL CONSTRAINT DF_iam_users_active DEFAULT (1),
        created_by VARCHAR(30) NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_iam_users_created_date DEFAULT GETDATE(),
        last_modified_by VARCHAR(30) NULL,
        last_modified_date DATETIME NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'iam' AND t.name = N'roles')
BEGIN
    CREATE TABLE [iam].[roles] (
        role_code VARCHAR(50) NOT NULL PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        is_maker BIT NOT NULL CONSTRAINT DF_iam_roles_is_maker DEFAULT (0),
        is_checker BIT NOT NULL CONSTRAINT DF_iam_roles_is_checker DEFAULT (0),
        active BIT NOT NULL CONSTRAINT DF_iam_roles_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'iam' AND t.name = N'role_permissions')
BEGIN
    CREATE TABLE [iam].[role_permissions] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        role_code VARCHAR(50) NOT NULL,
        permission_code VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_iam_role_permissions_active DEFAULT (1)
    );
END
GO

-- Config foundation
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'clients')
BEGIN
    CREATE TABLE [config].[clients] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        tenant_id INT NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_code VARCHAR(50) NOT NULL UNIQUE,
        parent_client_id INT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_clients_active DEFAULT (1),
        contact_email VARCHAR(255) NULL,
        contact_phone VARCHAR(20) NULL,
        address VARCHAR(255) NULL,
        country VARCHAR(50) NULL,
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_clients_created_date DEFAULT GETDATE(),
        last_modified_by VARCHAR(30) NULL,
        last_modified_date DATETIME NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'branches')
BEGIN
    CREATE TABLE [config].[branches] (
        branch_code VARCHAR(10) NOT NULL PRIMARY KEY,
        branch_name VARCHAR(100) NOT NULL,
        client_id INT NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_branches_active DEFAULT (1),
        created_by VARCHAR(30) NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_branches_created_date DEFAULT GETDATE(),
        last_modified_by VARCHAR(30) NULL,
        last_modified_date DATETIME NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_programmes')
BEGIN
    CREATE TABLE [config].[card_programmes] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        card_programme_code VARCHAR(35) NOT NULL,
        card_programme_name VARCHAR(100) NOT NULL,
        card_type VARCHAR(20) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_programmes_active DEFAULT (1),
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_card_programmes_created_date DEFAULT GETDATE(),
        last_modified_by VARCHAR(30) NULL,
        last_modified_date DATETIME NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_segments')
BEGIN
    CREATE TABLE [config].[card_segments] (
        card_seg_grp VARCHAR(5) NOT NULL PRIMARY KEY,
        card_seg_name VARCHAR(50) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_segments_active DEFAULT (1),
        client_id INT NULL,
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_card_segments_created_date DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_segment_programmes')
BEGIN
    CREATE TABLE [config].[card_segment_programmes] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        card_seg_grp VARCHAR(5) NOT NULL,
        card_programme_id INT NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_segment_programmes_active DEFAULT (1),
        client_id INT NOT NULL,
        seq INT NOT NULL CONSTRAINT DF_config_card_segment_programmes_seq DEFAULT (0),
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_card_segment_programmes_created_date DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_segment_members')
BEGIN
    CREATE TABLE [config].[card_segment_members] (
        card_seg_grp VARCHAR(5) NOT NULL,
        acct_seg VARCHAR(10) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_segment_members_active DEFAULT (1),
        client_id INT NULL,
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_card_segment_members_created_date DEFAULT GETDATE(),
        CONSTRAINT PK_config_card_segment_members PRIMARY KEY (card_seg_grp, acct_seg)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_types')
BEGIN
    CREATE TABLE [config].[card_types] (
        card_type VARCHAR(20) NOT NULL PRIMARY KEY,
        description VARCHAR(50) NULL,
        client_id INT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_types_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_charges_headers')
BEGIN
    CREATE TABLE [config].[card_charges_headers] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        charge_name VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_charges_headers_active DEFAULT (1),
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_config_card_charges_headers_created_date DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_charge_entries')
BEGIN
    CREATE TABLE [config].[card_charge_entries] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        header_id INT NOT NULL,
        charge_type VARCHAR(50) NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_charge_entries_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'card_segment_programme_charges')
BEGIN
    CREATE TABLE [config].[card_segment_programme_charges] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        card_seg_grp VARCHAR(5) NOT NULL,
        card_programme_id INT NOT NULL,
        charge_header_id INT NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_card_segment_programme_charges_active DEFAULT (1)
    );
END
GO

-- Request foundation
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'client_card_policies')
BEGIN
    CREATE TABLE [request].[client_card_policies] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL UNIQUE,
        card_policy VARCHAR(50) NOT NULL CONSTRAINT DF_request_client_card_policies_card_policy DEFAULT ('one_card_per_account'),
        requires_approval_for_deviation BIT NOT NULL CONSTRAINT DF_request_client_card_policies_requires_approval_for_deviation DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'requests')
BEGIN
    CREATE TABLE [request].[requests] (
        request_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        account_number VARCHAR(30) NOT NULL,
        programme_id INT NOT NULL,
        request_status VARCHAR(30) NOT NULL,
        request_branch VARCHAR(10) NOT NULL,
        pickup_branch VARCHAR(10) NULL,
        created_by VARCHAR(50) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_request_requests_created_date DEFAULT GETDATE(),
        status_last_updated DATETIME NOT NULL CONSTRAINT DF_request_requests_status_last_updated DEFAULT GETDATE(),
        channel_id INT NULL,
        category_id INT NULL,
        source_type VARCHAR(20) NULL,
        source_reference BIGINT NULL,
        brand VARCHAR(50) NULL,
        active BIT NOT NULL CONSTRAINT DF_request_requests_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'request_status_history')
BEGIN
    CREATE TABLE [request].[request_status_history] (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        request_id BIGINT NOT NULL,
        from_status VARCHAR(30) NULL,
        to_status VARCHAR(30) NOT NULL,
        action VARCHAR(50) NULL,
        performed_by VARCHAR(50) NULL,
        performed_date DATETIME NOT NULL CONSTRAINT DF_request_status_history_performed_date DEFAULT GETDATE(),
        remarks VARCHAR(255) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'request_special_approvals')
BEGIN
    CREATE TABLE [request].[request_special_approvals] (
        approval_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        request_id BIGINT NULL,
        account_number VARCHAR(30) NOT NULL,
        programme_id INT NOT NULL,
        approval_type VARCHAR(20) NOT NULL,
        status VARCHAR(30) NOT NULL CONSTRAINT DF_request_special_approvals_status DEFAULT ('PENDING'),
        requested_by_user VARCHAR(50) NOT NULL,
        approved_by_user VARCHAR(50) NULL,
        requested_date DATETIME NOT NULL CONSTRAINT DF_request_special_approvals_requested_date DEFAULT GETDATE(),
        approved_date DATETIME NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'permissions')
BEGIN
    CREATE TABLE [request].[permissions] (
        permission_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        account_number VARCHAR(30) NOT NULL,
        programme_id INT NOT NULL,
        permission_type VARCHAR(20) NOT NULL,
        status VARCHAR(10) NOT NULL,
        created_by VARCHAR(50) NULL,
        approved_by VARCHAR(50) NULL,
        is_consumed BIT NOT NULL CONSTRAINT DF_request_permissions_is_consumed DEFAULT (0),
        created_date DATETIME NOT NULL CONSTRAINT DF_request_permissions_created_date DEFAULT GETDATE(),
        approved_date DATETIME NULL
    );
END
GO

-- Eligibility foundation
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'tenant_issuance_policies')
BEGIN
    CREATE TABLE [eligibility].[tenant_issuance_policies] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL UNIQUE,
        cardinality_scope VARCHAR(20) NOT NULL,
        approval_required BIT NOT NULL CONSTRAINT DF_eligibility_tenant_issuance_policies_approval_required DEFAULT (1),
        approval_type VARCHAR(20) NULL,
        active BIT NOT NULL CONSTRAINT DF_eligibility_tenant_issuance_policies_active DEFAULT (1),
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_eligibility_tenant_issuance_policies_created_date DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'duplicate_card_policies')
BEGIN
    CREATE TABLE [eligibility].[duplicate_card_policies] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        allow_duplicate_with_approval BIT NOT NULL CONSTRAINT DF_eligibility_duplicate_card_policies_allow_duplicate_with_approval DEFAULT (1),
        active BIT NOT NULL CONSTRAINT DF_eligibility_duplicate_card_policies_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'nocharge_policies')
BEGIN
    CREATE TABLE [eligibility].[nocharge_policies] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        programme_id INT NOT NULL,
        account_product_code VARCHAR(20) NULL,
        is_allowed BIT NOT NULL CONSTRAINT DF_eligibility_nocharge_policies_is_allowed DEFAULT (1),
        active BIT NOT NULL CONSTRAINT DF_eligibility_nocharge_policies_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'programme_eligibility_rules')
BEGIN
    CREATE TABLE [eligibility].[programme_eligibility_rules] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        account_segment VARCHAR(10) NOT NULL,
        programme_id INT NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_eligibility_programme_eligibility_rules_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'charge_posting_attempts')
BEGIN
    CREATE TABLE [eligibility].[charge_posting_attempts] (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        request_id BIGINT NOT NULL,
        payment_ref VARCHAR(50) NULL,
        amount DECIMAL(18,2) NULL,
        status VARCHAR(25) NOT NULL,
        response VARCHAR(1000) NULL,
        created_by VARCHAR(30) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_eligibility_charge_posting_attempts_created_date DEFAULT GETDATE(),
        last_modified_by VARCHAR(30) NULL,
        last_modified_date DATETIME NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'card_accounting_entries')
BEGIN
    CREATE TABLE [eligibility].[card_accounting_entries] (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        request_id BIGINT NOT NULL,
        payment_reference VARCHAR(50) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        narration VARCHAR(255) NOT NULL,
        transaction_currency VARCHAR(3) NOT NULL,
        branch_code VARCHAR(10) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_eligibility_card_accounting_entries_active DEFAULT (1),
        created_by VARCHAR(35) NOT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_eligibility_card_accounting_entries_created_date DEFAULT GETDATE()
    );
END
GO

-- Audit foundation
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'audit' AND t.name = N'audit_event_types')
BEGIN
    CREATE TABLE [audit].[audit_event_types] (
        event_type_id INT NOT NULL PRIMARY KEY,
        event_code VARCHAR(30) NOT NULL UNIQUE,
        description VARCHAR(100) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'audit' AND t.name = N'audit_events')
BEGIN
    CREATE TABLE [audit].[audit_events] (
        event_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id BIGINT NOT NULL,
        event_type_id INT NOT NULL,
        event_source VARCHAR(50) NULL,
        performed_by VARCHAR(100) NULL,
        branch_code VARCHAR(3) NULL,
        event_time DATETIME NOT NULL CONSTRAINT DF_audit_events_event_time DEFAULT GETDATE(),
        correlation_id VARCHAR(100) NULL,
        remarks VARCHAR(255) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'audit' AND t.name = N'audit_event_details')
BEGIN
    CREATE TABLE [audit].[audit_event_details] (
        detail_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        event_id BIGINT NOT NULL,
        column_name VARCHAR(100) NOT NULL,
        old_value VARCHAR(MAX) NULL,
        new_value VARCHAR(MAX) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'audit' AND t.name = N'audit_snapshots')
BEGIN
    CREATE TABLE [audit].[audit_snapshots] (
        snapshot_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id BIGINT NOT NULL,
        snapshot_time DATETIME NOT NULL CONSTRAINT DF_audit_snapshots_snapshot_time DEFAULT GETDATE(),
        snapshot_data NVARCHAR(MAX) NOT NULL,
        event_id BIGINT NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'audit' AND t.name = N'api_log_request_response')
BEGIN
    CREATE TABLE [audit].[api_log_request_response] (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        request_path VARCHAR(255) NOT NULL,
        request_method VARCHAR(10) NOT NULL,
        request_headers VARCHAR(MAX) NULL,
        request_body VARCHAR(MAX) NULL,
        response_status_code INT NOT NULL,
        response_body VARCHAR(MAX) NULL,
        performed_by VARCHAR(100) NULL,
        client_id INT NULL,
        created_date DATETIME NOT NULL CONSTRAINT DF_api_log_request_response_created_date DEFAULT GETDATE()
    );
END
GO

-- Switch mirror foundation
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'switch' AND t.name = N'pc_card_accounts_audits')
BEGIN
    CREATE TABLE [switch].[pc_card_accounts_audits] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        pan VARCHAR(66) NOT NULL,
        seq_nr VARCHAR(3) NOT NULL,
        operation_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        maker_user VARCHAR(30) NOT NULL,
        checker_user VARCHAR(30) NULL,
        maker_date DATETIME NOT NULL CONSTRAINT DF_switch_pc_card_accounts_audits_maker_date DEFAULT GETDATE(),
        checker_date DATETIME NULL,
        remarks VARCHAR(500) NULL
    );
END
GO

-- 15 lookup and mapping tables additions
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'local_accounts')
BEGIN
    CREATE TABLE [config].[local_accounts] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        account_number VARCHAR(10) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        branch_code VARCHAR(20) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_local_accounts_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'request_statuses')
BEGIN
    CREATE TABLE [request].[request_statuses] (
        status_code VARCHAR(30) NOT NULL PRIMARY KEY,
        status_name VARCHAR(50) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_request_request_statuses_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'request_channels')
BEGIN
    CREATE TABLE [request].[request_channels] (
        channel_code VARCHAR(20) NOT NULL PRIMARY KEY,
        channel_name VARCHAR(50) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_request_request_channels_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'request_categories')
BEGIN
    CREATE TABLE [request].[request_categories] (
        category_code VARCHAR(20) NOT NULL PRIMARY KEY,
        category_name VARCHAR(50) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_request_request_categories_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'request' AND t.name = N'request_status_transitions')
BEGIN
    CREATE TABLE [request].[request_status_transitions] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        from_status VARCHAR(30) NOT NULL,
        to_status VARCHAR(30) NOT NULL,
        allowed_role VARCHAR(50) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_request_request_status_transitions_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'dispatch_statuses')
BEGIN
    CREATE TABLE [config].[dispatch_statuses] (
        status_code VARCHAR(30) NOT NULL PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_dispatch_statuses_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'dispatch_types')
BEGIN
    CREATE TABLE [config].[dispatch_types] (
        type_code VARCHAR(30) NOT NULL PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_dispatch_types_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'couriers')
BEGIN
    CREATE TABLE [config].[couriers] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        courier_name VARCHAR(100) NOT NULL,
        contact_email VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_couriers_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'eligible_account_products')
BEGIN
    CREATE TABLE [eligibility].[eligible_account_products] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        product_code VARCHAR(20) NOT NULL,
        card_programme_id INT NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_eligibility_eligible_account_products_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'nocharge_account_products')
BEGIN
    CREATE TABLE [eligibility].[nocharge_account_products] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        product_code VARCHAR(20) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_eligibility_nocharge_account_products_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'eligibility' AND t.name = N'nocharge_programme_ids')
BEGIN
    CREATE TABLE [eligibility].[nocharge_programme_ids] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        card_programme_id INT NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_eligibility_nocharge_programme_ids_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'instant_card_statuses')
BEGIN
    CREATE TABLE [config].[instant_card_statuses] (
        status_code VARCHAR(30) NOT NULL PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_instant_card_statuses_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'instant_card_types')
BEGIN
    CREATE TABLE [config].[instant_card_types] (
        type_code VARCHAR(30) NOT NULL PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_instant_card_types_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'instant_inventory_movement_types')
BEGIN
    CREATE TABLE [config].[instant_inventory_movement_types] (
        movement_code VARCHAR(30) NOT NULL PRIMARY KEY,
        description VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_instant_inventory_movement_types_active DEFAULT (1)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = N'config' AND t.name = N'local_email_recipients')
BEGIN
    CREATE TABLE [config].[local_email_recipients] (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        client_id INT NOT NULL,
        recipient_role VARCHAR(50) NOT NULL,
        email_address VARCHAR(100) NOT NULL,
        active BIT NOT NULL CONSTRAINT DF_config_local_email_recipients_active DEFAULT (1)
    );
END
GO

PRINT 'Bootstrap script completed.';
GO
