let deviceId = null;
let clientId = null;
let activeTabInfo = { id: null, url: null, startTime: null };
let logBuffer = [];
let sessionId = crypto.randomUUID();
let focusLossCount = 0;
let userEmail = "anonymous";
let userName = "Anonymous";
let restrictedDomains = [];

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function extractName(email) {
  if (!email || email === "unknown") return "Unknown User";
  let namePart = email.split("@")[0];
  namePart = namePart.replace(/[._]/g, " ");
  let words = namePart.split(" ");
  let formatted = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
  );
  return formatted.join(" ");
}

async function initialize() {
  const data = await chrome.storage.local.get(['device_id', 'client_id', 'last_email']);
  
  // 1. Device ID logic
  if (!data.device_id) {
    deviceId = crypto.randomUUID();
    await chrome.storage.local.set({ device_id: deviceId });
  } else {
    deviceId = data.device_id;
  }

  // 2. Fetch User Email
  if (chrome.identity && chrome.identity.getProfileUserInfo) {
    chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, async function(userInfo) {
      const currentEmail = (userInfo && userInfo.email) ? userInfo.email : "anonymous";
      
      // Update identity globals
      userEmail = currentEmail;
      userName = extractName(userEmail);

      // 3. Client ID logic (Generate if missing or if email changed)
      if (!data.client_id || data.last_email !== currentEmail) {
        clientId = await sha256(currentEmail + deviceId);
        await chrome.storage.local.set({ 
          client_id: clientId, 
          last_email: currentEmail 
        });
        console.log("Generated new client_id:", clientId);
      } else {
        clientId = data.client_id;
      }

      console.log("Identity Resolved:", { userEmail, deviceId, clientId });

      // Notify backend about current user info
      const adminUrl = await getAdminUrl();
      if (adminUrl) {
        fetch(`${adminUrl}/user-info`, {
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
        }).catch(e => console.error("Error sending user info:", e));
      }
    });
  } else {
    // Fallback if identity API is unavailable
    userEmail = "anonymous";
    clientId = await sha256(userEmail + deviceId);
    console.warn("Identity API unavailable. Using anonymous client_id:", clientId);
  }
  
  updateBadge();
}

async function getAdminUrl() {
  const data = await chrome.storage.local.get(['adminUrl', 'loggingEnabled']);
  if (data.loggingEnabled === false) return null;
  // Default to localhost:54698 if not set locally
  const baseUrl = data.adminUrl || 'http://localhost:54698';
  return baseUrl.replace(/\/+$/, '');
}

async function syncRestrictions() {
  const adminUrl = await getAdminUrl();
  if (!adminUrl) return;

  try {
    const res = await fetch(`${adminUrl}/restrictions`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        restrictedDomains = await res.json();
        await chrome.storage.local.set({ restrictedDomains });
        console.log("Synced restrictions:", restrictedDomains);
      } else {
        console.error("Sync failed: Backend returned non-JSON response. Check if your Admin URL is correct (usually port 54698, not 3001).");
      }
    }
  } catch (e) {
    console.error("Failed to sync restrictions:", e);
    // Fallback to local storage if network fails
    const data = await chrome.storage.local.get(['restrictedDomains']);
    if (data.restrictedDomains) restrictedDomains = data.restrictedDomains;
  }
}

// Check every 10 seconds for lively updates
setInterval(syncRestrictions, 10 * 1000);

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only check main frame
  
  const url = new URL(details.url);
  const hostname = url.hostname.toLowerCase();

  for (const domain of restrictedDomains) {
    const d = domain.toLowerCase();
    if (hostname === d || hostname.endsWith("." + d)) {
      console.warn(`Blocking navigation to restricted domain: ${hostname}`);
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
      return;
    }
  }
});

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
  if (!adminUrl || !deviceId || !clientId) return;

  const batch = [...logBuffer]; 
  logBuffer = [];

  for (const log of batch) {
    log.device_id = deviceId;
    log.client_id = clientId;
    log.email = userEmail;
    log.user_name = userName;
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
  if (changes.adminUrl) {
    console.log("Admin URL changed, re-syncing restrictions...");
    syncRestrictions();
  }
});

// Listen for manual sync requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_RESTRICTIONS') {
    syncRestrictions().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
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

chrome.runtime.onInstalled.addListener(() => {
  initialize();
  syncRestrictions();
});
chrome.runtime.onStartup.addListener(() => {
  initialize();
  syncRestrictions();
});

initialize();
syncRestrictions();
