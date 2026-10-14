/** Tiny async test runner: `test()` queues, `run()` executes in order and exits non-zero on failure. */
const queue: [string, () => unknown][] = [];
export const test = (name: string, fn: () => unknown) => { queue.push([name, fn]); };
export async function run() {
  let failed = 0;
  for (const [name, fn] of queue) {
    try { await fn(); console.log('PASS ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + String((e as Error)?.stack ?? e).split('\n').slice(0, 4).join('\n     ')); }
  }
  console.log(`${queue.length - failed}/${queue.length} passed`);
  if (failed) process.exitCode = 1;
}
/** Minimal chrome.storage mock (local + session) for modules that read settings/license. */
export function mockChrome() {
  const area = () => {
    let data: Record<string, unknown> = {};
    return {
      async get(keys?: string | string[] | null) { if (keys == null) return { ...data }; const ks = Array.isArray(keys) ? keys : [keys]; return Object.fromEntries(ks.filter((k) => k in data).map((k) => [k, structuredClone(data[k])])); },
      async set(v: Record<string, unknown>) { data = { ...data, ...structuredClone(v) }; },
      async remove(k: string | string[]) { for (const x of Array.isArray(k) ? k : [k]) delete data[x]; },
      async clear() { data = {}; },
    };
  };
  (globalThis as any).chrome = { storage: { local: area(), session: area(), onChanged: { addListener() {} } }, runtime: { id: 'test' } };
  return (globalThis as any).chrome;
}
