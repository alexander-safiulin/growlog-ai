'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { FarmMembersCard } from '@/components/settings/FarmMembersCard';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function MembersBody() {
  const { t } = useTranslation();
  const { farms, farmId, userId, pendingFarmInvitations } = useFarmContext();

  return (
  <>
      <PageHead titleKey="titles.members" />
      <AppShell title={t('farmMembers.title')}>
        <div className="space-y-6">
          {pendingFarmInvitations.length > 0 ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-base">{t('farmMembers.inboxTitle')}</CardTitle>
                <CardDescription>{t('farmMembers.inboxDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t('farmMembers.inboxHint')}
              </CardContent>
            </Card>
          ) : null}

          {farms.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('farmMembers.noFarmTitle')}</CardTitle>
                <CardDescription>{t('farmMembers.noFarmDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href="/onboarding">{t('dailyFocus.setupFarm')}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {farmId && userId ? <FarmMembersCard /> : null}
        </div>
      </AppShell>
    </>
  );
}

export default function MembersPage() {
  return (
    <AppRouteReady>
      <MembersBody />
    </AppRouteReady>
  );
}
