ALTER TABLE invocations ADD COLUMN result_expires_at TEXT;
ALTER TABLE invocations ADD COLUMN purged_at TEXT;

UPDATE invocations
   SET input_json = 'null',
       result_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', datetime(created_at, '+24 hours'))
 WHERE result_expires_at IS NULL;

UPDATE invocations
   SET output_json = 'null',
       purged_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
 WHERE result_expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   AND purged_at IS NULL;

CREATE INDEX IF NOT EXISTS invocations_result_expiry_idx
  ON invocations(result_expires_at)
  WHERE purged_at IS NULL;
