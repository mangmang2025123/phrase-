const apiEndpointInput = document.getElementById('apiEndpoint');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const saveButton = document.getElementById('save');
const statusDiv = document.getElementById('status');
const testApiButton = document.getElementById('testApiButton');
const testResultDiv = document.getElementById('testResult');

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiEndpoint', 'apiKey', 'modelName'], (result) => {
    if (result.apiEndpoint) {
      apiEndpointInput.value = result.apiEndpoint;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.modelName) {
      modelNameInput.value = result.modelName;
    } else {
      // Optional: set a default placeholder if nothing is stored,
      // though the HTML placeholder might be sufficient.
      // modelNameInput.value = 'gpt-3.5-turbo';
    }
  });
});

// Save settings when button is clicked
saveButton.addEventListener('click', () => {
  const endpoint = apiEndpointInput.value.trim();
  const key = apiKeyInput.value.trim();
  const model = modelNameInput.value.trim();
  
  if (!endpoint || !key || !model) {
    statusDiv.textContent = 'Error: All fields are required.';
    statusDiv.style.color = 'red';
    return;
  }
  
  chrome.storage.local.set({ apiEndpoint: endpoint, apiKey: key, modelName: model }, () => {
    statusDiv.textContent = 'Settings saved!';
    statusDiv.style.color = 'green';
    setTimeout(() => { statusDiv.textContent = ''; window.close(); }, 1500);
  });
});

testApiButton.addEventListener('click', () => {
  const endpoint = apiEndpointInput.value.trim();
  const key = apiKeyInput.value.trim();
  const model = modelNameInput.value.trim();

  if (!endpoint || !key || !model) {
    testResultDiv.textContent = 'Error: API Endpoint, Key, and Model Name are required to test.';
    testResultDiv.style.color = 'red';
    return;
  }

  testResultDiv.textContent = 'Testing...';
  testResultDiv.style.color = 'blue';

  chrome.runtime.sendMessage(
    { action: "testApiConfig", endpoint: endpoint, apiKey: key, model: model },
    (response) => {
      if (chrome.runtime.lastError) {
        // Handle errors from sending the message itself
        console.error("Error sending test message to background:", chrome.runtime.lastError.message);
        testResultDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
        testResultDiv.style.color = 'red';
        return;
      }
      if (response) {
        if (response.success) {
          testResultDiv.textContent = `Success: ${response.message}`;
          testResultDiv.style.color = 'green';
        } else {
          testResultDiv.textContent = `Error: ${response.error || 'Test failed. Check background script console.'}`;
          testResultDiv.style.color = 'red';
        }
      } else {
         testResultDiv.textContent = 'Error: No response from background script during test.';
         testResultDiv.style.color = 'red';
      }
    }
  );
});
