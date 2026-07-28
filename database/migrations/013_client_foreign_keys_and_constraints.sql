ALTER TABLE config.card_types
DROP CONSTRAINT UQ_card_types_client_card_type;
GO


ALTER TABLE config.card_types
ALTER COLUMN client_id INT NOT NULL;
GO

ALTER TABLE config.card_types
ADD CONSTRAINT UQ_card_types_client_card_type
UNIQUE (client_id, card_type);
GO

ALTER TABLE config.card_types
ADD CONSTRAINT FK_card_types_clients
FOREIGN KEY (client_id)
REFERENCES config.clients(id);
GO

