import{i as $,g as b,a as f,t as e,f as k,b as h,s as p,c as m}from"./i18n-BRvoDSri.js";import{b as w,r as u,c as L,d as E,S as g,C as S,e as x,f as T,g as O,h as M}from"./rpc-BqmUEB6o.js";import{e as t}from"./markdown-CPBta-kr.js";const c=document.getElementById("app"),v=document.getElementById("file"),d=(s,n,l="")=>{const a=c.querySelector(s);a&&(a.textContent=n,a.className="msg "+l)},y=(s,n,l,a)=>`<div class="seg" role="group" data-seg="${s}">${n.map(i=>`<button data-v="${i}" class="${i===l?"sel":""}" aria-pressed="${i===l}">${t(a(i))}</button>`).join("")}</div>`;function C(s){const n=s.validatedAt?h(new Date(s.validatedAt)):"";return{none:e("licNone"),active:e("licActive"),grace:e("licGrace",{date:n}),expired:e("licExpired"),invalid:e("licInvalid",{msg:s.message??"—"})}[s.status]}async function r(){document.documentElement.lang=b()==="zh"?"zh-CN":"en";const[s,n,l]=await Promise.all([f(),u("license:get"),u("db:stats")]),a=location.hash==="#welcome",i=chrome.runtime.getManifest().version;c.innerHTML=`<div class="row"><div class="logo" aria-hidden="true">↪</div><h1 class="sp">${t(e("settingsTitle"))}</h1><span class="pill ${n.premium?"pro":""}">${n.premium?"Pro":t(e("planFree"))}</span></div>
    ${a?`<section class="banner" style="margin-top:14px"><b>${t(e("welcomeTitle"))}</b><div style="margin-top:4px">${t(e("welcomeBody"))}</div></section>`:""}

    <section class="card"><h2>${t(e("secContinue"))}</h2>
      <div class="field"><span class="lbl">${t(e("defaultTurns"))}</span>${y("continueTurns",S,s.continueTurns,o=>o==="all"?e("all"):String(o))}</div>
      <div class="field"><label class="lbl" for="budget">${t(e("maxContext"))}<div class="help">${t(e("maxContextHelp"))}</div></label>
        <select id="budget">${x.map(o=>`<option value="${o}" ${o===s.continueBudget?"selected":""}>${t(e("nCharsFull",{n:k(o)}))}</option>`).join("")}</select></div>
    </section>

    <section class="card"><h2>${t(e("secSearch"))}</h2>
      <label class="check"><input type="checkbox" id="idx" ${s.indexOnOpen?"checked":""}><span>${t(e("indexOnOpen"))}<div class="help">${t(e("indexOnOpenHelp"))}</div></span></label>
    </section>

    <section class="card"><h2>${t(e("secLanguage"))}</h2>
      ${y("lang",["auto","en","zh"],s.lang,o=>o==="auto"?e("langAuto"):o==="en"?"English":"简体中文")}
    </section>

    <section class="card" id="license"><h2>${t(e("secPro"))}</h2>
      <div>${t(C(n))}</div>
      ${n.key?`<div class="help">${t(e("licenseKey"))}: ${t(n.key.slice(0,4))}••••${t(n.key.slice(-4))}${n.validatedAt?" · "+t(e("lastChecked",{date:h(new Date(n.validatedAt))})):""}</div>
        <div class="row wrap" style="margin-top:10px"><button id="check">${t(e("checkNow"))}</button><button id="remove" class="danger">${t(e("removeLicense"))}</button></div>`:""}
      ${n.premium?"":`<div class="row" style="margin-top:12px"><input class="txt sp" id="key" placeholder="${t(e("licenseKey"))}" autocomplete="off" spellcheck="false"><button class="pri" id="activate">${t(e("activate"))}</button></div>
        <div class="row wrap" style="margin-top:10px"><button id="buyM">${t(e("buyMonthly"))} · ${L}${t(e("perMonth"))}</button><button id="buyL">${t(e("buyLifetime"))} · ${E}</button></div>`}
      <div class="msg" id="licMsg"></div>
    </section>

    <section class="card"><h2>${t(e("secData"))}</h2>
      <div class="sm mut">${t(e("dataStats",{chats:l.conversations,full:l.withText,folders:l.folders,pins:l.pins}))}</div>
      <div class="row wrap" style="margin-top:10px"><button id="backup">${t(e("exportBackup"))}</button><button id="import">${t(e("importBackup"))}</button><span class="sp"></span><button id="wipe" class="danger">${t(e("wipe"))}</button></div>
      <div class="msg" id="dataMsg"></div>
      <div class="sm mut" style="margin-top:8px">🔒 ${t(e("privacyLine"))}</div>
    </section>

    <section class="card"><h2>${t(e("secAbout"))}</h2>
      <div class="sm">${t(e("version",{v:i}))} · <a href="../privacy.html" target="_blank">${t(e("privacyPolicy"))}</a> · ${t(e("contact"))}: <a href="mailto:${g}">${g}</a></div>
      <div class="xs mut" style="margin-top:6px">${t(e("notAffiliated"))}</div>
    </section>`,N(),location.hash==="#license"&&(c.querySelector("#license")?.scrollIntoView({block:"center"}),c.querySelector("#key")?.focus())}function N(){c.querySelectorAll("[data-seg]").forEach(a=>a.querySelectorAll("[data-v]").forEach(i=>i.onclick=async()=>{const o=i.dataset.v;a.dataset.seg==="continueTurns"?await p({continueTurns:o==="all"?"all":Number(o)}):(await p({lang:o}),m(o)),r()})),c.querySelector("#budget").onchange=a=>void p({continueBudget:Number(a.target.value)}),c.querySelector("#idx").onchange=a=>void p({indexOnOpen:a.target.checked});const s=c.querySelector("#key"),n=async()=>{const a=s.value.trim();if(!a){s.focus();return}d("#licMsg",e("verifying"));const i=await u("license:activate",{key:a});if(i.ok){await r(),d("#licMsg",e("activated"),"ok");return}d("#licMsg",e({invalid:"errInvalidKey",unavailable:"errUnavailable",network:"errNet"}[i.error??"invalid"],{msg:i.message??"—"}),"err")};c.querySelector("#activate")?.addEventListener("click",n),s?.addEventListener("keydown",a=>{a.key==="Enter"&&n()}),c.querySelector("#check")?.addEventListener("click",async a=>{a.target.disabled=!0,d("#licMsg",e("checking")),await u("license:revalidate"),await r()}),c.querySelector("#remove")?.addEventListener("click",async()=>{confirm(e("removeLicenseConfirm"))&&(await u("license:deactivate"),await r())});const l=a=>()=>{T(a)?chrome.tabs.create({url:a}):d("#licMsg",e("checkoutSoon"))};c.querySelector("#buyM")?.addEventListener("click",l(O)),c.querySelector("#buyL")?.addEventListener("click",l(M)),c.querySelector("#backup").onclick=async()=>{const a=await u("db:exportBackup"),i=document.createElement("a");i.href=URL.createObjectURL(new Blob([JSON.stringify(a,null,2)],{type:"application/json"})),i.download=`continuechat-backup-${new Date().toISOString().slice(0,10)}.json`,i.click(),setTimeout(()=>URL.revokeObjectURL(i.href),3e4)},c.querySelector("#import").onclick=()=>{v.value="",v.click()},v.onchange=async()=>{const a=v.files?.[0];if(a)try{const i=await u("db:importBackup",{data:JSON.parse(await a.text())});await r(),d("#dataMsg",e("importDone",{chats:i.conversations,folders:i.folders,pins:i.pins}),"ok")}catch{d("#dataMsg",e("importBad"),"err")}},c.querySelector("#wipe").onclick=async()=>{confirm(e("wipeConfirm"))&&(await u("db:wipeAll"),m("auto"),await r(),d("#dataMsg",e("wiped"),"ok"))}}chrome.storage.onChanged.addListener((s,n)=>{n==="local"&&(s[w]||s.license)&&!c.contains(document.activeElement)&&r()});window.addEventListener("hashchange",()=>void r());$().then(r);
