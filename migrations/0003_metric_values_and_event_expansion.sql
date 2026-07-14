ALTER TABLE economic_events ADD COLUMN actual_value TEXT;
ALTER TABLE economic_events ADD COLUMN forecast_value TEXT;
ALTER TABLE economic_events ADD COLUMN previous_value TEXT;
ALTER TABLE economic_events ADD COLUMN value_unit TEXT;
ALTER TABLE economic_events ADD COLUMN value_source_url TEXT;

-- Earlier deployments stored some releases as one coarse event. Remove those
-- legacy rows so the expanded metric rows do not appear twice after sync.
DELETE FROM notification_deliveries
WHERE event_id IN (
  SELECT id FROM economic_events
  WHERE (provider = 'bls' AND normalized_name IN ('consumer price index', 'producer price index', 'employment situation', 'job openings and labor turnover survey'))
     OR (provider = 'bea' AND normalized_name IN ('gross domestic product', 'personal income and outlays'))
);
DELETE FROM economic_events
WHERE (provider = 'bls' AND normalized_name IN ('consumer price index', 'producer price index', 'employment situation', 'job openings and labor turnover survey'))
   OR (provider = 'bea' AND normalized_name IN ('gross domestic product', 'personal income and outlays'));
