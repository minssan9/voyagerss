-- Cleanup duplicates in topics table
-- Keep the most recent entry (largest ID) for each name

DELETE FROM topics 
WHERE id NOT IN (
    SELECT id FROM (
        SELECT MAX(id) AS id 
        FROM topics 
        GROUP BY name
    ) AS keep_rows
);

-- Add unique index to ensure no more duplicates
-- If index already exists, this might fail, but our migration runner handles duplicate index errors.
CREATE UNIQUE INDEX idx_topics_name_unique ON topics(name);
