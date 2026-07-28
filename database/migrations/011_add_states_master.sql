/******************************************************************************
    Migration : 011_add_states_master.sql
    Purpose   : Introduce States master table and link Branches to States.

    Author    : eREQUEST 360
    Date      : 2026-07-21

    Notes
    -----
    - Creates config.states
    - Seeds all Nigerian States + FCT
    - Adds state_code to config.branches
    - Creates FK and index
******************************************************************************/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

BEGIN TRY

    --------------------------------------------------------------------------
    -- Create config.states
    --------------------------------------------------------------------------
    IF OBJECT_ID('config.states', 'U') IS NULL
    BEGIN

        CREATE TABLE config.states
        (
            state_code VARCHAR(10) NOT NULL,
            state_name          VARCHAR(50)  NOT NULL,

            active              BIT NOT NULL
                CONSTRAINT DF_states_active
                DEFAULT (1),

            created_by          VARCHAR(30) NOT NULL,

            created_date        DATETIME NOT NULL
                CONSTRAINT DF_states_created_date
                DEFAULT (GETDATE()),

            last_modified_by    VARCHAR(30) NULL,
            last_modified_date  DATETIME NULL,

            CONSTRAINT PK_states
                PRIMARY KEY CLUSTERED (state_code),

            CONSTRAINT UQ_states_state_name
                UNIQUE (state_name)
        );

    END;

    --------------------------------------------------------------------------
    -- Seed Nigerian States
    --------------------------------------------------------------------------

    IF NOT EXISTS (SELECT 1 FROM config.states)
    BEGIN

        INSERT INTO config.states
        (
            state_code,
            state_name,
            active,
            created_by
        )
        VALUES
        ('AB','Abia',1,'SYSTEM'),
        ('AD','Adamawa',1,'SYSTEM'),
        ('AK','Akwa Ibom',1,'SYSTEM'),
        ('AN','Anambra',1,'SYSTEM'),
        ('BA','Bauchi',1,'SYSTEM'),
        ('BY','Bayelsa',1,'SYSTEM'),
        ('BE','Benue',1,'SYSTEM'),
        ('BO','Borno',1,'SYSTEM'),
        ('CR','Cross River',1,'SYSTEM'),
        ('DE','Delta',1,'SYSTEM'),
        ('EB','Ebonyi',1,'SYSTEM'),
        ('ED','Edo',1,'SYSTEM'),
        ('EK','Ekiti',1,'SYSTEM'),
        ('EN','Enugu',1,'SYSTEM'),
        ('FC','Federal Capital Territory',1,'SYSTEM'),
        ('GO','Gombe',1,'SYSTEM'),
        ('IM','Imo',1,'SYSTEM'),
        ('JI','Jigawa',1,'SYSTEM'),
        ('KD','Kaduna',1,'SYSTEM'),
        ('KN','Kano',1,'SYSTEM'),
        ('KT','Katsina',1,'SYSTEM'),
        ('KE','Kebbi',1,'SYSTEM'),
        ('KO','Kogi',1,'SYSTEM'),
        ('KW','Kwara',1,'SYSTEM'),
        ('LA','Lagos',1,'SYSTEM'),
        ('NA','Nasarawa',1,'SYSTEM'),
        ('NI','Niger',1,'SYSTEM'),
        ('OG','Ogun',1,'SYSTEM'),
        ('ON','Ondo',1,'SYSTEM'),
        ('OS','Osun',1,'SYSTEM'),
        ('OY','Oyo',1,'SYSTEM'),
        ('PL','Plateau',1,'SYSTEM'),
        ('RI','Rivers',1,'SYSTEM'),
        ('SO','Sokoto',1,'SYSTEM'),
        ('TA','Taraba',1,'SYSTEM'),
        ('YO','Yobe',1,'SYSTEM'),
        ('ZA','Zamfara',1,'SYSTEM');

    END;

    --------------------------------------------------------------------------
    -- Add state_code to branches
    --------------------------------------------------------------------------

    IF COL_LENGTH('config.branches', 'state_code') IS NULL
    BEGIN

        ALTER TABLE config.branches
        ADD state_code CHAR(2) NULL;

    END;

    --------------------------------------------------------------------------
    -- Foreign Key
    --------------------------------------------------------------------------

    IF NOT EXISTS
    (
        SELECT *
        FROM sys.foreign_keys
        WHERE name = 'FK_branches_states'
    )
    BEGIN

        ALTER TABLE config.branches
        ADD CONSTRAINT FK_branches_states
            FOREIGN KEY (state_code)
            REFERENCES config.states(state_code);

    END;

    --------------------------------------------------------------------------
    -- Index
    --------------------------------------------------------------------------

    IF NOT EXISTS
    (
        SELECT *
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('config.branches')
          AND name = 'IX_branches_state_code'
    )
    BEGIN

        CREATE NONCLUSTERED INDEX IX_branches_state_code
            ON config.branches(state_code);

    END;

    COMMIT TRANSACTION;

    PRINT 'Migration 011_add_states_master completed successfully.';

END TRY

BEGIN CATCH

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;

END CATCH;
GO