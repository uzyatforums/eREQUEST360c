USE [erequest360c];
GO

/*==============================================================
Migration : 032_create_maker_checker_work_item_payloads.sql
Purpose   : Store before/after payloads for generic
            Maker/Checker work items
==============================================================*/

IF OBJECT_ID('maker_checker.work_item_payloads', 'U') IS NULL
BEGIN

    CREATE TABLE maker_checker.work_item_payloads
    (
        work_item_id        BIGINT NOT NULL,

        /* Friendly display name shown to checker */
        entity_name         VARCHAR(200) NULL,

        /* JSON before proposed change */
        before_payload      NVARCHAR(MAX) NULL,

        /* JSON after proposed change */
        after_payload       NVARCHAR(MAX) NOT NULL,

        created_by          VARCHAR(31) NOT NULL,

        created_date        DATETIME NOT NULL
            CONSTRAINT DF_mc_payload_created_date
            DEFAULT (GETDATE()),

        CONSTRAINT PK_mc_work_item_payloads
            PRIMARY KEY CLUSTERED (work_item_id),

        CONSTRAINT FK_mc_payload_work_item
            FOREIGN KEY (work_item_id)
            REFERENCES maker_checker.work_items(id)
            ON DELETE CASCADE
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
    WHERE object_id = OBJECT_ID('maker_checker.work_item_payloads')
      AND name = 'IX_mc_payload_entity_name'
)
BEGIN
    CREATE INDEX IX_mc_payload_entity_name
        ON maker_checker.work_item_payloads(entity_name);
END
GO