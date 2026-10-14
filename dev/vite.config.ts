// Dev harness server: `npm run dev` → http://localhost:5179/chatgpt/ (or /claude/new).
// Runs the REAL panel/popup/options/print code against mocked chrome.* APIs and fixture chats.
// Nothing here talks to chatgpt.com or claude.ai.
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(__dirname, '..');
export default defineConfig({
  root, appType: 'mpa', publicDir: false,
  server: { port: 5179, strictPort: true },
  plugins: [{
    name: 'cc-dev-routes',
    configureServer(s) {
      s.middlewares.use(async (req, res, next) => {
        // Fake site routes (/chatgpt/c/<id>, /claude/chat/<id>, …) all serve the fake site shell.
        if (req.url && /^\/(chatgpt|claude)(\/|\?|$)/.test(req.url)) { req.url = '/dev/site.html'; return next(); }
        // Extension pages: the real HTML, with the chrome.* mock loaded before the page script.
        const m = req.url?.match(/^\/dev\/(popup|options|print)\.html/);
        if (!m) return next();
        const html = readFileSync(resolve(root, `src/${m[1]}/index.html`), 'utf8').replace('../ui/page.css', '/src/ui/page.css')
          .replace('<script type="module" src="./main.ts"></script>', `<script type="module" src="/dev/mock-chrome.ts"></script><script type="module" src="/src/${m[1]}/main.ts"></script>`);
        res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(await s.transformIndexHtml(req.url!, html));
      });
    },
  }],
});
