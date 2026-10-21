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

Without binding, ingest returns `400 device_scope_unbound`. A `scopeId` in the JSON body is ignored.

## SmartLife list (read-only)

`GET /api/integrations/tuya/devices?farmId=` returns devices from the Tuya cloud project linked to SmartLife. The caller must be a member of that farm. This is a live view. It does not insert `sensor_devices` or `sensor_readings`.

Server env, Western America for the current SmartLife account:

- `TUYA_ACCESS_ID`
- `TUYA_ACCESS_SECRET`
- `TUYA_API_BASE=https://openapi.tuyaus.com`

`local_key` and device IP are dropped before the response leaves the server.

## Controller integration (open)

- Vendor: Tuya / SmartLife. Data center for the linked account: Western America.
- List format: the read-only route above. History still goes through ingest after a device is bound to a scope.
- Map vendor metric names → `sensor_metrics.metric_code` when readings start to be stored.
