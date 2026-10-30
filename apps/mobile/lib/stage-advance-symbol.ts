import type { GrowCycleStage } from '@growlog/domain';
import type { SymbolViewProps } from 'expo-symbols';

export type StageAdvanceSymbolName = SymbolViewProps['name'];

/** Calendar / stage actions — SF Symbol on iOS, Material on Android. */
/** Harvest step from flower (advances to drying in DB). */
export function harvestAdvanceSymbol(): StageAdvanceSymbolName {
  return { ios: 'basket.fill', android: 'shopping_basket', web: 'shopping_basket' };
}

export function stageAdvanceSymbol(stage: GrowCycleStage): StageAdvanceSymbolName {
  switch (stage) {
    case 'propagation':
      return { ios: 'arrow.triangle.2.circlepath', android: 'compost', web: 'compost' };
    case 'veg':
      return { ios: 'leaf.fill', android: 'eco', web: 'eco' };
    case 'preflower':
      return { ios: 'sun.horizon.fill', android: 'wb_twilight', web: 'wb_twilight' };
    case 'flower':
      return { ios: 'camera.macro', android: 'local_florist', web: 'local_florist' };
    case 'drying':
      return { ios: 'wind', android: 'air', web: 'air' };
    case 'curing':
      return { ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' };
    case 'completed':
      return { ios: 'flag.checkered', android: 'flag', web: 'flag' };
    default:
      return { ios: 'leaf.fill', android: 'eco', web: 'eco' };
  }
}
