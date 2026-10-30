/** Map Supabase/Postgres RPC errors to short Russian grower messages. */
export function mapGrowCycleRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('not authenticated')) return 'Нужно войти в аккаунт.';
  if (m.includes('invalid farm access')) return 'Нет доступа к этой ферме.';
  if (m.includes('invalid cycle')) return 'Цикл не найден.';
  if (m.includes('scope_id must belong')) return 'Выбран неверный scope для цикла.';
  if (m.includes('invalid entry_kind')) return 'Неверный тип записи.';
  if (m.includes('invalid volume')) return 'Укажите объём больше нуля.';
  if (m.includes('light hours must sum to 24')) return 'Свет и темнота должны в сумме давать 24 часа.';
  if (m.includes('clone cycles cannot enter propagation')) {
    return 'Для клона стадия проращивания недоступна.';
  }
  if (m.includes('invalid new_stage')) return 'Неверная стадия цикла.';
  if (m.includes('cross-farm')) return 'Продукт или рецепт из другой фермы.';
  if (m.includes('recipe_id cross-farm')) return 'Раствор из другой фермы.';
  return message;
}

export function growerNumberFieldErrorRu(code: 'empty' | 'invalid', fieldLabel: string): string {
  if (code === 'empty') return `Укажите ${fieldLabel}.`;
  return `Некорректное число в поле «${fieldLabel}».`;
}
