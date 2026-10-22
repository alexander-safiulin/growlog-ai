'use client';

import { deleteFarmWaterProfile, upsertFarmWaterProfileFull } from '@growlog/domain';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';

const ION_KEYS = ['Ca', 'Mg', 'K', 'Na', 'Cl', 'N_NO3', 'SO4', 'HCO3'] as const;

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
  } = useNutrientWorkspace();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ions, setIons] = useState<Record<string, number>>({});
  const [alkalinity, setAlkalinity] = useState(0);
  const [ec, setEc] = useState<number | ''>('');
  const [ph, setPh] = useState<number | ''>('');

  useEffect(() => {
    if (!activeWaterProfileId) return;
    const wp = waterProfiles.find((w) => w.id === activeWaterProfileId);
    if (!wp || editingId) return;
    setName(wp.name);
    setIons({ ...wp.water_ppm });
    setAlkalinity(Number(wp.alkalinity_hco3_ppm ?? wp.water_ppm.HCO3 ?? 0));
    setEc(wp.ec_ms_cm ?? '');
    setPh(wp.ph ?? '');
  }, [activeWaterProfileId, waterProfiles, editingId]);

  const startNew = () => {
    setEditingId('new');
    setName('');
    setIons({});
    setAlkalinity(0);
    setEc('');
    setPh('');
  };

  const startEdit = (id: string) => {
    const wp = waterProfiles.find((w) => w.id === id);
    if (!wp) return;
    setEditingId(id);
    setName(wp.name);
    setIons({ ...wp.water_ppm });
    setAlkalinity(Number(wp.alkalinity_hco3_ppm ?? 0));
    setEc(wp.ec_ms_cm ?? '');
    setPh(wp.ph ?? '');
  };

  const save = async () => {
    if (!farmId || !name.trim()) return;
    const waterPpm = { ...ions };
    if (alkalinity && waterPpm.HCO3 == null) waterPpm.HCO3 = alkalinity;
    await upsertFarmWaterProfileFull(supabase, {
      farmId,
      id: editingId === 'new' ? undefined : editingId ?? undefined,
      name: name.trim(),
      waterPpm,
      alkalinityHco3Ppm: alkalinity,
      ecMsCm: ec === '' ? null : Number(ec),
      ph: ph === '' ? null : Number(ph),
      userId,
    });
    setEditingId(null);
    await reloadFarmData();
  };

  const onDelete = async (id: string) => {
    if (!farmId) return;
    await deleteFarmWaterProfile(supabase, farmId, id);
    if (activeWaterProfileId === id) setActiveWaterProfileId('');
    await reloadFarmData();
  };

  return (
    <section className="space-y-3 text-sm">
      <label className="font-medium block">{t('nutrient.water.profile')}</label>
      <select
        className="w-full rounded-md border px-3 py-2"
        value={activeWaterProfileId}
        onChange={(e) => {
          setEditingId(null);
          setActiveWaterProfileId(e.target.value);
        }}
      >
        <option value="">{t('nutrient.water.manual')}</option>
        {waterProfiles.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>

      <div className="flex gap-2">
        {farmId && <Button type="button" size="sm" onClick={startNew}>{t('common.create')}</Button>}
        {activeWaterProfileId && farmId && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(activeWaterProfileId)}>{t('nutrient.productFilters.edit')}</Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(activeWaterProfileId)}>{t('nutrient.solutions.delete')}</Button>
          </>
        )}
      </div>

      {(editingId || !activeWaterProfileId) && (
        <div className="border rounded-md p-3 space-y-2">
          <input className="w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('nutrient.water.name')} />
          <div className="grid gap-2 sm:grid-cols-4">
            {ION_KEYS.map((key) => (
              <label key={key} className="text-xs">
                {key} (ppm)
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={ions[key] ?? 0}
                  onChange={(e) => setIons((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label>{t('nutrient.waterAlkalinity')}
              <input type="number" className="w-full border rounded px-2 py-1" value={alkalinity} onChange={(e) => setAlkalinity(Number(e.target.value))} />
            </label>
            <label>{t('nutrient.water.ec')}
              <input type="number" className="w-full border rounded px-2 py-1" value={ec} onChange={(e) => setEc(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label>{t('nutrient.water.ph')}
              <input type="number" className="w-full border rounded px-2 py-1" value={ph} onChange={(e) => setPh(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
          </div>
          {farmId && <Button type="button" size="sm" onClick={save}>{t('common.save')}</Button>}
        </div>
      )}
    </section>
  );
}
