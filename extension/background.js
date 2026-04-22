let deviceId = null;
let clientId = null;
let activeTabInfo = { id: null, url: null, startTime: null };
let logBuffer = [];
let sessionId = crypto.randomUUID();
let focusLossCount = 0;
let userEmail = "anonymous";
let userName = "Anonymous";
let restrictedDomains = [];
let isSyncing = false;
let isInitialized = false; // NEW
let isSynced = false; // NEW

// Helper to wrap identity API in a Promise
function getIdentity() {
  return new Promise((resolve) => {
    if (chrome.identity && chrome.identity.getProfileUserInfo) {
      chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
        resolve(userInfo);
      });
    } else {
      resolve(null);
    }
  });
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function extractName(email) {
  if (!email || email === "unknown" || email === "anonymous") return "Anonymous";
  let namePart = email.split("@")[0];
  namePart = namePart.replace(/[._]/g, " ");
  let words = namePart.split(" ");
  let formatted = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  );
  return formatted.join(" ");
}

// FIXED: Added robust initialization flow
async function initialize() {
  console.log("Initializing synchronized flow...");
  isInitialized = false; // Reset on init start

  const data = await chrome.storage.local.get(['device_id', 'client_id', 'last_email']);

  // 1. Device ID logic
  if (!data.device_id) {
    deviceId = crypto.randomUUID();
    await chrome.storage.local.set({ device_id: deviceId });
  } else {
    deviceId = data.device_id;
  }

  // 2. Resolve Identity
  const userInfo = await getIdentity();
  userEmail = (userInfo && userInfo.email) ? userInfo.email : "anonymous";
  userName = extractName(userEmail);

  // 3. Client ID logic (Generate if missing or if email changed)
  if (!data.client_id || data.last_email !== userEmail) {
    clientId = await sha256(userEmail + deviceId);
    await chrome.storage.local.set({
      client_id: clientId,
      last_email: userEmail
    });
    console.log("Synchronized identity updated:", { userEmail, clientId });
  } else {
    clientId = data.client_id;
  }

  isInitialized = true; // FIXED: Set flag after core data is ready
  console.log("Initialization complete. Data ready for sync.");

  // 4. Initial sync attempt
  await safeSyncUserInfo();
  await updateBadge();
}

// FIXED: syncUserInfo now returns success boolean
async function syncUserInfo() {
  const adminUrl = await getAdminUrl();
  if (!adminUrl) return false;

  try {
    const response = await fetch(`${adminUrl}/user-info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        email: userEmail,
        name: userName,
        device_id: deviceId,
        client_id: clientId
      })
    });
    
    if (response.ok) {
      console.log("User info successfully synchronized with backend.");
      isSynced = true;
      return true;
    }
    return false;
  } catch (e) {
    console.warn("Backend unavailable for user-info sync. Will retry later.", e.message);
    return false;
  }
}

// NEW: Safe wrapper with delay and validation
async function safeSyncUserInfo() {
  if (!isInitialized) {
    console.warn("Sync aborted: Initialization not complete.");
    return;
  }

  if (!userEmail || !deviceId || !clientId) {
    console.warn("Sync aborted: Missing required identity fields.");
    return;
  }

  // Handle ngrok/backend delay
  console.log("Preparing to send user info (1s delay)...");
  await new Promise(r => setTimeout(r, 1000));

  const success = await syncUserInfo();
  if (!success) {
    isSynced = false;
    console.log("Sync failed. Periodic retry will handle it.");
  }
}

async function getAdminUrl() {
  const data = await chrome.storage.local.get(['adminUrl', 'loggingEnabled']);
  if (data.loggingEnabled === false) return null;
  const baseUrl = data.adminUrl;
  if (!baseUrl) return null; 
  return baseUrl.replace(/\/+$/, '');
}

async function syncRestrictions() {
  if (isSyncing) return;
  isSyncing = true;

  const adminUrl = await getAdminUrl();
  if (!adminUrl) {
    isSyncing = false;
    return;
  }

  try {
    const res = await fetch(`${adminUrl}/restrictions`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const newRestrictions = await res.json();

        if (JSON.stringify(newRestrictions) !== JSON.stringify(restrictedDomains)) {
          restrictedDomains = newRestrictions;
          await chrome.storage.local.set({ restrictedDomains });
          console.log("Restrictions synchronized:", restrictedDomains);
        }
      } else {
        console.error("Sync failed: Non-JSON response from admin server.");
      }
    }
  } catch (e) {
    console.error("Failed to sync restrictions (Network Error):", e.message);
    const data = await chrome.storage.local.get(['restrictedDomains']);
    if (data.restrictedDomains) restrictedDomains = data.restrictedDomains;
  } finally {
    isSyncing = false;
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = new URL(details.url);
  const hostname = url.hostname.toLowerCase();

  for (const domain of restrictedDomains) {
    const d = domain.toLowerCase();
    if (hostname === d || hostname.endsWith("." + d)) {
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
      return;
    }
  }
});

function sendLog(event, url, severity, duration = null) {
  if (!isInitialized) return; // Wait for initialization

  const payload = {
    event: event,
    url: url || '',
    timestamp: new Date().toISOString(),
    severity: severity,
    session_id: sessionId,
    focus_loss_count: focusLossCount,
    device_id: deviceId,
    client_id: clientId,
    email: userEmail,
    user_name: userName
  };

  if (duration !== null) payload.duration_ms = duration;
  logBuffer.push(payload);
}

setInterval(async () => {
  if (logBuffer.length === 0) return;

  const adminUrl = await getAdminUrl();
  if (!adminUrl) return;

  const batch = [...logBuffer];
  logBuffer = [];

  for (const log of batch) {
    try {
      await fetch(`${adminUrl}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(log),
        keepalive: true
      });
    } catch (e) {
      logBuffer.unshift(log); 
      break;
    }
  }
}, 5000);

setInterval(syncRestrictions, 30 * 1000);

// NEW: Periodic retry for user identity sync (every 10s if not synced)
setInterval(async () => {
  if (isInitialized && !isSynced) {
    console.log("Retrying user identity sync...");
    await safeSyncUserInfo();
  }
}, 10000);

async function updateBadge() {
  const data = await chrome.storage.local.get(['loggingEnabled']);
  const enabled = data.loggingEnabled !== false;
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#3fb950' : '#ff7b72' });
}

// FIXED: Robust adminUrl change listener
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.loggingEnabled) updateBadge();
  if (changes.adminUrl) {
    console.log("Admin URL updated, forcing re-initialization and re-sync...");
    isSynced = false; // Reset sync status for new URL
    await initialize(); // This will also call safeSyncUserInfo()
    await syncRestrictions();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_RESTRICTIONS') {
    syncRestrictions().then(() => sendResponse({ success: true }));
    return true;
  }
});

function recordTimeSpent() {
  if (activeTabInfo.id !== null && activeTabInfo.startTime !== null) {
    const timeSpent = Date.now() - activeTabInfo.startTime;
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
    if (url) sendLog('tab_switch', url, 'low');
  } catch (e) { }
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
    activeTabInfo.startTime = null;
  } else {
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId: windowId });
      if (tabs.length > 0) {
        const url = tabs[0].url || tabs[0].pendingUrl;
        activeTabInfo = { id: tabs[0].id, url: url, startTime: Date.now() };
      }
    } catch (e) { }
  }
});

// SINGLE ENTRY POINT for Synchronized Startup
(async () => {
  try {
    await initialize();
    await syncRestrictions();
    console.log("Synchronized implementation started successfully.");
  } catch (e) {
    console.error("Critical error during synchronized startup:", e);
  }
})();
