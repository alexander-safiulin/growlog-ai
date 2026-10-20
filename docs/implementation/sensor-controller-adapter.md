# Sensor controller adapter (TODO)

Growlog ingests readings via `POST /api/sensors/ingest` with header `x-sensor-token`.

## Device binding (required)

Each row in `sensor_devices` must include in `config`:

```json
{
  "scope_id": "<uuid>",
  "ingest_token": "<secret>"
}
```

Alternatively bind `zone_id` and resolve the active scope for that zone.

Without binding, ingest returns `400 device_scope_unbound`.

## Controller integration (open)

- Document vendor/model: _TBD_
- Export format (MQTT, HTTP webhook, CSV): _TBD_
- Map vendor metric names → `sensor_metrics.metric_code`

Suggested adapter: small sidecar script on the controller network that POSTs normalized payloads to Growlog.
