USE [erequest360c];
GO

/*==============================================================
Migration : 029_create_maker_checker_work_items.sql
Purpose   : Generic Maker/Checker work queue
==============================================================*/

IF OBJECT_ID('maker_checker.work_items', 'U') IS NULL
BEGIN

    CREATE TABLE maker_checker.work_items
    (
        id                      BIGINT IDENTITY(1,1) NOT NULL,

        work_item_number        VARCHAR(30) NOT NULL,

        client_id               INT NOT NULL,

        entity_type_code        VARCHAR(50) NOT NULL,

        entity_id               BIGINT NOT NULL,

        operation_code          VARCHAR(30) NOT NULL,

        status_code             VARCHAR(20) NOT NULL,

        checker_user_id         VARCHAR(31) NULL,

        approved_date           DATETIME NULL,

        rejected_date           DATETIME NULL,

        cancelled_date          DATETIME NULL,

        active                  BIT NOT NULL
            CONSTRAINT DF_mc_work_items_active
            DEFAULT (1),

        created_by              VARCHAR(31) NOT NULL,

        created_date            DATETIME NOT NULL
            CONSTRAINT DF_mc_work_items_created_date
            DEFAULT(GETDATE()),

        last_modified_by        VARCHAR(31) NULL,

        last_modified_date      DATETIME NULL,

        CONSTRAINT PK_mc_work_items
            PRIMARY KEY CLUSTERED (id),

        CONSTRAINT UQ_mc_work_item_number
            UNIQUE (work_item_number),

        CONSTRAINT FK_mc_work_items_status
            FOREIGN KEY (status_code)
            REFERENCES maker_checker.statuses(status_code),

        CONSTRAINT FK_mc_work_items_operation
            FOREIGN KEY (operation_code)
            REFERENCES maker_checker.operations(operation_code),

        CONSTRAINT FK_mc_work_items_entity_type
            FOREIGN KEY (entity_type_code)
            REFERENCES maker_checker.entity_types(entity_type_code),

        CONSTRAINT FK_mc_work_items_checker
            FOREIGN KEY (checker_user_id)
            REFERENCES iam.users(user_id),

        CONSTRAINT FK_mc_work_items_created_by
            FOREIGN KEY (created_by)
            REFERENCES iam.users(user_id),

        CONSTRAINT FK_mc_work_items_modified_by
            FOREIGN KEY (last_modified_by)
            REFERENCES iam.users(user_id)
    );

END
GO

/*--------------------------------------------------------------
Indexes
--------------------------------------------------------------*/

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('maker_checker.work_items')
      AND name = 'IX_mc_work_items_status'
)
BEGIN
    CREATE INDEX IX_mc_work_items_status
        ON maker_checker.work_items(status_code);
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('maker_checker.work_items')
      AND name = 'IX_mc_work_items_entity'
)
BEGIN
    CREATE INDEX IX_mc_work_items_entity
        ON maker_checker.work_items(entity_type_code, entity_id);
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('maker_checker.work_items')
      AND name = 'IX_mc_work_items_pending'
)
BEGIN
    CREATE INDEX IX_mc_work_items_pending
        ON maker_checker.work_items(status_code, created_date);
END
GO