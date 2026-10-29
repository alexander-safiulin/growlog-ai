'use client';

import { createGuestId, deleteFarmWaterProfile, upsertFarmWaterProfileFull } from '@growlog/domain';
import { deleteGuestWater, upsertGuestWater } from '@/lib/nutrient/guest/guest-workspace-actions';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';

const IONS = [
  ['Ca', 'Ca'],
  ['Mg', 'Mg'],
  ['K', 'K'],
  ['HCO3', 'HCO₃'],
  ['SO4', 'SO₄'],
  ['N_NO3', 'N-NO₃'],
  ['Na', 'Na'],
  ['Cl', 'Cl'],
] as const;

function fieldNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function analysisLine(
  ppm: Record<string, number>,
  alkalinity: number | null,
  ec: number | null | undefined,
  ph: number | null | undefined,
): string {
  const ions = IONS.flatMap(([key, label]) => {
    const value = key === 'HCO3' ? (ppm.HCO3 ?? alkalinity) : ppm[key];
    return value != null && value !== 0 ? [`${label} ${value}`] : [];
  });
  const meta = [ec != null ? `EC ${ec}` : '', ph != null ? `pH ${ph}` : ''].filter(Boolean);
  const ionText = ions.length > 0 ? `${ions.join(' · ')} mg/L` : '';
  return [ionText, ...meta].filter(Boolean).join(' · ');
}

export function WaterTab() {
  const { t } = useTranslation();
  const {
    supabase,
    farmId,
    userId,
    waterProfiles,
    activeWaterProfileId,
    setActiveWaterProfileId,
    reloadFarmData,
    isCloudSynced,
    updateGuestStore,
  } = useNutrientWorkspace();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ions, setIons] = useState<Record<string, string>>({});
  const [ec, setEc] = useState('');
  const [ph, setPh] = useState('');
  const [nameMissing, setNameMissing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const active = waterProfiles.find((profile) => profile.id === activeWaterProfileId) ?? null;

  const openCreate = () => {
    setEditingId('new');
    setName('');
    setIons({});
    setEc('');
    setPh('');
    setNameMissing(false);
  };

  const openEdit = (id: string) => {
    const profile = waterProfiles.find((row) => row.id === id);
    if (!profile) return;
    const next: Record<string, string> = {};
    for (const [key] of IONS) {
      const value = key === 'HCO3' ? (profile.water_ppm.HCO3 ?? profile.alkalinity_hco3_ppm) : profile.water_ppm[key];
      if (value != null && value !== 0) next[key] = String(value);
    }
    setEditingId(id);
    setName(profile.name);
    setIons(next);
    setEc(profile.ec_ms_cm == null ? '' : String(profile.ec_ms_cm));
    setPh(profile.ph == null ? '' : String(profile.ph));
    setNameMissing(false);
  };

  const closeForm = () => {
    setEditingId(null);
    setNameMissing(false);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameMissing(true);
      return;
    }
    const waterPpm: Record<string, number> = {};
    for (const [key] of IONS) {
      const value = fieldNumber(ions[key] ?? '');
      if (value != null && value !== 0) waterPpm[key] = value;
    }
    const ecValue = fieldNumber(ec);
    const phValue = fieldNumber(ph);
    setSaveError(null);
    if (!isCloudSynced) {
      const id = editingId && editingId !== 'new' ? editingId : createGuestId();
      updateGuestStore((store) => {
        const next = upsertGuestWater(store, {
          id,
          name: trimmed,
          water_ppm: waterPpm,
          alkalinity_hco3_ppm: null,
          ec_ms_cm: ecValue,
          ph: phValue,
        });
        return { ...next, workspace: { ...next.workspace, activeWaterProfileId: id } };
      });
      setActiveWaterProfileId(id);
      closeForm();
      return;
    }
    if (!farmId) {
      setSaveError(t('common.error'));
      return;
    }
    try {
      const row = await upsertFarmWaterProfileFull(supabase, {
        farmId,
        id: editingId === 'new' ? undefined : editingId ?? undefined,
        name: trimmed,
        waterPpm,
        alkalinityHco3Ppm: null,
        ecMsCm: ecValue,
        ph: phValue,
        userId,
      });
      setActiveWaterProfileId(row.id as string);
      closeForm();
      await reloadFarmData();
    } catch {
      setSaveError(t('common.error'));
    }
  };

  const onDelete = async (id: string) => {
    if (!isCloudSynced) {
      updateGuestStore((store) => {
        const next = deleteGuestWater(store, id);
        const stillActive = next.workspace?.activeWaterProfileId === id ? '' : next.workspace?.activeWaterProfileId;
        return { ...next, workspace: { ...next.workspace, activeWaterProfileId: stillActive } };
      });
      if (activeWaterProfileId === id) setActiveWaterProfileId('');
      if (editingId === id) closeForm();
      return;
    }
    if (!farmId) return;
    await deleteFarmWaterProfile(supabase, farmId, id);
    if (activeWaterProfileId === id) setActiveWaterProfileId('');
    if (editingId === id) closeForm();
    await reloadFarmData();
  };

  const savedLine = active
    ? analysisLine(active.water_ppm, active.alkalinity_hco3_ppm, active.ec_ms_cm, active.ph)
    : '';

  return (
    <section className="space-y-3 text-sm">
      <p className="text-muted-foreground">{t('nutrient.water.purpose')}</p>
      <label className="font-medium block">{t('nutrient.water.profile')}</label>
      <select
        className="w-full rounded-md border px-3 py-2"
        value={activeWaterProfileId}
        onChange={(e) => {
          closeForm();
          setActiveWaterProfileId(e.target.value);
        }}
      >
        <option value="">{t('nutrient.water.none')}</option>
        {waterProfiles.map((profile) => (
          <option key={profile.id} value={profile.id}>{profile.name}</option>
        ))}
      </select>

      {active && editingId !== active.id ? (
        <div className="space-y-1">
          <p>{savedLine || t('nutrient.water.allZero')}</p>
          <p className="text-muted-foreground">{t('nutrient.water.applied')}</p>
        </div>
      ) : null}

      <div className="flex gap-2">
        {!editingId ? (
          <Button type="button" size="sm" onClick={openCreate}>{t('nutrient.water.add')}</Button>
        ) : null}
        {active && !editingId ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => openEdit(active.id)}>{t('nutrient.productFilters.edit')}</Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(active.id)}>{t('nutrient.solutions.delete')}</Button>
          </>
        ) : null}
      </div>

      {editingId ? (
        <div className="border rounded-md p-3 space-y-2">
          <p className="text-muted-foreground">{t('nutrient.water.compositionHint')}</p>
          <input
            className="w-full border rounded px-2 py-1"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameMissing(false);
            }}
            placeholder={t('nutrient.water.name')}
          />
          <div className="grid gap-2 sm:grid-cols-4">
            {IONS.map(([key, label]) => (
              <label key={key} className="text-xs">
                {label} (mg/L)
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={ions[key] ?? ''}
                  placeholder="0"
                  onChange={(e) => setIons((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>{t('nutrient.water.ec')}
              <input type="number" className="w-full border rounded px-2 py-1" value={ec} placeholder="0" onChange={(e) => setEc(e.target.value)} />
            </label>
            <label>{t('nutrient.water.ph')}
              <input type="number" className="w-full border rounded px-2 py-1" value={ph} placeholder="0" onChange={(e) => setPh(e.target.value)} />
            </label>
          </div>
          {nameMissing ? (
            <p className="text-destructive" role="alert">{t('nutrient.water.nameRequired')}</p>
          ) : null}
          {saveError ? (
            <p className="text-destructive" role="alert">{saveError}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save}>{t('common.save')}</Button>
            <Button type="button" size="sm" variant="outline" onClick={closeForm}>{t('common.cancel')}</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
