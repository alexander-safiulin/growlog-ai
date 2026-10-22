'use client';

import {
  deleteFarmFeedSystem,
  saveFarmFeedSystem,
  setGrowCycleNutrientPlan,
} from '@growlog/domain';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { profileDisplayName } from '@/lib/nutrient/profile-label';

function cleanLabel(name: string): string {
  return name.replace(/https?:\/\/[^\s]+/gi, '').replace(/\s+/g, ' ').trim();
}

type StepDraft = {
  id?: string;
  step_order: number;
  week_label: string | null;
  stage: string | null;
  target_ppm: Record<string, number>;
  ph_target: number | null;
  ec_target_ms_cm: number | null;
  light_hours: number | null;
  light_ppfd: number | null;
};

export function SystemsTab() {
  const { t } = useTranslation();
  const {
    catalog,
    supabase,
    farmId,
    userId,
    cycle,
    feedSystems,
    feedStepsBySystem,
    cyclePlan,
    activeSystemId,
    setActiveSystemId,
    activeStepId,
    setActiveStepId,
    profileSlug,
    setProfileSlug,
    reloadFarmData,
  } = useNutrientWorkspace();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);

  const allProfiles = catalog.target_profiles;

  const startNew = () => {
    const profile = allProfiles.find((p) => p.slug === profileSlug) ?? allProfiles[0];
    const target = profile?.target_ppm ?? {};
    setEditingId('new');
    setName('');
    setSteps([
      {
        step_order: 1,
        week_label: 'Week 1',
        stage: 'veg',
        target_ppm: target as Record<string, number>,
        ph_target: null,
        ec_target_ms_cm: null,
        light_hours: null,
        light_ppfd: null,
      },
    ]);
  };

  const startEdit = (systemId: string) => {
    const sys = feedSystems.find((s) => s.id === systemId);
    if (!sys) return;
    setEditingId(systemId);
    setName(sys.name);
    setSteps(
      (feedStepsBySystem[systemId] ?? []).map((s) => ({
        id: s.id,
        step_order: s.step_order,
        week_label: s.week_label,
        stage: s.stage,
        target_ppm: s.target_ppm,
        ph_target: s.ph_target,
        ec_target_ms_cm: s.ec_target_ms_cm,
        light_hours: s.light_hours,
        light_ppfd: s.light_ppfd,
      })),
    );
  };

  const saveSystem = async () => {
    if (!farmId || !name.trim()) return;
    const id = await saveFarmFeedSystem(supabase, {
      farmId,
      userId,
      id: editingId === 'new' ? undefined : editingId ?? undefined,
      name: name.trim(),
      steps,
    });
    setEditingId(null);
    setActiveSystemId(id);
    await reloadFarmData();
  };

  const onDelete = async (id: string) => {
    if (!farmId) return;
    await deleteFarmFeedSystem(supabase, farmId, id);
    await reloadFarmData();
  };

  const attachToCycle = async () => {
    if (!farmId || !cycle?.id || !activeSystemId) return;
    await setGrowCycleNutrientPlan(supabase, {
      farmId,
      cycleId: cycle.id,
      farmFeedSystemId: activeSystemId,
      activeStepId: activeStepId || null,
      userId,
    });
    await reloadFarmData();
  };

  const activeSteps = activeSystemId ? feedStepsBySystem[activeSystemId] ?? [] : [];

  return (
    <section className="space-y-4">
      <div>
        <label className="text-sm font-medium block">{t('nutrient.targetProfile')}</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={profileSlug}
          onChange={(e) => setProfileSlug(e.target.value)}
        >
          {allProfiles.map((p) => (
            <option key={p.slug} value={p.slug}>
              {profileDisplayName(p.slug, p.name, t)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">{t('nutrient.systems.profileHint')}</p>
      </div>

      {catalog.feed_schedules && catalog.feed_schedules.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-1">{t('nutrient.systems.schedules')}</h3>
          <ul className="text-sm max-h-40 overflow-y-auto border rounded-md divide-y">
            {catalog.feed_schedules.map((s) => (
              <li key={s.slug} className="px-3 py-2">
                {s.manufacturer ? `${cleanLabel(s.manufacturer)} — ` : ''}
                {cleanLabel(s.name)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <h3 className="text-sm font-medium">{t('nutrient.systems.farmSystems')}</h3>
        {farmId && <Button type="button" size="sm" onClick={startNew}>{t('common.create')}</Button>}
      </div>

      {editingId && (
        <div className="border rounded-md p-3 space-y-2 text-sm">
          <input className="w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('nutrient.systems.name')} />
          {steps.map((step, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-3 border-t pt-2">
              <input className="border rounded px-2 py-1" value={step.week_label ?? ''} onChange={(e) => {
                const next = [...steps];
                next[idx] = { ...next[idx], week_label: e.target.value };
                setSteps(next);
              }} placeholder={t('nutrient.systems.week')} />
              <input type="number" className="border rounded px-2 py-1" value={step.ec_target_ms_cm ?? ''} onChange={(e) => {
                const next = [...steps];
                next[idx] = { ...next[idx], ec_target_ms_cm: e.target.value ? Number(e.target.value) : null };
                setSteps(next);
              }} placeholder={t('nutrient.systems.ecTarget')} />
              <input type="number" className="border rounded px-2 py-1" value={step.ph_target ?? ''} onChange={(e) => {
                const next = [...steps];
                next[idx] = { ...next[idx], ph_target: e.target.value ? Number(e.target.value) : null };
                setSteps(next);
              }} placeholder={t('nutrient.systems.phTarget')} />
            </div>
          ))}
          <Button type="button" size="sm" onClick={() => setSteps((s) => [...s, { ...s[s.length - 1], step_order: s.length + 1 }])}>{t('nutrient.systems.addStep')}</Button>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={saveSystem}>{t('common.save')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}

      <ul className="text-sm space-y-2">
        {feedSystems.map((sys) => (
          <li key={sys.id} className="border rounded-md p-3 flex flex-wrap justify-between gap-2">
            <button type="button" className="font-medium text-left" onClick={() => setActiveSystemId(sys.id)}>
              {cleanLabel(sys.name)}
              {activeSystemId === sys.id ? ' ✓' : ''}
            </button>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(sys.id)}>{t('nutrient.productFilters.edit')}</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(sys.id)}>{t('nutrient.solutions.delete')}</Button>
            </div>
          </li>
        ))}
        {!feedSystems.length && <li className="text-muted-foreground">{t('nutrient.systems.empty')}</li>}
      </ul>

      {activeSystemId && (
        <div>
          <label className="text-sm font-medium">{t('nutrient.systems.activeStep')}</label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm mt-1"
            value={activeStepId}
            onChange={(e) => setActiveStepId(e.target.value)}
          >
            <option value="">{t('nutrient.systems.pickStep')}</option>
            {activeSteps.map((st) => (
              <option key={st.id} value={st.id}>
                {st.week_label ?? `Step ${st.step_order}`}
                {st.ec_target_ms_cm != null ? ` · EC ${st.ec_target_ms_cm}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {cycle?.id && activeSystemId && farmId && (
        <Button type="button" onClick={attachToCycle}>{t('nutrient.systems.attachCycle')}</Button>
      )}
      {cyclePlan && (
        <p className="text-xs text-muted-foreground">
          {t('nutrient.systems.planLinked')}: {cyclePlan.farm_feed_system_id}
        </p>
      )}
    </section>
  );
}
