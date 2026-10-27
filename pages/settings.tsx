'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { TuyaFarmLinksSettings } from '@/components/settings/TuyaFarmLinksSettings';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FarmMembersCard } from '@/components/settings/FarmMembersCard';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function SettingsBody() {
  const { t } = useTranslation();
  const {
    supabase,
    farms,
    farmId,
    setFarmId,
    cycle,
    scopes,
    scopeId,
    setScopeId,
    refetchAll,
    userId,
  } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);
  const [name, setName] = useState(farm?.name ?? '');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (farm) setName(farm.name);
  }, [farm]);

  async function saveFarmName(e: React.FormEvent) {
    e.preventDefault();
    if (!farmId) return;
    setPending(true);
    setMsg(null);
    try {
      const { error } = await supabase.from('farms').update({ name: name.trim() }).eq('id', farmId);
      if (error) throw error;
      await refetchAll();
      setMsg(t('common.saved'));
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('language.label')}</CardTitle>
          <CardDescription>{t('settings.languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="text-sm text-muted-foreground">{t('settings.languageHint')}</span>
        </CardContent>
      </Card>

      <TuyaFarmLinksSettings />

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.farm')}</CardTitle>
          <CardDescription>{t('settings.farmDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveFarmName} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t('auth.signInPending') : t('settings.saveName')}
            </Button>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </form>
        </CardContent>
      </Card>

      {farms.length >= 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.activeFarm')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {farms.length > 1 ? (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={farmId ?? ''}
                onChange={(e) => setFarmId(e.target.value)}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">{farm?.name}</p>
            )}
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link href="/onboarding">{t('settings.createOwnFarm')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {farmId && userId && <FarmMembersCard />}

      {cycle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.activeCycle')}</CardTitle>
            <CardDescription>
              {cycle.name} · {cycle.stage} · {t('common.since')} {cycle.start_date}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <ScopeAndCmsSettings />
    </div>
  );
}

function ScopeAndCmsSettings() {
  const { t } = useTranslation();
  const { cycle, scopes, scopeId, setScopeId } = useFarmContext();

  if (!cycle) return null;

  return (
    <>
      {scopes.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('settings.scopeTitle')}</CardTitle>
            <CardDescription>{t('settings.scopeDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scopeId ?? ''}
              onChange={(e) => setScopeId(e.target.value)}
            >
              {scopes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name || s.scope_type}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('cms.handover')}</CardTitle>
          <CardDescription>Cultivation Management System (ADR-013)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button variant="outline" size="sm" asChild>
            <Link href="/handover">{t('cms.handover')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/calendar">{t('cms.calendar')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cms/playbook">{t('cms.playbook')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cms/interview">{t('cms.interview')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cms/deviations">{t('cms.deviations')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cms/traceability">{t('cms.traceability')}</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function SettingsPageBody() {
  const { t } = useTranslation();
  return (
    <>
      <PageHead titleKey="titles.settings" />
      <AppShell title={t('titles.settings')}>
        <SettingsBody />
      </AppShell>
    </>
  );
}

export default function SettingsPage() {
  return (
    <AppRouteReady>
      <SettingsPageBody />
    </AppRouteReady>
  );
}
