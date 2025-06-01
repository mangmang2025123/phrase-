const DEFAULT_PROMPT_T_BG = "In the following sentence, please explain the meaning of '{{SELECTED_TEXT}}'. Answer in Chinese. Sentence: {{SENTENCE}}";
const DEFAULT_PROMPT_S_BG = "You answer my questions according to the following rules:\n\nwhen:\n{\nuser: Beauty\nyou:\nBeauty (名词) - 美；美人\nBeautiful (形容词) - 美丽的\nBeautifully (副词) - 美丽地\nBeautify (动词) - 美化\nBeautician (名词) - 美容师\nBeauteous (形容词) - 美丽的 (文学化)\nBeautification (名词) - 美化\nBeautifier (名词) - 美化者/物\n}\n\nwhen:\n{\nuser: been\nyou:\nbe (动词原形) - 是，存在\nam (动词) - 是 (用于第一人称单数现在时)\nis(动词) - 是 (用于第三人称单数现在时)\nare (动词) - 是 (用于第二人称单复数现在时，及第一、三人称复数现在时)\nwas (动词) - 是 (用于第一、三人称单数过去时)\nwere(动词) - 是 (用于第二人称单复数过去时，及第一、三人称复数过去时)\nbeing (动词现在分词 / 名词) - 正在是；存在，生物\nbeen(动词过去分词) - (已经)是\n}\n\nWherein Beauty or been are both variables.\nCurrently, the text input by the user is:{{SELECTED_TEXT}}";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "explainSelectionInSentence") {
    const sentenceText = request.sentence;
    const selectedTextInSentence = request.selectedText;

    chrome.storage.local.get(['apiEndpoint', 'apiKey', 'modelPresets', 'selectedModelPresetIndex', 'promptT'], (config) => {
      if (!config.apiEndpoint || !config.apiKey) {
        console.error('API endpoint or key not configured.');
        sendResponse({ error: "API not configured. Please set it in the extension popup." });
        return true;
      }

      let modelForAnalysis = "gpt-3.5-turbo"; // Default model
      if (config.modelPresets && Array.isArray(config.modelPresets) &&
          typeof config.selectedModelPresetIndex === 'number' &&
          config.selectedModelPresetIndex >= 0 &&
          config.selectedModelPresetIndex < config.modelPresets.length &&
          config.modelPresets[config.selectedModelPresetIndex] && // Check if the preset string itself is not empty
          config.modelPresets[config.selectedModelPresetIndex].trim() !== "") {
        modelForAnalysis = config.modelPresets[config.selectedModelPresetIndex];
      } else {
        console.warn(`Text Analyzer (explainSelectionInSentence): Model preset not properly configured. Defaulting to ${modelForAnalysis}. Presets: ${JSON.stringify(config.modelPresets)}, Index: ${config.selectedModelPresetIndex}`);
      }

      let chosenPromptForT = DEFAULT_PROMPT_T_BG;
      if (config.promptT && typeof config.promptT === 'string' &&
          config.promptT.includes("{{SENTENCE}}") && config.promptT.includes("{{SELECTED_TEXT}}")) {
        chosenPromptForT = config.promptT;
      } else if (config.promptT) { // It exists but is invalid
        console.warn("Text Analyzer (explainSelectionInSentence): Invalid promptT found in storage. Using default.");
      }

      let finalPromptForT = chosenPromptForT.replace("{{SENTENCE}}", sentenceText || ""); // Add fallback for sentenceText
      finalPromptForT = finalPromptForT.replace("{{SELECTED_TEXT}}", selectedTextInSentence || ""); // Add fallback for selectedText

      const requestBody = {
        model: modelForAnalysis,
        messages: [
          { role: "user", content: finalPromptForT }
        ],
        temperature: 0.7
      };

      fetch(config.apiEndpoint, { // Uses saved endpoint and key
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
          sendResponse({ analysis: data.choices[0].message.content });
        } else {
          console.error('Unexpected API response structure for analysis:', data);
          sendResponse({ error: "Failed to parse analysis from API response." });
        }
      })
      .catch(error => {
        console.error('Error calling LLM API for analysis:', error);
        sendResponse({ error: `Error calling LLM API: ${error.message}` });
      });
    });
    return true; // Crucial for async operation

  } else if (request.action === "analyzeWordForms") {
    const selectedTextForForms = request.selectedText;
    const sentenceForSContext = request.sentence; // Available if needed by a custom S prompt

    if (!selectedTextForForms) {
      console.error("analyzeWordForms: selectedText is missing.");
      sendResponse({ error: "Selected text is missing for word forms analysis." });
      return true;
    }

    chrome.storage.local.get(['apiEndpoint', 'apiKey', 'modelPresets', 'selectedModelPresetIndex', 'promptS'], (config) => {
      if (!config.apiEndpoint || !config.apiKey) {
        console.error('API endpoint or key not configured for analyzeWordForms.');
        sendResponse({ error: "API not configured. Please set it in the extension popup." });
        return true;
      }

      let modelForAnalysis = "gpt-3.5-turbo"; // Default model
      if (config.modelPresets && Array.isArray(config.modelPresets) &&
          typeof config.selectedModelPresetIndex === 'number' &&
          config.selectedModelPresetIndex >= 0 &&
          config.selectedModelPresetIndex < config.modelPresets.length &&
          config.modelPresets[config.selectedModelPresetIndex] &&
          config.modelPresets[config.selectedModelPresetIndex].trim() !== "") {
        modelForAnalysis = config.modelPresets[config.selectedModelPresetIndex];
      } else {
        console.warn(`Text Analyzer (analyzeWordForms): Model preset not properly configured. Defaulting to ${modelForAnalysis}.`);
      }

      let chosenPromptForS = DEFAULT_PROMPT_S_BG;
      if (config.promptS && typeof config.promptS === 'string' &&
          config.promptS.includes("{{SELECTED_TEXT}}")) {
        chosenPromptForS = config.promptS;
      } else if (config.promptS) {
        console.warn("Text Analyzer (analyzeWordForms): Invalid promptS found in storage. Using default.");
      }

      let finalPromptForS = chosenPromptForS.replace("{{SELECTED_TEXT}}", selectedTextForForms);
      if (chosenPromptForS.includes("{{SENTENCE}}")) {
         finalPromptForS = finalPromptForS.replace("{{SENTENCE}}", sentenceForSContext || "");
      }

      const requestBody = {
        model: modelForAnalysis,
        messages: [{ role: "user", content: finalPromptForS }],
        temperature: 0.7
      };

      fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
          sendResponse({ analysis: data.choices[0].message.content });
        } else {
          console.error('Unexpected API response structure for analyzeWordForms:', data);
          sendResponse({ error: "Failed to parse analysis from API response for word forms." });
        }
      })
      .catch(error => {
        console.error('Error calling LLM API for analyzeWordForms:', error);
        sendResponse({ error: `Error calling LLM API for word forms: ${error.message}` });
      });
    });
    return true; // Crucial for async operation

  } else if (request.action === "testApiConfig") {
    const { endpoint, apiKey, model: modelFromPopup } = request; // Renamed to avoid conflict

    // Validation for endpoint and apiKey still makes sense here
    if (!endpoint || !apiKey) {
      sendResponse({ success: false, error: "Endpoint or API Key missing in test request." });
      return true; // Asynchronous, even for this early return
    }

    const modelForTest = modelFromPopup || "gpt-3.5-turbo"; // Default if model not provided from popup

    const testBody = {
      model: modelForTest,
      messages: [{ role: "user", content: "Hello!" }],
      max_tokens: 5
    };

    fetch(endpoint, { // Uses endpoint and key from the popup directly for testing
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(testBody)
    })
    .then(response => {
      if (response.ok) {
        // Optionally, you could try to parse response.json() to see if it's valid
        // but for a simple test, response.ok might be enough.
        sendResponse({ success: true, message: "API connection successful!" });
      } else {
        // Try to get a more specific error from the API response body
        response.json().then(errorData => {
          const errorMessage = errorData?.error?.message || `API returned status: ${response.status}`;
          sendResponse({ success: false, error: errorMessage });
        }).catch(() => {
          // If parsing the error JSON fails
          sendResponse({ success: false, error: `API returned status: ${response.status}. Could not parse error details.` });
        });
      }
    })
    .catch(error => {
      console.error('Error during API test:', error);
      sendResponse({ success: false, error: `Network error or other issue: ${error.message}` });
    });

    return true; // Crucial for async testApiConfig
  }
  // If you have more actions, add more else if blocks.
  // Optional: return false if no async operation is pending for a specific message type.
});

// Optional: Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Text Analyzer AI Helper extension installed/updated.");
});
