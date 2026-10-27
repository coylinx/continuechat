// Visual language follows claude.ai (Oct 2026): neutral surfaces, hairline borders, 8px radii, black/white primary
// buttons, sentence-case labels, line icons. Colour is reserved for state (focus, Pro, errors).
export const CSS = `
:host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}
.cc{--bg:#fff;--pop:#fff;--fg:#000000e6;--fg2:#0009;--mut:#0007;--line:#00000014;--line2:#0000001f;--strong:#0000003d;
 --pri:#191919;--prifg:#fff;--prihover:#3c3c3c;--sec:#0000000d;--sechover:#00000017;--ghost:#0000000d;--ghostsel:#0000001a;
 --ring:#257de0;--pro:#5437b8;--probg:#785ee81f;--err:#c63637;--errbg:#dc3c3d14;--ok:#0e7a1c;--warn:#8a5a00;--warnbg:#fbb3151f;--mark:#fbb31559;
 --shadow:0 0 0 .5px #0000001f,0 2px 6px -2px #00000014,0 16px 40px -12px #00000033;--shadow-sm:0 0 0 .5px #00000024,0 1px 3px #00000014;
 font:14px/1.5 "anthropic-sans","OpenAI Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
 color:var(--fg);-webkit-font-smoothing:antialiased;letter-spacing:normal}
.cc.dark{--bg:#1f1f1f;--pop:#2a2a2a;--fg:#ffffffed;--fg2:#ffffff91;--mut:#fff6;--line:#ffffff0f;--line2:#ffffff1f;--strong:#ffffff47;
 --pri:#efefef;--prifg:#191919;--prihover:#d7d7d7;--sec:#ffffff17;--sechover:#ffffff24;--ghost:#ffffff13;--ghostsel:#ffffff26;
 --ring:#338ced;--pro:#b8abf7;--probg:#785ee833;--err:#f17778;--errbg:#dc3c3d24;--ok:#53c556;--warn:#e9a93a;--warnbg:#fbb31517;--mark:#fbb31547;
 --shadow:0 0 0 .5px #ffffff24,0 2px 8px -2px #00000066,0 18px 44px -10px #000000b3;--shadow-sm:0 0 0 .5px #ffffff26,0 1px 3px #0006}
.row{display:flex;align-items:center;gap:8px}.wrap{flex-wrap:wrap}.sp{flex:1;min-width:0}.mut{color:var(--mut)}.sm{font-size:12px}
.ell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
svg.i{width:16px;height:16px;flex:none}
.pill{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:6px;font-size:12px;font-weight:500;white-space:nowrap;background:var(--sec);color:var(--fg2)}
.pill.pro{background:var(--probg);color:var(--pro)}
.tag{flex:none;font-size:11px;line-height:18px;padding:0 6px;border-radius:5px;background:var(--sec);color:var(--fg2)}
input.search,input.txt{width:100%;height:34px;border:.5px solid var(--line2);background:transparent;color:var(--fg);border-radius:8px;padding:0 10px;font:inherit;outline:none}
input.search::placeholder,input.txt::placeholder{color:var(--mut)}
input.search:focus,input.txt:focus{border-color:var(--strong)}
input.txt{margin:12px 0 4px}
input[type=checkbox]{accent-color:var(--pri);margin:0;flex:none;width:15px;height:15px}
button{font:inherit;font-weight:450;cursor:pointer;border:none;border-radius:8px;background:var(--sec);color:var(--fg);height:32px;padding:0 12px;
 display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;transition:background-color .12s}
button:hover{background:var(--sechover)}button:disabled{opacity:.5;cursor:default}
button.pri{background:var(--pri);color:var(--prifg);font-weight:500}button.pri:hover{background:var(--prihover)}
button.ghost{background:none;color:var(--fg2)}button.ghost:hover{background:var(--ghost);color:var(--fg)}
button.icon{width:28px;height:28px;padding:0}
button.sm{height:28px;padding:0 9px;font-size:13px}
button.on{background:var(--ghostsel);color:var(--fg)}
button.link{height:auto;padding:0;background:none;color:inherit;font-size:inherit;text-decoration:underline;text-decoration-color:var(--strong);text-underline-offset:2px}
button.link:hover{background:none;text-decoration-color:currentColor}
button.danger{color:var(--err)}button.pri.danger{background:var(--err);color:#fff}
:focus-visible{outline:2px solid var(--ring);outline-offset:1px}

/* ---------- launcher ---------- */
.launcher{position:fixed;right:20px;bottom:var(--cc-bottom,112px);width:50px;height:50px;padding:0;border-radius:15px;background:var(--pri);color:var(--prifg);
 box-shadow:var(--shadow);z-index:2147483645;touch-action:none}
.launcher:hover{background:var(--prihover);color:var(--prifg)}.launcher.drag{cursor:grabbing}
.launcher svg{width:28px;height:28px}
.launcher .ldot{position:absolute;top:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:var(--ring);border:2px solid var(--bg)}
.tip{position:fixed;right:80px;bottom:calc(var(--cc-bottom,112px) + 10px);max-width:250px;display:flex;align-items:center;gap:4px;background:var(--pri);color:var(--prifg);
 font-size:13px;border-radius:8px;padding:6px 6px 6px 10px;box-shadow:var(--shadow);z-index:2147483645;animation:ccin .16s ease-out}
.tip button{color:var(--prifg);opacity:.7;width:22px;height:22px}.tip button:hover{background:none;opacity:1}

/* ---------- "Continue in …" on the message box ---------- */
.cbtn{position:fixed;z-index:2147483644;height:28px;padding:0 10px 0 8px;gap:5px;border-radius:8px;background:var(--pop);color:var(--fg);
 font-size:13px;font-weight:500;box-shadow:var(--shadow-sm);animation:ccin .16s ease-out}
.cbtn:hover{background:var(--pop);color:var(--fg2)}.cbtn svg{width:14px;height:14px}

/* ---------- drawer ---------- */
.drawer{position:fixed;top:8px;right:8px;bottom:8px;width:min(360px,calc(100vw - 16px));background:var(--bg);color:var(--fg);border-radius:12px;
 box-shadow:var(--shadow);display:flex;flex-direction:column;z-index:2147483646;transform:translateX(calc(100% + 16px));visibility:hidden;
 transition:transform .2s cubic-bezier(.2,.8,.2,1),visibility 0s .2s}
.drawer.open{transform:none;visibility:visible;transition:transform .2s cubic-bezier(.2,.8,.2,1)}
@media (prefers-reduced-motion:reduce){.drawer,.drawer.open{transition:none}}
.dhead{display:flex;align-items:center;gap:4px;height:52px;padding:0 10px 0 16px;flex:none}
.logo{width:20px;height:20px;color:var(--fg);flex:none;margin-right:4px}.logo svg{width:20px;height:20px;display:block}
.brand{font-weight:580;font-size:15px;margin-right:4px}
.dbody{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:0 16px 16px}
.dfoot{border-top:.5px solid var(--line2);padding:12px 16px 12px;display:grid;gap:6px;flex:none}
.card{padding:4px 0 16px;border-bottom:.5px solid var(--line2);margin-bottom:12px}
.lbl{font-size:12px;font-weight:500;color:var(--mut)}
.ctitle{font-weight:500;margin:2px 0 12px}
.cta{width:100%;height:36px}.cta svg{width:15px;height:15px}
.explain{font-size:12px;color:var(--mut);margin:8px 0 10px}
.acts{display:flex;gap:2px;margin:0 -8px}.acts button{height:28px;padding:0 8px;font-size:13px}.acts button.on{background:none;color:var(--fg)}.acts button.on:hover{background:var(--ghost)}
.nochat{display:flex;gap:10px;align-items:flex-start;color:var(--fg2)}.nochat svg{width:18px;height:18px;margin-top:2px;color:var(--mut)}.nochat b{color:var(--fg);font-weight:500}
.onb{border:.5px solid var(--line2);border-radius:10px;padding:12px 14px;margin:4px 0 14px}
.onb h3{margin:0 0 8px;font-size:14px;font-weight:580}
.onb ol{margin:0;padding:0 0 0 18px;display:grid;gap:5px;font-size:13px;color:var(--fg2)}.onb li::marker{color:var(--mut)}
.onb p{margin:8px 0 10px;font-size:12px;color:var(--mut)}
.sfield{position:relative}.sfield svg{position:absolute;left:10px;top:9px;color:var(--mut);pointer-events:none}.sfield input{padding-left:32px}
.body{margin:0 -8px}
.sec{margin:16px 8px 4px;font-size:12px;font-weight:500;color:var(--mut)}.sec button{color:var(--mut)}
.irow{display:flex;align-items:center;border-radius:8px}.irow:hover{background:var(--ghost)}
.item{display:flex;align-items:center;justify-content:flex-start;gap:8px;height:auto;min-height:32px;padding:5px 8px;border-radius:8px;cursor:pointer;color:inherit;text-decoration:none;
 min-width:0;flex:1;text-align:left;border:none;background:none;font:inherit;font-weight:400}
a.item:hover,button.item:hover,label.item:hover{background:var(--ghost)}.irow .item:hover{background:none}
.item svg{color:var(--mut)}
.x{opacity:0;flex:none;width:24px!important;height:24px!important;margin-right:4px}.x svg{width:14px;height:14px}
.irow:hover .x,.irow:focus-within .x{opacity:1}@media (hover:none){.x{opacity:.6}}
.car{display:flex;color:var(--mut)}.car svg{width:14px;height:14px}.sub{padding-left:22px}.unavail{color:var(--mut);font-style:italic}
.res{flex-direction:column;align-items:stretch;gap:1px}.snip{font-size:12px;color:var(--mut);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal}
mark{background:var(--mark);color:inherit;border-radius:3px;padding:0 1px}
.empty{padding:4px 8px;font-size:13px}.hint{padding:6px 0;color:var(--mut);font-size:12px}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}
.chip{display:inline-flex;align-items:center;gap:5px;height:24px;border-radius:6px;padding:0 8px;font-size:12px;max-width:100%;background:var(--sec);color:var(--fg2)}
.chip svg{width:13px;height:13px}
.quota{display:flex;align-items:center;gap:10px;font-size:13px;line-height:1.4;color:var(--fg2)}
.qinfo{font-size:12px;color:var(--mut)}
.status{display:flex;align-items:center;gap:2px;font-size:12px;color:var(--mut);margin:0 -8px 0 0}.status button{height:26px;padding:0 7px;font-size:12px;color:var(--mut)}
.status button svg{width:13px;height:13px}.status .fail{color:var(--err)}

/* ---------- dialogs (layer) ---------- */
.seg{display:flex;background:var(--sec);border-radius:9px;padding:2px;gap:2px}.seg button{flex:1;height:28px;background:none;padding:0 4px;color:var(--fg2)}
.seg button:hover{color:var(--fg)}.seg button.sel{background:var(--bg);color:var(--fg);box-shadow:var(--shadow-sm);font-weight:500}
.cc.dark .seg button.sel{background:var(--ghostsel);box-shadow:none}
.ov{position:fixed;inset:0;background:#00000059;display:grid;place-items:center;z-index:2147483647;padding:16px}
.dlg{width:min(480px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--bg);color:var(--fg);border-radius:14px;padding:20px;box-shadow:var(--shadow)}
.dlg h2{font-size:17px;margin:0;font-weight:580}.dlg p{margin:6px 0}
.dlg .sec{margin:16px 0 6px}
.info{display:flex;gap:8px;align-items:flex-start;background:var(--sec);color:var(--fg2);border-radius:8px;padding:8px 10px;margin:10px 0;font-size:12px}
.warn{background:var(--warnbg);color:var(--warn);border-radius:8px;padding:10px 12px;margin:10px 0;font-size:12px}
.warn button{height:28px;font-size:12px;margin:8px 6px 0 0;background:var(--bg);color:var(--fg);box-shadow:var(--shadow-sm)}
.info svg,.warn svg{width:14px;height:14px;margin-top:1px}
.wtxt{color:var(--warn)}
.plat{flex:1;border-radius:10px;padding:9px 12px;box-shadow:inset 0 0 0 .5px var(--line2)}.plat.on{box-shadow:inset 0 0 0 1.5px var(--fg)}.plat.off{opacity:.45}
.plat b{font-weight:500}
pre.prev{white-space:pre-wrap;word-break:break-word;background:var(--sec);border-radius:8px;padding:10px 12px;max-height:120px;overflow:auto;
 font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--fg2);margin:0 0 6px}
pre.prev.full{max-height:300px}
.opt{display:block;width:100%;height:auto;text-align:left;border-radius:10px;padding:10px 12px;margin:6px 0;background:none;color:var(--fg);box-shadow:inset 0 0 0 .5px var(--line2)}
.opt:hover{background:var(--ghost)}.opt.on{box-shadow:inset 0 0 0 1.5px var(--fg)}.opt b{font-weight:500}
.opt.row{display:flex}
.list{max-height:300px;overflow:auto;margin:8px 0 12px;border-radius:10px;padding:4px;box-shadow:inset 0 0 0 .5px var(--line2)}
.price{flex:1;display:block;height:auto;border-radius:10px;padding:10px 12px;text-align:left;background:none;color:var(--fg);box-shadow:inset 0 0 0 .5px var(--line2)}
.price:hover{background:var(--ghost)}.price.on{box-shadow:inset 0 0 0 1.5px var(--fg)}.price b{font-weight:580}
ul.chk{list-style:none;padding:0;margin:12px 0 14px;display:grid;gap:6px;font-size:13px;color:var(--fg2)}ul.chk li{display:flex;gap:8px;align-items:center}ul.chk svg{color:var(--fg)}
@keyframes ccspin{to{transform:rotate(360deg)}}.spin{display:inline-flex;animation:ccspin .8s linear infinite}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.loading{display:flex;align-items:center;gap:8px;justify-content:center;padding:20px 0;color:var(--mut)}
.done{text-align:center;padding:12px 0 18px}.done .big{width:40px;height:40px;border-radius:50%;background:var(--sec);display:grid;place-items:center;margin:0 auto 12px}
.done .big svg{width:20px;height:20px}
.toasts{position:fixed;left:50%;top:64px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;z-index:2147483647;width:max-content;max-width:calc(100vw - 32px)}
.toast{display:flex;align-items:center;gap:10px;background:var(--pop);color:var(--fg);border-radius:10px;padding:8px 8px 8px 12px;box-shadow:var(--shadow);max-width:520px;font-size:13px;animation:ccin .16s ease-out}
.toast .ti{display:flex;color:var(--fg2)}.toast.ok .ti{color:var(--ok)}.toast.err .ti{color:var(--err)}
.toast button{height:28px;padding:0 10px;font-size:13px}.toast button.icon{width:26px;height:26px;padding:0}
@keyframes ccin{from{opacity:0;transform:translateY(-4px)}}
`;

/** The ContinueChat mark: a speech bubble with an arrow, drawn in lines like the other icons. */
export const MARK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 4.5h9a3.5 3.5 0 0 1 3.5 3.5v5.5a3.5 3.5 0 0 1-3.5 3.5H11l-4.2 3.3c-.4.3-.9 0-.9-.4V17A3.5 3.5 0 0 1 4 13.5V8a3.5 3.5 0 0 1 3.5-3.5z"/><path d="M8.5 10.75h6.5m-2.4-2.5 2.5 2.5-2.5 2.5"/></svg>`;
