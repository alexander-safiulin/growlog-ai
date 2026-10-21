export {
  createMobileSupabase,
  FARM_STORAGE_KEY,
  SCOPE_STORAGE_KEY,
  getStoredFarmId,
  setStoredFarmId,
  getStoredScopeId,
  setStoredScopeId,
} from './supabase/create-mobile-client';
export {
  getJson,
  postJson,
  transcribeVoice,
  extractVoiceIntent,
  askAssistant,
  materializeSopRuns,
  generateReport,
  speakVoice,
  registerPushToken,
  listSmartLifeDevices,
} from './server/http';
export type { SmartLifeDevice } from './server/http';
