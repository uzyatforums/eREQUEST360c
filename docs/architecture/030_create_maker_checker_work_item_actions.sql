USE [erequest360c];
GO

/*==============================================================
Migration : 030_create_maker_checker_work_item_actions.sql
Purpose   : Complete audit trail for Maker/Checker work items
==============================================================*/

IF OBJECT_ID('maker_checker.work_item_actions', 'U') IS NULL
BEGIN

    CREATE TABLE maker_checker.work_item_actions
    (
        id                      BIGINT IDENTITY(1,1) NOT NULL,

        work_item_id            BIGINT NOT NULL,

        action_sequence         INT NOT NULL,

        operation_code          VARCHAR(30) NOT NULL,

        status_code             VARCHAR(20) NOT NULL,

        action_by               VARCHAR(31) NOT NULL,

        remarks                 VARCHAR(1000) NULL,

        action_date             DATETIME NOT NULL
            CONSTRAINT DF_mc_actions_action_date
            DEFAULT(GETDATE()),

        created_by              VARCHAR(31) NOT NULL,

        created_date            DATETIME NOT NULL
            CONSTRAINT DF_mc_actions_created_date
            DEFAULT(GETDATE()),

        CONSTRAINT PK_mc_work_item_actions
            PRIMARY KEY CLUSTERED (id),

        CONSTRAINT UQ_mc_work_item_actions
            UNIQUE
            (
                work_item_id,
                action_sequence
            ),

        CONSTRAINT FK_mc_actions_work_item
            FOREIGN KEY (work_item_id)
            REFERENCES maker_checker.work_items(id)
            ON DELETE CASCADE,

        CONSTRAINT FK_mc_actions_operation
            FOREIGN KEY (operation_code)
            REFERENCES maker_checker.operations(operation_code),

        CONSTRAINT FK_mc_actions_status
            FOREIGN KEY (status_code)
            REFERENCES maker_checker.statuses(status_code),

        CONSTRAINT FK_mc_actions_user
            FOREIGN KEY (action_by)
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
    WHERE object_id = OBJECT_ID('maker_checker.work_item_actions')
      AND name = 'IX_mc_actions_work_item'
)
BEGIN
    CREATE INDEX IX_mc_actions_work_item
        ON maker_checker.work_item_actions(work_item_id);
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('maker_checker.work_item_actions')
      AND name = 'IX_mc_actions_action_by'
)
BEGIN
    CREATE INDEX IX_mc_actions_action_by
        ON maker_checker.work_item_actions(action_by);
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('maker_checker.work_item_actions')
      AND name = 'IX_mc_actions_action_date'
)
BEGIN
    CREATE INDEX IX_mc_actions_action_date
        ON maker_checker.work_item_actions(action_date);
END
GO