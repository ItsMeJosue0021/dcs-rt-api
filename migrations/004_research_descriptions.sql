ALTER TABLE research
  ADD COLUMN description TEXT NULL AFTER abstract;

UPDATE research
SET description = abstract,
    abstract = ''
WHERE status <> 'Finished'
  AND abstract IS NOT NULL
  AND TRIM(abstract) <> '';
