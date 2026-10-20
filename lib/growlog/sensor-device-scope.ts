type DeviceConfig = Record<string, unknown> | null;

/** Resolve canonical scope_id from sensor_devices.config (ADR-013). */
export function resolveDeviceScopeId(config: DeviceConfig): string | null {
  if (!config) return null;
  const direct = config.scope_id ?? config.scopeId;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  return null;
}

export function resolveDeviceZoneId(config: DeviceConfig): string | null {
  if (!config) return null;
  const z = config.zone_id ?? config.zoneId;
  if (typeof z === 'string' && z.trim()) return z.trim();
  return null;
}
