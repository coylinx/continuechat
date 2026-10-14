import { FREE_CONTINUE_PER_MONTH, FREE_FOLDER_LIMIT } from './config';
import { getContinueCount, listFolders } from './db';
import { getLicense, isPremium } from './license';
export type Gate = 'continue' | 'folder' | 'bulkExport';
/** BACKGROUND ONLY (touches IndexedDB). Triggers: 4th continue/month (shared), 6th folder, multi-chat Markdown/PDF export (multi-chat JSON is free). */
export async function canUse(g: Gate) {
  if (isPremium(await getLicense())) return true;
  if (g === 'continue') return (await getContinueCount()) < FREE_CONTINUE_PER_MONTH;
  if (g === 'folder') return (await listFolders()).length < FREE_FOLDER_LIMIT;
  return false;
}
