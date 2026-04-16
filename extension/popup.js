document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('admin-url');
  const errorMsg = document.getElementById('url-error');
  const saveBtn = document.getElementById('save-btn');
  const statusMsg = document.getElementById('status');
  const toggleLogging = document.getElementById('toggle-logging');

  // Load saved configuration
  const data = await chrome.storage.local.get(['adminUrl', 'loggingEnabled']);
  const adminUrl = data.adminUrl || '';
  const loggingEnabled = data.loggingEnabled !== false; // default true

  if (adminUrl) {
    urlInput.value = adminUrl;
    statusMsg.textContent = 'Status: Saved';
    statusMsg.style.color = '#3fb950'; // Green
  }

  toggleLogging.checked = loggingEnabled;

  saveBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      errorMsg.classList.remove('hidden');
      return;
    }
    
    errorMsg.classList.add('hidden');

    await chrome.storage.local.set({ 
      adminUrl: url,
      loggingEnabled: toggleLogging.checked
    });

    statusMsg.textContent = 'Settings Saved!';
    statusMsg.style.color = '#3fb950';

    setTimeout(() => {
      statusMsg.textContent = url ? 'Status: Saved' : 'Status: Not Set';
      statusMsg.style.color = url ? '#3fb950' : '#ff7b72';
    }, 1500);
  });
});
