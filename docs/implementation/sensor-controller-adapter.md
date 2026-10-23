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

## VPD widget (display-only)

Daily Focus and `/sensors` show a **VPD card** that reads the same SmartLife list API. It parses known Tuya status codes (`va_temperature`, `temp_current`, `temperature`, `va_humidity`, `humidity_value`, `humidity`) on the client, computes VPD in `@growlog/domain` (Magnus formula), and never calls ingest or manual reading RPCs.

- **Air vs leaf temperature:** the grower assigns which status point is air and optionally which is leaf (long-press or «Сменить датчик»). Signed-in users persist picks in `grow_cycle_vpd_sources` (per `cycle_id`, zone fallback); guests keep `localStorage` / AsyncStorage. Multiple VPD cards on one page share the same in-memory store and storage key.
- **What-if values:** tapping a reading opens a temporary override; all overrides revert together after 3 seconds. These values are UI-only and must not appear in `sensor_readings` or timeline events.
