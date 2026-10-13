export const CSS = `
:host{all:initial}*{box-sizing:border-box}
.cc{--bg:#fff;--fg:#1a1a1a;--mut:#6b6b6b;--line:#0000001a;--soft:#f3f3f3;--acc:#1a1a1a;--accfg:#fff;--warnbg:#fff8e6;--warnfg:#8a5a00;--warnline:#f0d38a;
 font:13px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--fg)}
.cc.dark{--bg:#1f1f1f;--fg:#ececec;--mut:#9a9a9a;--line:#ffffff1f;--soft:#2a2a2a;--acc:#ececec;--accfg:#111;--warnbg:#3a2f12;--warnfg:#f3c969;--warnline:#6b5420}
.card{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px;margin:8px}
.row{display:flex;align-items:center;gap:8px}.sp{flex:1}.mut{color:var(--mut)}.sm{font-size:11px}
.brand{font-weight:600;font-size:14px}.logo{width:20px;height:20px;border-radius:6px;background:var(--acc);color:var(--accfg);display:grid;place-items:center;font-size:12px}
.pill{border:1px solid var(--line);border-radius:999px;padding:1px 8px;font-size:11px}
input.search,input.txt{width:100%;border:1px solid var(--line);background:var(--soft);color:var(--fg);border-radius:10px;padding:7px 10px;font:inherit;margin:8px 0}
.sec{margin-top:8px;font-size:11px;color:var(--mut)}
.item{padding:5px 6px;border-radius:8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.item:hover{background:var(--soft)}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:6px 10px}
button.pri{background:var(--acc);color:var(--accfg);border-color:var(--acc)}button.ghost{border:none;background:none;padding:2px 6px}
button.sel{background:var(--bg);box-shadow:0 1px 3px #0002;font-weight:600}
.seg{display:flex;background:var(--soft);border-radius:10px;padding:3px;gap:2px}.seg button{flex:1;border:none;background:none}
.ov{position:fixed;inset:0;background:#0006;display:grid;place-items:center;z-index:2147483647}
.dlg{width:min(420px,92vw);max-height:90vh;overflow:auto;background:var(--bg);color:var(--fg);border-radius:16px;padding:18px;box-shadow:0 10px 40px #0004}
.dlg h2{font-size:18px;margin:0}.info{background:var(--soft);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px}
.warn{background:var(--warnbg);color:var(--warnfg);border:1px solid var(--warnline);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px}
.warn button{border-color:var(--warnline);background:transparent;color:var(--warnfg);margin:6px 6px 0 0}
.wtxt{color:var(--warnfg)}
.plat{flex:1;border:1px solid var(--line);border-radius:12px;padding:10px}.plat.on{border:2px solid var(--fg)}.plat.off{opacity:.5}
.chip{display:inline-flex;gap:4px;border:1px solid var(--line);border-radius:8px;padding:3px 8px;margin:3px 4px 0 0;font-size:12px}
pre.prev{white-space:pre-wrap;border:1px solid var(--line);border-radius:10px;padding:8px;max-height:110px;overflow:auto;font:12px/1.4 inherit;color:var(--mut);margin:4px 0}
.opt{border:1px solid var(--line);border-radius:12px;padding:10px;margin:6px 0;cursor:pointer}.opt.on{border:2px solid var(--fg)}
.price{flex:1;border:1px solid var(--line);border-radius:12px;padding:10px;cursor:pointer}.price.on{border:2px solid var(--fg)}
ul.chk{list-style:none;padding:0;margin:8px 0}ul.chk li:before{content:"✓  "}
`;
