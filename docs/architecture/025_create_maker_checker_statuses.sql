USE [erequest360c];
GO

/*==============================================================
Migration : 025_create_maker_checker_statuses.sql
Purpose   : Create Maker/Checker workflow statuses
==============================================================*/

IF OBJECT_ID('maker_checker.statuses', 'U') IS NULL
BEGIN

    CREATE TABLE maker_checker.statuses
    (
        status_code            VARCHAR(20) NOT NULL,
        status_name            VARCHAR(50) NOT NULL,
        description            VARCHAR(200) NULL,

        active                 BIT NOT NULL
            CONSTRAINT DF_mc_statuses_active
            DEFAULT (1),

        created_by             VARCHAR(50) NOT NULL,

        created_date           DATETIME NOT NULL
            CONSTRAINT DF_mc_statuses_created_date
            DEFAULT (GETDATE()),

        last_modified_by       VARCHAR(50) NULL,

        last_modified_date     DATETIME NULL,

        CONSTRAINT PK_mc_statuses
            PRIMARY KEY (status_code)
    );

END
GO

/*--------------------------------------------------------------
Seed Data
--------------------------------------------------------------*/

IF NOT EXISTS
(
    SELECT 1
    FROM maker_checker.statuses
)
BEGIN

    INSERT INTO maker_checker.statuses
    (
        status_code,
        status_name,
        description,
        active,
        created_by
    )
    VALUES

    (
        'PENDING',
        'Pending Approval',
        'Awaiting checker approval.',
        1,
        'MIGRATION'
    ),

    (
        'APPROVED',
        'Approved',
        'Approved by checker.',
        1,
        'MIGRATION'
    ),

    (
        'REJECTED',
        'Rejected',
        'Rejected by checker.',
        1,
        'MIGRATION'
    ),

    (
        'CANCELLED',
        'Cancelled',
        'Cancelled before approval.',
        1,
        'MIGRATION'
    );

END
GO