const apiEndpointInput = document.getElementById('apiEndpoint');
const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiEndpoint', 'apiKey'], (result) => {
    if (result.apiEndpoint) {
      apiEndpointInput.value = result.apiEndpoint;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
});

// Save settings when button is clicked
saveButton.addEventListener('click', () => {
  const endpoint = apiEndpointInput.value.trim();
  const key = apiKeyInput.value.trim();
  
  if (!endpoint || !key) {
    statusDiv.textContent = 'Error: Both fields are required.';
    statusDiv.style.color = 'red';
    return;
  }
  
  chrome.storage.local.set({ apiEndpoint: endpoint, apiKey: key }, () => {
    statusDiv.textContent = 'Settings saved!';
    statusDiv.style.color = 'green';
    setTimeout(() => { statusDiv.textContent = ''; window.close(); }, 1500);
  });
});
