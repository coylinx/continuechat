"""Builds privacy.html + worker.js from the PRD draft. Publishes ONLY the English body above the first standalone '---'."""
import html, json, re, sys
SRC = '/workspace/prd/ContinueChat-隐私政策-初稿.md'
PUBLISH_DATE = 'October 14, 2026'
lines = open(SRC, encoding='utf-8').read().splitlines()
body = lines[:next(i for i, l in enumerate(lines) if l.strip() == '---')]
def inline(t):
    t = html.escape(t)
    t = re.sub(r'(https?://[^\s<]+?)(?=[.,]?(\s|$))', r'<a href="\1">\1</a>', t)
    return re.sub(r'\b([\w.+-]+@[\w-]+\.[\w.]+)\b', r'<a href="mailto:\1">\1</a>', t)
out, para = [], []
flush = lambda: (out.append(f'<p>{inline(" ".join(para))}</p>'), para.clear()) if para else None
for l in body:
    l = l.replace('[DATE]', PUBLISH_DATE)
    if l.startswith('# '): flush(); out.append(f'<h1>{inline(l[2:].replace(" (Draft)", ""))}</h1>')
    elif l.startswith('## '): flush(); out.append(f'<h2>{inline(l[3:])}</h2>')
    elif l.startswith('Last updated:'): flush(); out.append(f'<p class="meta">{inline(l)}</p>')
    elif not l.strip(): flush()
    else: para.append(l.strip())
flush()
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ContinueChat Privacy Policy</title><meta name="description" content="Privacy policy for the ContinueChat browser extension.">
<style>:root{{color-scheme:light dark}}body{{font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;max-width:720px;margin:0 auto;padding:32px 20px 64px;color:#1a1a1a;background:#fff}}
h1{{font-size:28px;line-height:1.25;margin:0 0 4px}}h2{{font-size:19px;margin:32px 0 6px}}.meta{{color:#6b6b6b;font-size:14px;margin-top:0}}a{{color:#2b59c3;word-break:break-word}}
@media (prefers-color-scheme:dark){{body{{background:#161616;color:#e8e8e8}}.meta{{color:#9a9a9a}}a{{color:#8fb0ff}}}}</style></head>
<body><main>{"".join(out)}</main></body></html>'''
assert not re.search(r'[\u4e00-\u9fff]', page), 'Chinese text leaked into published page'
open('privacy.html', 'w', encoding='utf-8').write(page)
worker = f'''const PAGE = {json.dumps(page)};
export default {{ async fetch(req) {{
  const u = new URL(req.url);
  if (u.pathname === '/' ) return Response.redirect(u.origin + '/privacy', 301);
  if (u.pathname === '/privacy' || u.pathname === '/privacy/') return new Response(PAGE, {{ headers: {{ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' }} }});
  return new Response('Not found', {{ status: 404 }});
}} }};
'''
open('worker.js', 'w', encoding='utf-8').write(worker)
print('ok', len(page))
