document.addEventListener('DOMContentLoaded', () => {
  // === DEFAULT PROMPTS ===
  const DEFAULT_PROMPT_T = "In the following sentence, please explain the meaning of '{{SELECTED_TEXT}}'. Answer in Chinese. Sentence: {{SENTENCE}}";
  const DEFAULT_PROMPT_S = "You answer my questions according to the following rules:\n\nwhen:\n{\nuser: Beauty\nyou:\nBeauty (名词) - 美；美人\nBeautiful (形容词) - 美丽的\nBeautifully (副词) - 美丽地\nBeautify (动词) - 美化\nBeautician (名词) - 美容师\nBeauteous (形容词) - 美丽的 (文学化)\nBeautification (名词) - 美化\nBeautifier (名词) - 美化者/物\n}\n\nwhen:\n{\nuser: been\nyou:\nbe (动词原形) - 是，存在\nam (动词) - 是 (用于第一人称单数现在时)\nis(动词) - 是 (用于第三人称单数现在时)\nare (动词) - 是 (用于第二人称单复数现在时，及第一、三人称复数现在时)\nwas (动词) - 是 (用于第一、三人称单数过去时)\nwere(动词) - 是 (用于第二人称单复数过去时，及第一、三人称复数过去时)\nbeing (动词现在分词 / 名词) - 正在是；存在，生物\nbeen(动词过去分词) - (已经)是\n}\n\nWherein Beauty or been are both variables.\nCurrently, the text input by the user is:{{SELECTED_TEXT}}";

  // === DOM References ===
  // View navigation
  const showSettingsViewButton = document.getElementById('showSettingsView');
  const showModelPresetsViewButton = document.getElementById('showModelPresetsView');
  const showPromptTemplatesViewButton = document.getElementById('showPromptTemplatesView');
  const settingsView = document.getElementById('settingsView');
  const modelPresetsView = document.getElementById('modelPresetsView');
  const promptTemplatesView = document.getElementById('promptTemplatesView');

  // Settings View elements
  const apiEndpointInput = document.getElementById('apiEndpoint');
  const apiKeyInput = document.getElementById('apiKey');
  const selectedModelDisplay = document.getElementById('selectedModelDisplay');
  // const modelPresetSelectionControls = document.getElementById('modelPresetSelectionControls'); // Already used for P1-P5 buttons
  const saveSettingsButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
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

  // Prompt Templates View (New)
  const promptTTextarea = document.getElementById('promptTTemplate');
  const promptSTextarea = document.getElementById('promptSTemplate');
  const saveAllPromptsButton = document.getElementById('saveAllPromptsButton');
  const resetAllPromptsButton = document.getElementById('resetAllPromptsButton');
  const allPromptsStatusDiv = document.getElementById('allPromptsStatus');

  // Data variables
  let currentModelPresets = ["", "", "", "", ""];
  let selectedModelPresetIndex = 0;

  // === View Switching Logic ===
  function showView(viewToShow) {
    settingsView.style.display = 'none';
    modelPresetsView.style.display = 'none';
    promptTemplatesView.style.display = 'none';
    viewToShow.style.display = 'block';
  }

  showSettingsViewButton.addEventListener('click', () => showView(settingsView));
  showModelPresetsViewButton.addEventListener('click', () => showView(modelPresetsView));
  showPromptTemplatesViewButton.addEventListener('click', () => showView(promptTemplatesView));

  // === Loading Data (`loadData` function) ===
  function loadData() {
    chrome.storage.local.get([
      'apiEndpoint', 'apiKey',
      'modelPresets', 'selectedModelPresetIndex',
      'promptT', 'promptS' // New keys for prompts
    ], (result) => {
      // API Endpoint and Key
      if (result.apiEndpoint) apiEndpointInput.value = result.apiEndpoint;
      if (result.apiKey) apiKeyInput.value = result.apiKey;

      // Model Presets
      if (result.modelPresets && Array.isArray(result.modelPresets) && result.modelPresets.length === 5) {
        currentModelPresets = result.modelPresets;
        modelPresetInputs.forEach((input, index) => {
          input.value = currentModelPresets[index] || "";
        });
      } else {
         modelPresetInputs.forEach(input => input.value = "");
      }
      selectedModelPresetIndex = (typeof result.selectedModelPresetIndex === 'number' && result.selectedModelPresetIndex >= 0 && result.selectedModelPresetIndex < 5) ? result.selectedModelPresetIndex : 0;
      updateSelectedModelDisplay();
      updatePresetButtonLabels();
      highlightActivePresetButton();

      // Load Prompt T
      if (result.promptT && result.promptT.includes("{{SENTENCE}}") && result.promptT.includes("{{SELECTED_TEXT}}")) {
        promptTTextarea.value = result.promptT;
      } else {
        promptTTextarea.value = DEFAULT_PROMPT_T;
        chrome.storage.local.set({ promptT: DEFAULT_PROMPT_T });
      }

      // Load Prompt S
      if (result.promptS && result.promptS.includes("{{SELECTED_TEXT}}")) {
        promptSTextarea.value = result.promptS;
      } else {
        promptSTextarea.value = DEFAULT_PROMPT_S;
        chrome.storage.local.set({ promptS: DEFAULT_PROMPT_S });
      }
    });
  }

  // === Settings View Logic ===
  saveSettingsButton.addEventListener('click', () => {
    const endpoint = apiEndpointInput.value.trim();
    const key = apiKeyInput.value.trim();

    if (!endpoint || !key) {
      statusDiv.textContent = 'Error: API Endpoint and Key are required.';
      statusDiv.style.color = 'red';
      return;
    }
    chrome.storage.local.set({ apiEndpoint: endpoint, apiKey: key }, () => {
      statusDiv.textContent = 'API Settings saved!';
      statusDiv.style.color = 'green';
      setTimeout(() => { statusDiv.textContent = ''; }, 1500);
    });
  });

  testApiButton.addEventListener('click', () => {
    const endpoint = apiEndpointInput.value.trim();
    const key = apiKeyInput.value.trim();
    const modelToTest = currentModelPresets[selectedModelPresetIndex] || "gpt-3.5-turbo";

    if (!endpoint || !key) {
      testResultDiv.textContent = 'Error: API Endpoint and Key are required to test.';
      testResultDiv.style.color = 'red';
      return;
    }
     if (!modelToTest || modelToTest.trim() === "") { // Check if model is empty string
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

  for (let i = 0; i < 5; i++) {
    const button = document.getElementById(`selectModelPreset${i + 1}`);
    if (button) {
      button.addEventListener('click', () => {
        selectedModelPresetIndex = i;
        chrome.storage.local.set({ selectedModelPresetIndex: i }, () => {
          updateSelectedModelDisplay();
          highlightActivePresetButton();
        });
      });
    }
  }

  function updateSelectedModelDisplay() {
    const selectedModel = currentModelPresets[selectedModelPresetIndex];
    if (selectedModel && selectedModel.trim() !== "") {
      selectedModelDisplay.textContent = selectedModel;
    } else {
      selectedModelDisplay.textContent = "P" + (selectedModelPresetIndex + 1) + " not set";
    }
  }

  function highlightActivePresetButton() {
    for (let i = 0; i < 5; i++) {
      const button = document.getElementById(`selectModelPreset${i + 1}`);
      if (button) {
        if (i === selectedModelPresetIndex) {
          button.style.fontWeight = 'bold';
          button.style.borderWidth = '2px';
          button.style.borderColor = '#007bff'; // Example highlight color
        } else {
          button.style.fontWeight = 'normal';
          button.style.borderWidth = '1px';
          button.style.borderColor = ''; // Reset to default or specific color
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
                button.textContent = presetName.length > 8 ? `P${i+1}: ${presetName.substring(0,5)}...` : `P${i+1}: ${presetName}`;
            } else {
                button.textContent = `P${i+1}`;
            }
        }
    }
  }

  // === Model Presets View Logic ===
  saveModelPresetsButton.addEventListener('click', () => {
    const newPresets = modelPresetInputs.map(input => input.value.trim());
    currentModelPresets = newPresets;
    chrome.storage.local.set({ modelPresets: newPresets }, () => {
      modelPresetsStatusDiv.textContent = 'Model presets saved!';
      modelPresetsStatusDiv.style.color = 'green';
      updateSelectedModelDisplay();
      updatePresetButtonLabels();
      setTimeout(() => { modelPresetsStatusDiv.textContent = ''; }, 1500);
    });
  });

  // === Prompt Templates View Logic (New) ===
  saveAllPromptsButton.addEventListener('click', () => {
    const promptTValue = promptTTextarea.value.trim();
    const promptSValue = promptSTextarea.value.trim();
    let valid = true;
    let errors = [];

    if (!promptTValue.includes("{{SENTENCE}}") || !promptTValue.includes("{{SELECTED_TEXT}}")) {
      errors.push("Prompt T must include {{SENTENCE}} and {{SELECTED_TEXT}}.");
      valid = false;
    }
    if (!promptSValue.includes("{{SELECTED_TEXT}}")) {
      errors.push("Prompt S must include {{SELECTED_TEXT}}.");
      valid = false;
    }

    if (valid) {
      chrome.storage.local.set({ promptT: promptTValue, promptS: promptSValue }, () => {
        allPromptsStatusDiv.textContent = 'Prompts saved successfully!';
        allPromptsStatusDiv.style.color = 'green';
        setTimeout(() => { allPromptsStatusDiv.textContent = ''; }, 2000);
      });
    } else {
      allPromptsStatusDiv.innerHTML = errors.join('<br>');
      allPromptsStatusDiv.style.color = 'red';
    }
  });

  resetAllPromptsButton.addEventListener('click', () => {
    promptTTextarea.value = DEFAULT_PROMPT_T;
    promptSTextarea.value = DEFAULT_PROMPT_S;
    chrome.storage.local.set({ promptT: DEFAULT_PROMPT_T, promptS: DEFAULT_PROMPT_S }, () => {
      allPromptsStatusDiv.textContent = 'Prompts reset to defaults.';
      allPromptsStatusDiv.style.color = 'green';
      setTimeout(() => { allPromptsStatusDiv.textContent = ''; }, 2000);
    });
  });

  // === Initial Load & Default View ===
  loadData();
  showView(settingsView);
});
