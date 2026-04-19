let machineId = null;
let activeTabInfo = { id: null, url: null, startTime: null };
let logBuffer = [];
let sessionId = crypto.randomUUID();
let focusLossCount = 0;
let userEmail = "unknown";
let userName = "Unknown User";
let restrictedDomains = [];

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
  const data = await chrome.storage.local.get(['machineId']);
  if (!data.machineId) {
    machineId = crypto.randomUUID();
    await chrome.storage.local.set({ machineId });
  } else {
    machineId = data.machineId;
  }

  // Robust Identity fetching
  if (chrome.identity && chrome.identity.getProfileUserInfo) {
    chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, function(userInfo) {
      if (userInfo && userInfo.email) {
        userEmail = userInfo.email;
        userName = extractName(userEmail);
        
        console.log("Email:", userEmail);
        console.log("Derived Name:", userName);
        
        // Use the dynamic adminUrl
        getAdminUrl().then(adminUrl => {
          if (!adminUrl) return;
          fetch(`${adminUrl}/user-info`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({
              email: userEmail,
              name: userName
            })
          }).catch(e => console.error("Error sending user info:", e));
        });
      } else {
        console.warn("User not signed in or email not accessible.");
      }
    });
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
  if (!adminUrl || !machineId) return;

  const batch = [...logBuffer]; 
  logBuffer = [];

  for (const log of batch) {
    log.machine_id = machineId;
    log.user = userEmail;
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
