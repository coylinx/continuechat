import { REVALIDATE_EVERY_DAYS } from '../shared/config';
import { activate, getLicense, revalidate, setLicense } from '../shared/license';
import type { Msg } from '../shared/types';
const ALARM = 'license-revalidate';
chrome.runtime.onInstalled.addListener(() => chrome.alarms.create(ALARM, { periodInMinutes: REVALIDATE_EVERY_DAYS * 24 * 60 }));
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) void revalidate(); });
chrome.runtime.onMessage.addListener((msg: Msg, _s, reply) => {
  (async () => {
    if (msg.type === 'license:activate') return activate(msg.key.trim());
    if (msg.type === 'license:get') return getLicense();
    if (msg.type === 'license:deactivateLocal') { await setLicense({ status: 'none' }); return getLicense(); }
  })().then(reply);
  return true;
});
