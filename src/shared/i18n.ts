/** UI strings (English + 简体中文). Language follows the browser unless set in Settings. */
import type { ContextLabels } from './continue';
import type { ExportLabels } from './export';
import { getSettings, type LangSetting } from './settings';

type V = Record<string, string | number>;
type Msg = string | ((v: V) => string);
const s = (n: unknown) => (Number(n) === 1 ? '' : 's');

const en = {
  // panel
  searchPlaceholder: 'Search chats', export: 'Export', sync: 'Sync', syncTitle: 'Refresh the chat list from {site}',
  storedLocally: 'Stored only in this browser · No sign-up',
  syncing: 'Syncing…', syncingN: 'Syncing… {n} chats', synced: 'Synced', syncFailed: 'Sync failed', retry: 'Retry',
  syncedN: (v: V) => `${v.n} chat${s(v.n)} synced`,
  continueIn: 'Continue in {site}', continueHint: 'Bring this chat into a new {site} chat. Nothing is sent automatically.',
  continueExplain: 'Opens {site} in a new tab with this chat in the message box. Nothing is sent.',
  thisChat: 'This chat', noChatTitle: 'No chat open',
  pin: 'Pin', unpin: 'Unpin', addToFolder: 'Add to folder', openChatHint: 'Open a conversation to continue it in {site}, pin it or file it.',
  pinned: 'Pinned', folders: 'Folders', newFolder: 'New folder', renameFolder: 'Rename folder', deleteFolder: 'Delete folder',
  removeFromFolder: 'Remove from folder', folderEmpty: 'Empty', noFolders: 'No folders yet', unavailable: 'Chat not synced yet',
  folderNamePlaceholder: 'Folder name', addToFolderTitle: 'Add to folder',
  deleteFolderTitle: 'Delete “{name}”?', deleteFolderBody: 'The chats inside are kept.',
  results: 'Results', noMatches: 'No matches',
  searchHelp: (v: V) => `Search covers the titles of ${v.n} synced chat${s(v.n)} and the full text of ${v.full} chat${s(v.full)} you have opened.`,
  quotaInfo: 'Uses 1 free continue · {left} left this month', proActive: 'Pro · Unlimited continues',
  quotaFree: '{left} of {limit} free continues left this month', quotaWhat: 'What counts?',
  quotaWhatBody: 'A continue is each time ContinueChat opens the other assistant with your chat filled in. Free includes {limit} a month and resets on {date}; it only counts when the new tab actually opens. Pins, folders, search and Markdown/JSON export don’t use it.',
  help: 'How it works', launcherTip: 'ContinueChat lives here. Drag to move it.',
  onboardTitle: 'How it works', onboard1: 'Open a chat on ChatGPT or Claude.',
  onboard2: 'Click “Continue in …” above the message box.',
  onboard3: 'The other assistant opens with the chat filled in. Review it, then send.',
  onboardMore: 'Pins, folders, search and export live here too. Everything stays in your browser.',
  // common
  cancel: 'Cancel', close: 'Close', done: 'Done', save: 'Save', create: 'Create', delete: 'Delete', next: 'Next', back: 'Back',
  pro: 'Pro', free: 'Free', all: 'All',
  errAuth: 'Sign in to {site} first', errRate: '{site} is limiting requests. Try again in a minute.', errNet: 'Network error. Check your connection.',
  errHttp: '{site} returned an error. Try again later.', errGeneric: 'Something went wrong. Please try again.',
  // continue dialog
  readingChat: 'Reading this chat…', openChatFirst: 'Open a chat with at least one message first.',
  continueTitle: 'Continue chat', continueInLabel: 'Continue in', youAreHere: 'You are here', bringLast: 'Bring the last',
  nTurns: (v: V) => `${v.n} turn${s(v.n)}`, nFiles: (v: V) => `${v.n} file${s(v.n)}`, allTurns: 'All turns', nChars: '{n} chars',
  tooLong: 'This context is too long ({full} / {budget} characters). Bring fewer turns?', bring4: 'Bring 4 turns', trimToFit: 'Trim to fit',
  trimNote: 'Trim to fit removes the earliest ~{n} characters.', trimmedNote: 'Trimmed: the earliest ~{n} characters will be left out.',
  omittedInfo: (v: V) => `${v.n} earlier turn${s(v.n)} ${Number(v.n) === 1 ? 'is' : 'are'} left out. About ${v.used} of ${v.budget} characters.`,
  attachedFiles: 'Attached files included', attachedNote: 'The text of these files is added to the context. The files themselves are not uploaded.',
  willFill: 'Will be filled into the input box', showAll: 'Show all', showLess: 'Show less', notSent: 'Nothing is sent until you press send yourself.',
  trimmedToFit: 'Context trimmed to fit', opening: 'Opening…',
  // paywall
  pwQuotaTitle: 'You used all {limit} continues this month', pwQuotaSub: 'Free continues reset on {date}. ContinueChat Pro keeps this chat going in {site} right now.',
  pwFolderTitle: "You've reached {limit} folders", pwFolderSub: 'ContinueChat Pro gives you unlimited folders. Your existing folders stay as they are.',
  upgradeTitle: 'Upgrade to ContinueChat Pro', upgradeSub: 'Unlimited continues and folders, plus PDF export. Pay monthly or once.',
  pwExportTitle: 'PDF export is a Pro feature', pwExportSub: 'Markdown and JSON export stay free, for one chat or many. ContinueChat Pro adds print-ready PDF.',
  featContinues: 'Unlimited continues', featFolders: 'Unlimited folders', featExport: 'Export to PDF',
  monthly: 'Monthly', perMonth: '/mo', lifetime: 'Lifetime · pay once', upgrade: 'Upgrade to Pro', haveKey: 'I have a license key', notNow: 'Not now',
  checkoutSoon: 'Checkout is not open yet. Please check back soon.',
  // export
  stepOf: 'Step {i} of 3', selectChats: 'Select chats', filterPlaceholder: 'Filter by title', selectAll: 'Select all', nSelected: '{n} selected',
  noIndexed: 'No chats synced yet. Press Sync first.', chooseFormat: 'Choose a format',
  fmtMd: 'Markdown', fmtMdDesc: 'Readable, works in Notion and Obsidian', fmtMdManyDesc: 'One .md file per chat, in a .zip', fmtJsonDesc: 'Full structure, for backups and scripts', fmtPdfDesc: 'Ready to share or print',
  otherSiteNote: 'Chats from {site} are exported from the copy saved in this browser.',
  exportN: (v: V) => `Export ${v.n} chat${s(v.n)}`, fetchingN: 'Fetching {i} of {n}…', exportFailed: 'Could not read the selected chats.',
  exportedN: (v: V) => `${v.n} chat${s(v.n)} exported`, pdfHint: 'Use “Save as PDF” in the print dialog', savedToDownloads: 'Saved to Downloads',
  nFailed: '{n} failed', continueOne: 'Continue one in {site}',
  // prefill (target tab)
  filledToast: 'Context from your {site} chat is in the input box. Review it, then press send.', gotIt: 'Got it',
  fillFailed: "Couldn't fill the input box automatically.", copyContext: 'Copy context', copied: 'Copied. Paste it into the input box.', copyFailed: 'Copy failed. Please try again.',
  // context text sent to the other AI
  ctxHeader: (v: V) => `Context from my earlier chat "${v.title}" (last ${v.n} turn${s(v.n)}):`, ctxFooter: 'Please continue from here.',
  ctxUser: 'User', ctxAI: 'AI', ctxTrimmed: '…[earlier context trimmed]', ctxFileTrunc: '…[file truncated]', exportedWith: 'Exported with ContinueChat',
  // popup
  planFree: 'Free', continuesThisMonth: 'Continues this month', resetsOn: 'Resets {date}', unlimited: 'Unlimited',
  statsLine: (v: V) => `${v.chats} chat${s(v.chats)} synced · ${v.folders} folder${s(v.folders)}`,
  howTo: 'On ChatGPT or Claude, click the ContinueChat button in the bottom-right corner.', openSite: 'Open {site}', settings: 'Settings', haveKeyLink: 'Have a license key?',
  // options
  settingsTitle: 'ContinueChat settings', welcomeTitle: 'ContinueChat is ready',
  welcomeBody: 'Open a chat on ChatGPT or Claude, then click “Continue in …” above the message box, or the ContinueChat button in the bottom-right corner for folders, search and export.',
  secContinue: 'Continue', defaultTurns: 'Turns to bring by default', maxContext: 'Maximum context length',
  maxContextHelp: 'Longer context keeps more history but fills more of the new chat’s input box.', nCharsFull: '{n} characters',
  secSearch: 'Search', indexOnOpen: 'Save the text of chats I open, so search can find words inside them', indexOnOpenHelp: 'Saved only in this browser.',
  secLanguage: 'Language', langAuto: 'Match browser',
  secPro: 'ContinueChat Pro', licNone: 'Free plan', licActive: 'Pro is active', licGrace: 'Pro is active (offline — last checked {date})',
  licExpired: 'Your license could not be confirmed for a while, so Pro features are paused. Your data is untouched.', licInvalid: 'This license is no longer valid ({msg}).',
  licenseKey: 'License key', activate: 'Activate', verifying: 'Verifying…', activated: 'Pro is active. Thank you!',
  errInvalidKey: 'This key is not valid ({msg}).', errUnavailable: 'The license service is not available right now. Please try again later.',
  checkNow: 'Check now', checking: 'Checking…', lastChecked: 'Last checked {date}',
  removeLicense: 'Remove license from this browser', removeLicenseConfirm: 'Remove the license from this browser? You can activate it again later.',
  buyMonthly: 'Monthly', buyLifetime: 'Lifetime',
  secData: 'Your data',
  dataStats: (v: V) => `${v.chats} chat${s(v.chats)} synced (${v.full} with full text) · ${v.folders} folder${s(v.folders)} · ${v.pins} pinned`,
  exportBackup: 'Export backup (JSON)', importBackup: 'Import backup…',
  importDone: 'Imported {chats} chats, {folders} folders and {pins} pins.', importBad: "This file isn't a ContinueChat backup.",
  wipe: 'Delete all local data', wipeConfirm: 'Delete all ContinueChat data in this browser (folders, pins, search index, settings, license)? Your chats on ChatGPT and Claude are not affected.',
  wiped: 'All local data was deleted.', privacyLine: 'Stored locally · No sign-up. Your chats never leave this browser.',
  secAbout: 'About', version: 'Version {v}', privacyPolicy: 'Privacy policy', contact: 'Contact', notAffiliated: 'ContinueChat is an independent product, not affiliated with OpenAI or Anthropic.',
  saved: 'Saved',
  // print page
  printBtn: 'Print / Save as PDF', printExpired: 'This export has expired. Export it again from the ContinueChat panel.',
} satisfies Record<string, Msg>;
export type MsgKey = keyof typeof en;

const zh: Record<MsgKey, Msg> = {
  searchPlaceholder: '搜索对话', export: '导出', sync: '同步', syncTitle: '从 {site} 刷新对话列表',
  storedLocally: '只保存在本浏览器 · 无需注册',
  syncing: '同步中…', syncingN: '同步中… 已同步 {n} 个对话', synced: '已同步', syncFailed: '同步失败', retry: '重试',
  syncedN: '已同步 {n} 个对话',
  continueIn: '在 {site} 继续', continueHint: '把这段对话带到新的 {site} 对话里，不会自动发送。',
  continueExplain: '在新标签页打开 {site}，对话会填进输入框，不会自动发送。',
  thisChat: '当前对话', noChatTitle: '还没打开对话',
  pin: '置顶', unpin: '取消置顶', addToFolder: '加入文件夹', openChatHint: '打开任意对话后，可以在 {site} 继续、置顶或归入文件夹。',
  pinned: '已置顶', folders: '文件夹', newFolder: '新建文件夹', renameFolder: '重命名文件夹', deleteFolder: '删除文件夹',
  removeFromFolder: '移出文件夹', folderEmpty: '空', noFolders: '还没有文件夹', unavailable: '对话尚未同步',
  folderNamePlaceholder: '文件夹名称', addToFolderTitle: '添加到文件夹',
  deleteFolderTitle: '删除“{name}”？', deleteFolderBody: '文件夹里的对话会保留。',
  results: '搜索结果', noMatches: '没有匹配的结果',
  searchHelp: '搜索范围：已同步的 {n} 个对话标题，以及你打开过的 {full} 个对话全文。',
  quotaInfo: '用掉 1 次免费继续 · 本月还剩 {left} 次', proActive: 'Pro · 不限次数继续',
  quotaFree: '本月还剩 {left}/{limit} 次免费继续', quotaWhat: '什么算一次？',
  quotaWhatBody: '「继续」指 ContinueChat 把对话带到另一个 AI、在新标签页填好输入框，每成功打开一次算一次。免费版每月 {limit} 次，{date} 重置。置顶、文件夹、搜索、导出 Markdown/JSON 都不占用这个次数。',
  help: '使用说明', launcherTip: 'ContinueChat 在这里，可以拖动位置。',
  onboardTitle: '使用方法', onboard1: '在 ChatGPT 或 Claude 打开一个对话。',
  onboard2: '点输入框上方的「在 … 继续」。',
  onboard3: '另一个 AI 会打开并填好对话内容，你检查后再发送。',
  onboardMore: '置顶、文件夹、搜索和导出也在这里，数据只保存在你的浏览器。',
  cancel: '取消', close: '关闭', done: '完成', save: '保存', create: '创建', delete: '删除', next: '下一步', back: '上一步',
  pro: 'Pro', free: '免费', all: '全部',
  errAuth: '请先登录 {site}', errRate: '{site} 请求过于频繁，请稍后再试。', errNet: '网络错误，请检查网络连接。',
  errHttp: '{site} 返回了错误，请稍后再试。', errGeneric: '出了点问题，请重试。',
  readingChat: '正在读取对话…', openChatFirst: '请先打开一个至少有一条消息的对话。',
  continueTitle: '继续对话', continueInLabel: '继续到', youAreHere: '当前所在', bringLast: '带上最近',
  nTurns: '{n} 轮', nFiles: '{n} 个文件', allTurns: '全部轮次', nChars: '{n} 字符',
  tooLong: '上下文太长（{full} / {budget} 字符），要少带几轮吗？', bring4: '只带 4 轮', trimToFit: '裁剪以适应',
  trimNote: '“裁剪以适应”会去掉最早的约 {n} 个字符。', trimmedNote: '已裁剪：最早的约 {n} 个字符不会带上。',
  omittedInfo: '更早的 {n} 轮不会带上，约 {used} / {budget} 字符。',
  attachedFiles: '包含附件内容', attachedNote: '这些文件的文字内容会加入上下文，文件本身不会上传。',
  willFill: '将填入输入框', showAll: '展开全部', showLess: '收起', notSent: '在你亲自点击发送之前，不会发送任何内容。',
  trimmedToFit: '上下文已裁剪', opening: '正在打开…',
  pwQuotaTitle: '本月 {limit} 次继续已用完', pwQuotaSub: '免费次数将于 {date} 重置。升级 ContinueChat Pro，现在就能在 {site} 继续这段对话。',
  pwFolderTitle: '已达到 {limit} 个文件夹上限', pwFolderSub: 'ContinueChat Pro 不限文件夹数量，现有文件夹保持不变。',
  upgradeTitle: '升级 ContinueChat Pro', upgradeSub: '不限次数继续、不限文件夹，还能导出 PDF。可以按月，也可以一次买断。',
  pwExportTitle: 'PDF 导出是 Pro 功能', pwExportSub: 'Markdown 和 JSON 导出一直免费，单个或批量都可以。升级 ContinueChat Pro 即可导出排版好的 PDF。',
  featContinues: '不限次数继续对话', featFolders: '不限文件夹数量', featExport: '导出 PDF',
  monthly: '按月', perMonth: '/月', lifetime: '终身 · 一次付费', upgrade: '升级到 Pro', haveKey: '我有许可证密钥', notNow: '暂不',
  checkoutSoon: '购买通道尚未开放，请稍后再来。',
  stepOf: '第 {i} 步，共 3 步', selectChats: '选择对话', filterPlaceholder: '按标题筛选', selectAll: '全选', nSelected: '已选 {n} 个',
  noIndexed: '还没有同步任何对话，请先点击“同步”。', chooseFormat: '选择格式',
  fmtMd: 'Markdown', fmtMdDesc: '易读，适用于 Notion 和 Obsidian', fmtMdManyDesc: '每个对话一个 .md 文件，打包为 .zip', fmtJsonDesc: '完整结构，适合备份和脚本处理', fmtPdfDesc: '便于分享或打印',
  otherSiteNote: '来自 {site} 的对话将使用本浏览器中保存的副本导出。',
  exportN: '导出 {n} 个对话', fetchingN: '正在读取 {i}/{n}…', exportFailed: '无法读取所选对话。',
  exportedN: '已导出 {n} 个对话', pdfHint: '请在打印对话框中选择“另存为 PDF”', savedToDownloads: '已保存到“下载”文件夹',
  nFailed: '{n} 个失败', continueOne: '在 {site} 继续其中一个',
  filledToast: '来自 {site} 对话的上下文已填入输入框，确认无误后再点击发送。', gotIt: '知道了',
  fillFailed: '无法自动填入输入框。', copyContext: '复制上下文', copied: '已复制，请粘贴到输入框。', copyFailed: '复制失败，请重试。',
  ctxHeader: '以下是我之前一段对话“{title}”的上下文（最近 {n} 轮）：', ctxFooter: '请接着这里继续。',
  ctxUser: '用户', ctxAI: 'AI', ctxTrimmed: '…[更早的上下文已省略]', ctxFileTrunc: '…[文件内容已截断]', exportedWith: '由 ContinueChat 导出',
  planFree: '免费版', continuesThisMonth: '本月继续次数', resetsOn: '{date} 重置', unlimited: '不限次数',
  statsLine: '已同步 {chats} 个对话 · {folders} 个文件夹',
  howTo: '在 ChatGPT 或 Claude 页面，点右下角的 ContinueChat 按钮。', openSite: '打开 {site}', settings: '设置', haveKeyLink: '已有许可证密钥？',
  settingsTitle: 'ContinueChat 设置', welcomeTitle: 'ContinueChat 已就绪',
  welcomeBody: '在 ChatGPT 或 Claude 打开一个对话，点输入框上方的「在 … 继续」；文件夹、搜索和导出在右下角的 ContinueChat 按钮里。',
  secContinue: '继续对话', defaultTurns: '默认带上的轮数', maxContext: '上下文最大长度',
  maxContextHelp: '上下文越长，保留的历史越多，但也会占用新对话输入框更多空间。', nCharsFull: '{n} 字符',
  secSearch: '搜索', indexOnOpen: '保存我打开过的对话全文，以便搜索对话内容', indexOnOpenHelp: '仅保存在本浏览器中。',
  secLanguage: '语言', langAuto: '跟随浏览器',
  secPro: 'ContinueChat Pro', licNone: '免费版', licActive: 'Pro 已激活', licGrace: 'Pro 已激活（离线中，上次验证：{date}）',
  licExpired: '许可证已有一段时间无法验证，Pro 功能已暂停。你的数据不受影响。', licInvalid: '该许可证已失效（{msg}）。',
  licenseKey: '许可证密钥', activate: '激活', verifying: '验证中…', activated: 'Pro 已激活，感谢支持！',
  errInvalidKey: '该密钥无效（{msg}）。', errUnavailable: '许可证服务暂时不可用，请稍后再试。',
  checkNow: '立即验证', checking: '验证中…', lastChecked: '上次验证：{date}',
  removeLicense: '从此浏览器移除许可证', removeLicenseConfirm: '要从此浏览器移除许可证吗？之后可以重新激活。',
  buyMonthly: '按月', buyLifetime: '终身',
  secData: '你的数据',
  dataStats: '已同步 {chats} 个对话（{full} 个含全文）· {folders} 个文件夹 · {pins} 个置顶',
  exportBackup: '导出备份（JSON）', importBackup: '导入备份…',
  importDone: '已导入 {chats} 个对话、{folders} 个文件夹、{pins} 个置顶。', importBad: '这不是 ContinueChat 备份文件。',
  wipe: '删除全部本地数据', wipeConfirm: '要删除本浏览器中的全部 ContinueChat 数据吗（文件夹、置顶、搜索索引、设置、许可证）？ChatGPT 和 Claude 上的对话不受影响。',
  wiped: '已删除全部本地数据。', privacyLine: '本地存储 · 无需注册。你的对话不会离开这个浏览器。',
  secAbout: '关于', version: '版本 {v}', privacyPolicy: '隐私政策', contact: '联系我们', notAffiliated: 'ContinueChat 是独立产品，与 OpenAI、Anthropic 无关联。',
  saved: '已保存',
  printBtn: '打印 / 另存为 PDF', printExpired: '此导出已过期，请在 ContinueChat 面板中重新导出。',
};

/** Exposed for the dictionary consistency test. */
export const MESSAGES = { en, zh };
export type Lang = 'en' | 'zh';
export const detectLang = (setting: LangSetting = 'auto'): Lang =>
  setting === 'en' || setting === 'zh' ? setting : (globalThis.navigator?.language ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
let lang: Lang = 'en'; // English unless the user picks 中文 (or "Match browser") in Settings
export const getLang = () => lang;
export function setLang(setting: LangSetting) { lang = detectLang(setting); }
export async function initLang() { try { setLang((await getSettings()).lang); } catch { /* storage unavailable: keep English */ } }

export function t(k: MsgKey, v: V = {}): string {
  const m: Msg = (lang === 'zh' ? zh[k] : undefined) ?? en[k];
  return typeof m === 'function' ? m(v) : m.replace(/\{(\w+)\}/g, (_, n: string) => (n in v ? String(v[n]) : `{${n}}`));
}
const locale = () => (lang === 'zh' ? 'zh-CN' : 'en-US');
export const fmtDate = (d: Date) => d.toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
export const fmtDateTime = (d: Date) => d.toLocaleString(locale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtNum = (n: number) => n.toLocaleString(locale());
export const contextLabels = (): ContextLabels => ({ header: (n, title) => t('ctxHeader', { n, title }), footer: t('ctxFooter'), user: t('ctxUser'), ai: t('ctxAI'), trimmed: t('ctxTrimmed'), fileTruncated: t('ctxFileTrunc') });
export const exportLabels = (): ExportLabels => ({ user: t('ctxUser'), ai: t('ctxAI'), exportedWith: t('exportedWith') });
