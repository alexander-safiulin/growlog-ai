'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchFarmTuyaDeviceRows,
  fetchFarmTuyaLinkRows,
  type FarmTuyaDeviceRow,
  type FarmTuyaLinkRow,
} from '@growlog/domain';
import { useCallback, useEffect, useState } from 'react';

export function TuyaFarmLinksSettings() {
  const { t } = useTranslation();
  const { supabase, farmId, userId } = useFarmContext();
  const [links, setLinks] = useState<FarmTuyaLinkRow[]>([]);
  const [devices, setDevices] = useState<FarmTuyaDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!farmId || !userId) {
      setLinks([]);
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [linkRows, deviceRows] = await Promise.all([
        fetchFarmTuyaLinkRows(supabase, farmId),
        fetchFarmTuyaDeviceRows(supabase, farmId),
      ]);
      setLinks(linkRows);
      setDevices(deviceRows);
    } finally {
      setLoading(false);
    }
  }, [farmId, userId, supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!farmId || !userId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.tuyaLinksTitle')}</CardTitle>
        <CardDescription>{t('settings.tuyaLinksDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('settings.tuyaLinksManagedByGrowlog')}</p>
        {loading ? <p className="text-sm text-muted-foreground">{t('sensors.tuyaLoading')}</p> : null}
        {!loading && links.length === 0 && devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.tuyaLinksEmpty')}</p>
        ) : null}
        {links.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('settings.tuyaLinksAccounts')}</p>
            <ul className="divide-y divide-border rounded-md border">
              {links.map((link) => (
                <li key={link.id} className="px-3 py-2 text-sm">
                  <p className="font-mono text-xs break-all">{link.tuya_uid}</p>
                  {link.label ? <p className="text-muted-foreground">{link.label}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {devices.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('settings.tuyaLinksDevices')}</p>
            <ul className="divide-y divide-border rounded-md border">
              {devices.map((device) => (
                <li key={device.id} className="px-3 py-2 text-sm">
                  <p className="font-mono text-xs break-all">{device.tuya_device_id}</p>
                  <p className="text-xs text-muted-foreground">{device.tuya_uid}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
