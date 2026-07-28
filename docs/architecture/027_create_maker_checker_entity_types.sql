USE [erequest360c];
GO

/*==============================================================
Migration : 027_create_maker_checker_entity_types.sql
Purpose   : Entity types supported by the generic
            Maker/Checker engine
==============================================================*/

IF OBJECT_ID('maker_checker.entity_types', 'U') IS NULL
BEGIN

    CREATE TABLE maker_checker.entity_types
    (
        entity_type_code       VARCHAR(50) NOT NULL,
        entity_type_name       VARCHAR(100) NOT NULL,
        description            VARCHAR(200) NULL,

        active                 BIT NOT NULL
            CONSTRAINT DF_mc_entity_types_active
            DEFAULT (1),

        created_by             VARCHAR(50) NOT NULL,

        created_date           DATETIME NOT NULL
            CONSTRAINT DF_mc_entity_types_created_date
            DEFAULT (GETDATE()),

        last_modified_by       VARCHAR(50) NULL,

        last_modified_date     DATETIME NULL,

        CONSTRAINT PK_mc_entity_types
            PRIMARY KEY (entity_type_code)
    );

END
GO

/*--------------------------------------------------------------
Seed
--------------------------------------------------------------*/

IF NOT EXISTS
(
    SELECT 1
    FROM maker_checker.entity_types
)
BEGIN

INSERT INTO maker_checker.entity_types
(
    entity_type_code,
    entity_type_name,
    description,
    active,
    created_by
)
VALUES

('CLIENT','Client','Client configuration',1,'MIGRATION'),
('BRANCH','Branch','Branch configuration',1,'MIGRATION'),
('CARD_SEGMENT','Card Segment','Card segment configuration',1,'MIGRATION'),
('CARD_PROGRAMME','Card Programme','Card programme configuration',1,'MIGRATION'),
('SEGMENT_PROGRAMME','Segment Programme','Segment/programme mapping',1,'MIGRATION'),
('ELIGIBILITY_RULE','Eligibility Rule','Eligibility configuration',1,'MIGRATION'),
('PROCESSING_MODE','Processing Mode','Processing mode configuration',1,'MIGRATION'),
('CHARGE_HEADER','Charge Header','Charge header configuration',1,'MIGRATION'),
('CHARGE_ENTRY','Charge Entry','Charge posting entry',1,'MIGRATION'),
('SEGMENT_PROGRAMME_CHARGE','Segment Programme Charge','Programme charge mapping',1,'MIGRATION'),
('LOCAL_ACCOUNT','Local Account','Client settlement account',1,'MIGRATION'),
('USER','User','System user',1,'MIGRATION'),
('ROLE','Role','System role',1,'MIGRATION'),
('REQUEST','Request','Card request',1,'MIGRATION');

END
GO