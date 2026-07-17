-- v2 expands these release-level rows into independently valued metrics.
DELETE FROM notification_outbox
WHERE event_id IN (
  SELECT id FROM economic_events
  WHERE provider = 'bls'
    AND (name LIKE 'Employment Cost Index for %' OR name LIKE 'Productivity and Costs %')
);

DELETE FROM notification_deliveries
WHERE event_id IN (
  SELECT id FROM economic_events
  WHERE provider = 'bls'
    AND (name LIKE 'Employment Cost Index for %' OR name LIKE 'Productivity and Costs %')
);

DELETE FROM event_favorites
WHERE event_id IN (
  SELECT id FROM economic_events
  WHERE provider = 'bls'
    AND (name LIKE 'Employment Cost Index for %' OR name LIKE 'Productivity and Costs %')
);

DELETE FROM event_value_history
WHERE event_id IN (
  SELECT id FROM economic_events
  WHERE provider = 'bls'
    AND (name LIKE 'Employment Cost Index for %' OR name LIKE 'Productivity and Costs %')
);

DELETE FROM event_schedule_history
WHERE event_id IN (
  SELECT id FROM economic_events
  WHERE provider = 'bls'
    AND (name LIKE 'Employment Cost Index for %' OR name LIKE 'Productivity and Costs %')
);

DELETE FROM economic_events
WHERE provider = 'bls'
  AND (name LIKE 'Employment Cost Index for %' OR name LIKE 'Productivity and Costs %');
