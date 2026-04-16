let machineId = null;
let activeTabInfo = { id: null, url: null, startTime: null };
let logBuffer = [];
let sessionId = crypto.randomUUID();
let focusLossCount = 0;

async function initialize() {
  const data = await chrome.storage.local.get(['machineId']);
  if (!data.machineId) {
    machineId = crypto.randomUUID();
    await chrome.storage.local.set({ machineId });
  } else {
    machineId = data.machineId;
  }
  updateBadge();
}

async function getAdminUrl() {
  const data = await chrome.storage.local.get(['adminUrl', 'loggingEnabled']);
  if (data.loggingEnabled === false) return null;
  return data.adminUrl ? data.adminUrl.replace(/\/+$/, '') + '/log' : null;
}

function sendLog(event, url, severity, duration = null) {
  const payload = {
    event: event,
    url: url || '',
    timestamp: new Date().toISOString(),
    severity: severity,
    session_id: sessionId,
    focus_loss_count: focusLossCount
  };

  if (duration !== null) {
    payload.duration_ms = duration;
  }

  logBuffer.push(payload);
}

setInterval(async () => {
  if (logBuffer.length === 0) return;
  
  const adminUrl = await getAdminUrl();
  if (!adminUrl || !machineId) return;

  const batch = [...logBuffer]; 
  logBuffer = [];

  for (const log of batch) {
    log.machine_id = machineId;
    try {
      await fetch(adminUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
        keepalive: true
      });
    } catch (e) {
      logBuffer.unshift(log);
    }
  }
}, 3000);

async function updateBadge() {
  const data = await chrome.storage.local.get(['loggingEnabled']);
  const enabled = data.loggingEnabled !== false;
  
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#3fb950' : '#ff7b72' });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.loggingEnabled) {
    updateBadge();
  }
});

function recordTimeSpent() {
  const now = Date.now();
  if (activeTabInfo.id !== null && activeTabInfo.startTime !== null) {
    const timeSpent = now - activeTabInfo.startTime;
    if (timeSpent > 0 && activeTabInfo.url) {
      sendLog('time_spent', activeTabInfo.url, 'low', timeSpent);
    }
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    recordTimeSpent();
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const url = tab.url || tab.pendingUrl;
    activeTabInfo = { id: activeInfo.tabId, url: url, startTime: Date.now() };
    if (url) {
      sendLog('tab_switch', url, 'low');
    }
  } catch (e) {
    // Tab closed or inaccessible
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    sendLog('navigation', changeInfo.url, 'medium');
    
    if (tabId === activeTabInfo.id) {
      recordTimeSpent();
      activeTabInfo.url = changeInfo.url;
      activeTabInfo.startTime = Date.now();
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    focusLossCount++;
    recordTimeSpent();
    activeTabInfo.startTime = null; // Prevent double counting
  } else {
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tabs.length > 0) {
        const url = tabs[0].url || tabs[0].pendingUrl;
        activeTabInfo = { id: tabs[0].id, url: url, startTime: Date.now() };
      }
    } catch (e) {}
  }
});

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

initialize();
