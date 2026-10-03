import type { BalanceConfig } from './balance';
import { DEFAULT_BALANCE, mergeBalance, cloneBalance } from './balance';
import { fetchJsonData, saveJsonData } from '@/lib/api';

export async function loadBalanceFromStorage(): Promise<Partial<BalanceConfig> | null> {
  return await fetchJsonData<Partial<BalanceConfig>>('balance');
}

export async function saveBalanceToStorage(balance: BalanceConfig): Promise<void> {
  await saveJsonData('balance', balance);
}

export async function clearBalanceStorage(): Promise<void> {
  await saveJsonData('balance', {});
}

export async function loadMergedBalance(): Promise<BalanceConfig> {
  const loaded = await loadBalanceFromStorage();
  return mergeBalance(DEFAULT_BALANCE, loaded ?? {});
}

export async function loadPresets(): Promise<Record<string, Partial<BalanceConfig>>> {
  const presets = await fetchJsonData<Record<string, Partial<BalanceConfig>>>('presets');
  return presets ?? {};
}

export async function savePreset(name: string, balance: BalanceConfig): Promise<void> {
  if (!name.trim()) return;
  const presets = await loadPresets();
  presets[name] = balance;
  await saveJsonData('presets', presets);
}

export async function deletePreset(name: string): Promise<void> {
  const presets = await loadPresets();
  delete presets[name];
  await saveJsonData('presets', presets);
}
