export const CSS = `
:host{all:initial}*{box-sizing:border-box}
.cc{--bg:#fff;--fg:#1a1a1a;--mut:#6b6b6b;--line:#0000001a;--soft:#f3f3f3;--hover:#0000000d;--acc:#1a1a1a;--accfg:#fff;--warnbg:#fff8e6;--warnfg:#8a5a00;--warnline:#f0d38a;
 --err:#d93025;--okfg:#1e7e34;--mark:#ffe58a;--markfg:inherit;--ring:#2b59c3;--shadow:0 10px 40px #00000040;
 font:13px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:var(--fg);-webkit-font-smoothing:antialiased}
.cc.dark{--bg:#1f1f1f;--fg:#ececec;--mut:#9a9a9a;--line:#ffffff1f;--soft:#2a2a2a;--hover:#ffffff12;--acc:#ececec;--accfg:#111;--warnbg:#3a2f12;--warnfg:#f3c969;--warnline:#6b5420;
 --err:#ff7b72;--okfg:#7ee2a8;--mark:#6b5420;--markfg:#fff3c4;--ring:#8fb0ff;--shadow:0 10px 40px #000000a0}
.card{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px;margin:8px}
.floating .card{margin:0;box-shadow:0 8px 28px #0000002e}
.row{display:flex;align-items:center;gap:8px}.wrap{flex-wrap:wrap}.sp{flex:1;min-width:0}.mut{color:var(--mut)}.sm{font-size:11px}
.ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.brand{font-weight:600;font-size:14px}.logo{width:20px;height:20px;border-radius:6px;background:var(--acc);color:var(--accfg);display:grid;place-items:center;font-size:12px;flex:none}
.pill{border:1px solid var(--line);border-radius:999px;padding:1px 8px;font-size:11px;white-space:nowrap}.pill.pro{background:var(--acc);color:var(--accfg);border-color:var(--acc)}
.tag{flex:none;font-size:10px;color:var(--mut);border:1px solid var(--line);border-radius:6px;padding:0 5px}
input.search,input.txt{width:100%;border:1px solid var(--line);background:var(--soft);color:var(--fg);border-radius:10px;padding:7px 10px;font:inherit;margin:8px 0;outline:none}
input.search:focus,input.txt:focus{border-color:var(--ring)}
input[type=checkbox]{accent-color:var(--acc);margin:0;flex:none}
.body{max-height:min(46vh,440px);overflow-y:auto;overscroll-behavior:contain;margin:0 -4px;padding:0 4px}
.sec{margin-top:10px;font-size:11px;color:var(--mut)}.sec button{color:var(--mut)}
.irow{display:flex;align-items:center;border-radius:8px}.irow:hover{background:var(--hover)}
.item{display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:8px;cursor:pointer;color:inherit;text-decoration:none;min-width:0;flex:1;text-align:left;border:none;background:none;font:inherit}
a.item:hover,button.item:hover,label.item:hover{background:var(--hover)}.irow .item:hover{background:none}
.x{opacity:0;flex:none}.irow:hover .x,.irow:focus-within .x{opacity:1}@media (hover:none){.x{opacity:.6}}
.car{width:10px;flex:none;color:var(--mut)}.sub{padding-left:16px}.unavail{color:var(--mut);font-style:italic}
.res{flex-direction:column;align-items:stretch;gap:2px}.snip{font-size:11px;color:var(--mut);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}
mark{background:var(--mark);color:var(--markfg);border-radius:2px;padding:0 1px}
.empty{padding:6px}.hint{padding:6px 2px;color:var(--mut);font-size:12px}
.cur{margin-top:2px}.cur .row+.row{margin-top:6px}.cur button{flex:1}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--line);border-radius:8px;padding:2px 8px;font-size:12px;max-width:100%}
.foot{margin-top:8px}.lock{margin-top:6px}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg);padding:6px 10px;white-space:nowrap}
button:hover{background:var(--hover)}button:disabled{opacity:.55;cursor:default}
button.pri{background:var(--acc);color:var(--accfg);border-color:var(--acc)}button.pri:hover{opacity:.9;background:var(--acc)}
button.ghost{border:none;background:none;padding:2px 6px}button.ghost:hover{background:var(--hover)}
button.icon{padding:2px 6px;line-height:1}button.on{border-color:var(--fg)}
button.danger{color:var(--err);border-color:var(--err)}button.pri.danger{background:var(--err);border-color:var(--err);color:#fff}
button.sel{background:var(--bg);box-shadow:0 1px 3px #0002;font-weight:600}
:focus-visible{outline:2px solid var(--ring);outline-offset:1px}
.seg{display:flex;background:var(--soft);border-radius:10px;padding:3px;gap:2px}.seg button{flex:1;border:none;background:none;padding:5px 4px}.seg button.sel{background:var(--bg)}
.ov{position:fixed;inset:0;background:#0006;display:grid;place-items:center;z-index:2147483647;padding:16px}
.dlg{width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--bg);color:var(--fg);border-radius:16px;padding:18px;box-shadow:var(--shadow);border:1px solid var(--line)}
.dlg h2{font-size:18px;margin:0;font-weight:600}.dlg p{margin:8px 0}
.info{background:var(--soft);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px}
.warn{background:var(--warnbg);color:var(--warnfg);border:1px solid var(--warnline);border-radius:10px;padding:8px 10px;margin:8px 0;font-size:12px}
.warn button{border-color:var(--warnline);background:transparent;color:var(--warnfg);margin:6px 6px 0 0}
.wtxt{color:var(--warnfg)}
.plat{flex:1;border:1px solid var(--line);border-radius:12px;padding:10px}.plat.on{border:2px solid var(--fg)}.plat.off{opacity:.5}
pre.prev{white-space:pre-wrap;word-break:break-word;border:1px solid var(--line);border-radius:10px;padding:8px;max-height:110px;overflow:auto;font:12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--mut);margin:4px 0}
pre.prev.full{max-height:300px}
.opt{display:block;width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;padding:10px;margin:6px 0;cursor:pointer;background:var(--bg);color:var(--fg)}.opt.on{border:2px solid var(--fg);padding:9px}
.opt.row{display:flex}
.list{max-height:300px;overflow:auto;margin:8px 0;border:1px solid var(--line);border-radius:12px;padding:4px}
.price{flex:1;border:1px solid var(--line);border-radius:12px;padding:10px;cursor:pointer;text-align:left;background:var(--bg);color:var(--fg)}.price.on{border:2px solid var(--fg);padding:9px}
ul.chk{list-style:none;padding:0;margin:8px 0}ul.chk li{margin:3px 0}ul.chk li:before{content:"✓  ";font-weight:600}
@keyframes ccspin{to{transform:rotate(360deg)}}.spin{display:inline-block;animation:ccspin .8s linear infinite}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.loading{display:flex;align-items:center;gap:8px;justify-content:center;padding:18px 0;color:var(--mut)}
.stline{font-size:11px;margin-top:4px;transition:opacity .4s;color:var(--mut)}.stline.gone{opacity:0}
.stline.fail{color:var(--err)}.stline.fail a{color:inherit;font-weight:600}
.done{text-align:center;padding:18px 0}.done .big{font-size:28px}
.toasts{position:fixed;left:50%;top:64px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;z-index:2147483647;width:max-content;max-width:calc(100vw - 32px)}
.toast{display:flex;align-items:center;gap:10px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:12px;padding:10px 12px;box-shadow:var(--shadow);max-width:520px;animation:ccin .18s ease-out}
.toast.err{border-color:var(--err)}.toast.ok .ti{color:var(--okfg)}.toast.err .ti{color:var(--err)}
.toast button{padding:4px 10px}
@keyframes ccin{from{opacity:0;transform:translateY(-6px)}}
`;
