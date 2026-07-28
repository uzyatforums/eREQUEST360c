USE [erequest360c];
GO

/*==============================================================
Migration : 028_create_maker_checker_operations.sql
Purpose   : Supported operations for Maker/Checker
==============================================================*/

IF OBJECT_ID('maker_checker.operations', 'U') IS NULL
BEGIN

    CREATE TABLE maker_checker.operations
    (
        operation_code         VARCHAR(30) NOT NULL,
        operation_name         VARCHAR(100) NOT NULL,
        description            VARCHAR(200) NULL,

        active                 BIT NOT NULL
            CONSTRAINT DF_mc_operations_active
            DEFAULT (1),

        created_by             VARCHAR(50) NOT NULL,

        created_date           DATETIME NOT NULL
            CONSTRAINT DF_mc_operations_created_date
            DEFAULT (GETDATE()),

        last_modified_by       VARCHAR(50) NULL,

        last_modified_date     DATETIME NULL,

        CONSTRAINT PK_mc_operations
            PRIMARY KEY (operation_code)
    );

END
GO

/*--------------------------------------------------------------
Seed
--------------------------------------------------------------*/

IF NOT EXISTS
(
    SELECT 1
    FROM maker_checker.operations
)
BEGIN

INSERT INTO maker_checker.operations
(
    operation_code,
    operation_name,
    description,
    active,
    created_by
)
VALUES

('CREATE',        'Create',        'Create a new record.',                         1, 'MIGRATION'),
('UPDATE',        'Update',        'Modify an existing record.',                   1, 'MIGRATION'),
('DELETE',        'Delete',        'Delete an existing record.',                   1, 'MIGRATION'),
('APPROVE',       'Approve',       'Approve a business transaction.',              1, 'MIGRATION'),
('REJECT',        'Reject',        'Reject a business transaction.',               1, 'MIGRATION'),
('CANCEL',        'Cancel',        'Cancel a pending transaction.',                1, 'MIGRATION'),
('PROCESS',       'Process',       'Process an approved transaction.',             1, 'MIGRATION'),
('DISPATCH',      'Dispatch',      'Dispatch card or package.',                    1, 'MIGRATION'),
('HOTLIST',       'Hotlist',       'Hotlist a card.',                              1, 'MIGRATION'),
('LINK_ACCOUNT',  'Link Account',  'Link an account to a card.',                   1, 'MIGRATION'),
('UNLINK_ACCOUNT','Unlink Account','Remove account linkage from a card.',          1, 'MIGRATION'),
('ACTIVATE',      'Activate',      'Activate a record or card.',                   1, 'MIGRATION'),
('DEACTIVATE',    'Deactivate',    'Deactivate a record or card.',                 1, 'MIGRATION'),
('REISSUE',       'Reissue',       'Reissue a card.',                              1, 'MIGRATION'),
('RENEW',         'Renew',         'Renew a card.',                                1, 'MIGRATION');

END
GO