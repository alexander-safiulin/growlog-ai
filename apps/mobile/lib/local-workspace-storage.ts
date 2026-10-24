import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LOCAL_WORKSPACE_STORAGE_KEY,
  createDefaultLocalWorkspace,
  parseLocalWorkspaceStore,
  serializeLocalWorkspaceStore,
  type LocalWorkspaceStore,
} from '@growlog/domain';

export async function loadLocalWorkspaceStore(): Promise<LocalWorkspaceStore> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_WORKSPACE_STORAGE_KEY);
    return parseLocalWorkspaceStore(raw) ?? createDefaultLocalWorkspace();
  } catch {
    return createDefaultLocalWorkspace();
  }
}

export async function saveLocalWorkspaceStore(store: LocalWorkspaceStore): Promise<void> {
  await AsyncStorage.setItem(LOCAL_WORKSPACE_STORAGE_KEY, serializeLocalWorkspaceStore(store));
}
