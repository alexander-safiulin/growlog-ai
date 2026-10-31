import type { GrowCycleStage } from '@growlog/domain';
import type { SymbolViewProps } from 'expo-symbols';

export type StageAdvanceSymbolName = SymbolViewProps['name'];

/** Lucide Sprout analogue — propagation / cloning (not circular refresh). */
export function sproutAdvanceSymbol(): StageAdvanceSymbolName {
  return { ios: 'leaf.circle.fill', android: 'grass', web: 'grass' };
}

/** Calendar / stage actions — SF Symbol on iOS, Material on Android. */
export function stageAdvanceSymbol(stage: GrowCycleStage): StageAdvanceSymbolName {
  switch (stage) {
    case 'propagation':
    case 'cloning':
      return sproutAdvanceSymbol();
    case 'veg':
      return { ios: 'leaf.fill', android: 'eco', web: 'eco' };
    case 'preflower':
      return { ios: 'sun.horizon.fill', android: 'wb_twilight', web: 'wb_twilight' };
    case 'flower':
      return { ios: 'camera.macro', android: 'local_florist', web: 'local_florist' };
    case 'harvest':
      return { ios: 'basket.fill', android: 'shopping_basket', web: 'shopping_basket' };
    case 'drying':
      return { ios: 'wind', android: 'air', web: 'air' };
    case 'trimming':
      return { ios: 'scissors', android: 'content_cut', web: 'content_cut' };
    case 'curing':
      return { ios: 'archivebox.fill', android: 'inventory_2', web: 'inventory_2' };
    case 'completed':
      return { ios: 'flag.checkered', android: 'flag', web: 'flag' };
    default:
      return { ios: 'leaf.fill', android: 'eco', web: 'eco' };
  }
}
