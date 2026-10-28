/**
 * ContinueChat license proxy (Cloudflare Worker). Keeps CREEM_API_KEY server-side.
 * Creem docs (checked 2026-10-13, docs.creem.io/api-reference/endpoint/*-license):
 *   POST {base}/v1/licenses/activate  body {key, instance_name}  header x-api-key
 *   POST {base}/v1/licenses/validate  body {key, instance_id}    header x-api-key
 *   POST {base}/v1/licenses/deactivate body {key, instance_id}   header x-api-key (frees the activation slot)
 * Response has `status` (e.g. "active") and `instance` object with `id`; exact field names UNVERIFIED against live sandbox.
 */
export interface Env { CREEM_API_KEY?: string; CREEM_API_BASE: string; ALLOWED_EXTENSION_IDS: string; }

function cors(origin: string | null, env: Env): Record<string, string> {
  if (!origin?.startsWith('chrome-extension://')) return {};
  const ids = env.ALLOWED_EXTENSION_IDS.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length && !ids.includes(origin.slice('chrome-extension://'.length))) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
}
const json = (b: unknown, status: number, h: Record<string, string>) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', ...h } });

type CreemData = { status?: string | number; instance?: { id?: string }; message?: string | string[]; error?: string; trace_id?: string; raw?: string };
async function creem(env: Env, path: string, body: object) {
  const r = await fetch(`${env.CREEM_API_BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.CREEM_API_KEY ?? '' }, body: JSON.stringify(body) });
  const text = await r.text();
  let data: CreemData; try { data = JSON.parse(text) as CreemData; } catch { data = { raw: text.slice(0, 200) }; }
  return { status: r.status, data };
}
/** Creem errors look like {status: 400, error: "Bad Request", message: ["…"], trace_id}; pass the reason through so the UI can show it. */
const why = (s: number, d: CreemData) => {
  const m = Array.isArray(d.message) ? d.message.join('; ') : d.message;
  return `${m || d.error || d.raw || 'error'} (creem ${s}${d.trace_id ? ' · ' + d.trace_id.slice(0, 8) : ''})`;
};
const licStatus = (d: CreemData) => (typeof d.status === 'string' ? d.status : undefined);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const path0 = new URL(req.url).pathname;
    if (req.method === 'GET' && path0 === '/health') return json({ ok: true, configured: !!env.CREEM_API_KEY, base: env.CREEM_API_BASE }, 200, {});
    const h = cors(req.headers.get('origin'), env);
    if (!h['access-control-allow-origin']) return json({ error: 'forbidden origin' }, 403, {});
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    if (!env.CREEM_API_KEY) return json({ error: 'license service not configured' }, 503, h);
    const path = new URL(req.url).pathname;
    const b = (await req.json().catch(() => ({}))) as { key?: string; instanceId?: string; instanceName?: string };
    if (!b.key || b.key.length > 200) return json({ error: 'key required' }, 400, h);
    try {
      if (path === '/activate') {
        const { status, data } = await creem(env, '/v1/licenses/activate', { key: b.key, instance_name: (b.instanceName ?? 'continuechat').slice(0, 64) });
        return json({ valid: status < 300 && data.status === 'active', instanceId: data.instance?.id, status: licStatus(data), error: status >= 300 ? why(status, data) : undefined }, 200, h);
      }
      if (path === '/validate') {
        if (!b.instanceId) return json({ error: 'instanceId required' }, 400, h);
        const { status, data } = await creem(env, '/v1/licenses/validate', { key: b.key, instance_id: b.instanceId });
        if (status >= 500) return json({ error: 'upstream' }, 502, h); // client treats as offline -> grace
        return json({ valid: status < 300 && data.status === 'active', status: licStatus(data) }, 200, h);
      }
      if (path === '/deactivate') {
        if (!b.instanceId) return json({ error: 'instanceId required' }, 400, h);
        const { status, data } = await creem(env, '/v1/licenses/deactivate', { key: b.key, instance_id: b.instanceId });
        return json({ ok: status < 300, status: licStatus(data), error: status >= 300 ? why(status, data) : undefined }, status >= 500 ? 502 : 200, h);
      }
      return json({ error: 'not found' }, 404, h);
    } catch { return json({ error: 'upstream' }, 502, h); }
  },
};
