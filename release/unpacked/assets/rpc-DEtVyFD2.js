async function n(o,e={}){const r=await chrome.runtime.sendMessage({type:o,...e});if(!r)throw new Error(`rpc ${o}: no response`);if(!r.ok)throw new Error(r.error);return r.data}export{n as r};
