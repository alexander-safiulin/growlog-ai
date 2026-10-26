'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTuyaClimateDevices } from '@/components/sensors/useTuyaDevices';

type DeviceListError = Error & { errorCode?: string };

export function TuyaDeviceList() {
  const { t } = useTranslation();
  const { farmId } = useFarmContext();
  const query = useTuyaClimateDevices();

  if (!farmId) return null;

  const errorCode = (query.error as DeviceListError | null)?.errorCode;
  const devices = query.data?.devices ?? [];
  const hasTuyaLinks = query.data?.hasTuyaLinks !== false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>{t('sensors.tuyaTitle')}</CardTitle>
          <CardDescription>{t('sensors.tuyaDesc')}</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {t('sensors.tuyaRefresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <p className="text-sm text-muted-foreground">{t('sensors.tuyaLoading')}</p> : null}
        {query.isError && errorCode === 'tuya_unconfigured' ? (
          <p className="text-sm text-muted-foreground">{t('sensors.tuyaUnconfigured')}</p>
        ) : null}
        {query.isError && errorCode !== 'tuya_unconfigured' ? (
          <p className="text-sm text-destructive">
            {t('sensors.tuyaError')}
            {query.error instanceof Error && query.error.message ? ` ${query.error.message}` : ''}
          </p>
        ) : null}
        {!query.isLoading && !query.isError && devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasTuyaLinks ? t('sensors.tuyaEmpty') : t('sensors.tuyaNoLinks')}
          </p>
        ) : null}
        {devices.length > 0 ? (
          <ul className="divide-y divide-border">
            {devices.map((device) => (
              <li key={device.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{device.name}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {device.online ? t('sensors.tuyaOnline') : t('sensors.tuyaOffline')}
                    {device.sub ? ` · ${t('sensors.tuyaSub')}` : ''}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[device.productName, device.category].filter(Boolean).join(' · ') || device.id}
                </p>
                <p className="break-all font-mono text-xs text-muted-foreground">{device.id}</p>
                {device.status.length > 0 ? (
                  <p className="mt-1 text-sm">
                    {device.status.map((point) => `${point.code}: ${String(point.value)}`).join(' · ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
