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

- **Air vs leaf temperature:** the grower assigns which status point is air and optionally which is leaf (long-press or «Сменить датчик» / «Use a sensor»). Signed-in users persist picks in `grow_cycle_vpd_sources` (per `cycle_id`, zone fallback); guests keep `localStorage` / AsyncStorage. Multiple VPD cards on one page share the same in-memory store and storage key. Choosing a sensor is explicit: the card does not replace the on-screen climate with an automatic device until the grower picks one. On mobile, a signed-out grower gets the existing sign-in screen (Google); after sign-in the sensor picker opens.
- **No sensor on the card:** mobile shows a stage default (comfortable air temperature, humidity, and in-band VPD, leaf ≈ air − 2 °C). The suggestion itself is not logged. Each later edit stays on the device (AsyncStorage, per cycle) and is appended to the journal as `sensor_snapshot` with `occurred_at` (local journal on device, `create_log_entry` on a signed-in farm). Payload keeps air, humidity, leaf, and VPD. These rows are not `sensor_readings`; the separate manual-reading form still writes those.
- **Sensor on the card:** tapping a reading is a 3 second what-if. Overrides revert together, and the card flashes back to the sensor value. These values are UI-only and must not appear in `sensor_readings` or timeline events. Web still treats every typed value as that 3 second preview.
