document.addEventListener('DOMContentLoaded', () => {
  // View navigation elements
  const showSettingsViewButton = document.getElementById('showSettingsView');
  const showModelPresetsViewButton = document.getElementById('showModelPresetsView');
  const settingsView = document.getElementById('settingsView');
  const modelPresetsView = document.getElementById('modelPresetsView');

  // Settings View elements
  const apiEndpointInput = document.getElementById('apiEndpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const selectedModelDisplay = document.getElementById('selectedModelDisplay');
  const modelPresetSelectionControls = document.getElementById('modelPresetSelectionControls'); // Parent of P1-P5 buttons
  const saveSettingsButton = document.getElementById('save'); // Existing save button
  const statusDiv = document.getElementById('status'); // Existing status for save settings
  const testApiButton = document.getElementById('testApiButton');
  const testResultDiv = document.getElementById('testResult');

  // Model Presets View elements
  const modelPresetInput1 = document.getElementById('modelPresetInput1');
  const modelPresetInput2 = document.getElementById('modelPresetInput2');
  const modelPresetInput3 = document.getElementById('modelPresetInput3');
  const modelPresetInput4 = document.getElementById('modelPresetInput4');
  const modelPresetInput5 = document.getElementById('modelPresetInput5');
  const modelPresetInputs = [modelPresetInput1, modelPresetInput2, modelPresetInput3, modelPresetInput4, modelPresetInput5];
  const saveModelPresetsButton = document.getElementById('saveModelPresets');
  const modelPresetsStatusDiv = document.getElementById('modelPresetsStatus');

  // Data variables
  let currentModelPresets = ["", "", "", "", ""];
  let selectedModelPresetIndex = 0;

  // --- View Switching Logic ---
  function showView(viewToShow) {
    settingsView.style.display = 'none';
    modelPresetsView.style.display = 'none';
    viewToShow.style.display = 'block';
  }

  showSettingsViewButton.addEventListener('click', () => showView(settingsView));
  showModelPresetsViewButton.addEventListener('click', () => showView(modelPresetsView));

  // --- Loading Data ---
  function loadData() {
    chrome.storage.local.get(['apiEndpoint', 'apiKey', 'modelPresets', 'selectedModelPresetIndex'], (result) => {
      if (result.apiEndpoint) apiEndpointInput.value = result.apiEndpoint;
      if (result.apiKey) apiKeyInput.value = result.apiKey;

      if (result.modelPresets && Array.isArray(result.modelPresets) && result.modelPresets.length === 5) {
        currentModelPresets = result.modelPresets;
        modelPresetInputs.forEach((input, index) => {
          input.value = currentModelPresets[index] || "";
        });
      } else {
        // Initialize with empty strings if not found or malformed
         modelPresetInputs.forEach(input => input.value = "");
      }
      
      selectedModelPresetIndex = (typeof result.selectedModelPresetIndex === 'number' && result.selectedModelPresetIndex >= 0 && result.selectedModelPresetIndex < 5) ? result.selectedModelPresetIndex : 0;
      
      updateSelectedModelDisplay();
      updatePresetButtonLabels();
      highlightActivePresetButton();
    });
  }

  // --- Settings View Logic ---
  saveSettingsButton.addEventListener('click', () => {
    const endpoint = apiEndpointInput.value.trim();
    const key = apiKeyInput.value.trim();

    if (!endpoint || !key) {
      statusDiv.textContent = 'Error: API Endpoint and Key are required.';
      statusDiv.style.color = 'red';
      return;
    }
    // Model name is now handled by preset selection, not direct input on this page.
    chrome.storage.local.set({ apiEndpoint: endpoint, apiKey: key }, () => {
      statusDiv.textContent = 'API Settings saved!';
      statusDiv.style.color = 'green';
      setTimeout(() => { statusDiv.textContent = ''; }, 1500);
    });
  });

  testApiButton.addEventListener('click', () => {
    const endpoint = apiEndpointInput.value.trim();
    const key = apiKeyInput.value.trim();
    const modelToTest = currentModelPresets[selectedModelPresetIndex] || "gpt-3.5-turbo"; // Use selected or default

    if (!endpoint || !key) {
      testResultDiv.textContent = 'Error: API Endpoint and Key are required to test.';
      testResultDiv.style.color = 'red';
      return;
    }
     if (!modelToTest) {
      testResultDiv.textContent = 'Error: No model selected/defined for testing. Please check Model Presets.';
      testResultDiv.style.color = 'red';
      return;
    }

    testResultDiv.textContent = 'Testing...';
    testResultDiv.style.color = 'blue';

    chrome.runtime.sendMessage(
      { action: "testApiConfig", endpoint: endpoint, apiKey: key, model: modelToTest },
      (response) => {
        if (chrome.runtime.lastError) {
          testResultDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
          testResultDiv.style.color = 'red';
          return;
        }
        if (response) {
          if (response.success) {
            testResultDiv.textContent = `Success: ${response.message}`;
            testResultDiv.style.color = 'green';
          } else {
            testResultDiv.textContent = `Error: ${response.error || 'Test failed.'}`;
            testResultDiv.style.color = 'red';
          }
        } else {
           testResultDiv.textContent = 'Error: No response from background script.';
           testResultDiv.style.color = 'red';
        }
      }
    );
  });

  // Preset selection buttons (P1-P5)
  for (let i = 0; i < 5; i++) {
    const button = document.getElementById(`selectModelPreset${i + 1}`);
    if (button) {
      button.addEventListener('click', () => {
        selectedModelPresetIndex = i;
        chrome.storage.local.set({ selectedModelPresetIndex: i }, () => {
          updateSelectedModelDisplay();
          highlightActivePresetButton();
          // console.log(`Selected model preset index: ${i}`);
        });
      });
    }
  }
  
  function updateSelectedModelDisplay() {
    const selectedModel = currentModelPresets[selectedModelPresetIndex];
    if (selectedModel && selectedModel.trim() !== "") {
      selectedModelDisplay.textContent = selectedModel;
    } else {
      selectedModelDisplay.textContent = "Preset not set";
    }
  }

  function highlightActivePresetButton() {
    for (let i = 0; i < 5; i++) {
      const button = document.getElementById(`selectModelPreset${i + 1}`);
      if (button) {
        if (i === selectedModelPresetIndex) {
          button.style.fontWeight = 'bold';
          button.style.borderWidth = '2px';
        } else {
          button.style.fontWeight = 'normal';
          button.style.borderWidth = '1px';
        }
      }
    }
  }
  
  function updatePresetButtonLabels() {
    for (let i = 0; i < 5; i++) {
        const button = document.getElementById(`selectModelPreset${i+1}`);
        if (button) {
            const presetName = currentModelPresets[i];
            if (presetName && presetName.trim() !== "") {
                // Keep labels short, e.g., first 10 chars or a generic P1, P2
                button.textContent = presetName.length > 10 ? `P${i+1}: ${presetName.substring(0,7)}...` : `P${i+1}: ${presetName}`;
            } else {
                button.textContent = `P${i+1}`;
            }
        }
    }
  }


  // --- Model Presets View Logic ---
  saveModelPresetsButton.addEventListener('click', () => {
    const newPresets = modelPresetInputs.map(input => input.value.trim());
    // Basic validation: ensure all 5 are filled, or allow empty for "unused"
    // For now, we save whatever is there.
    currentModelPresets = newPresets;
    chrome.storage.local.set({ modelPresets: newPresets }, () => {
      modelPresetsStatusDiv.textContent = 'Model presets saved!';
      modelPresetsStatusDiv.style.color = 'green';
      updateSelectedModelDisplay(); // Update display in Settings view if it's affected
      updatePresetButtonLabels();   // Update P1-P5 button labels
      setTimeout(() => { modelPresetsStatusDiv.textContent = ''; }, 1500);
    });
  });

  // --- Initial Load ---
  loadData(); // Load all data when popup opens
  showView(settingsView); // Show Settings view by default
});
