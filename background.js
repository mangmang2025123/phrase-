const DEFAULT_PROMPT_TEMPLATE_BG = "I'm a beginner in English. I know some individual words, but I don't know which words should be read together as fixed expressions or collocations. Please help me analyze the following sentence. Show me all the word groups that are fixed expressions, collocations, or commonly used phrases — like “right now”, “as soon as possible”, or “by the way”. For each group, explain what it means in simple English. answer in chinese The sentence is: {{TEXT_TO_ANALYZE}}";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeText") {
    const textToAnalyze = request.text;

    chrome.storage.local.get(['apiEndpoint', 'apiKey', 'modelPresets', 'selectedModelPresetIndex', 'customPromptTemplate'], (config) => {
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
        console.warn(`Text Analyzer: Model preset not properly configured or selected. Defaulting to ${modelForAnalysis}. Presets: ${JSON.stringify(config.modelPresets)}, Index: ${config.selectedModelPresetIndex}`);
      }

      let chosenPromptTemplate = DEFAULT_PROMPT_TEMPLATE_BG; // Default to the background's default
      if (config.customPromptTemplate && typeof config.customPromptTemplate === 'string' && config.customPromptTemplate.includes("{{TEXT_TO_ANALYZE}}")) {
        chosenPromptTemplate = config.customPromptTemplate;
      } else if (config.customPromptTemplate) {
        // This case means a custom prompt exists but is invalid (missing placeholder)
        // Log an error/warning and use default. Or, popup.js should ideally prevent saving invalid ones.
        console.warn("Text Analyzer: Invalid custom prompt found in storage (missing placeholder). Using default prompt.");
      }
      // If config.customPromptTemplate is null/undefined, chosenPromptTemplate remains DEFAULT_PROMPT_TEMPLATE_BG

      const finalPrompt = chosenPromptTemplate.replace("{{TEXT_TO_ANALYZE}}", textToAnalyze);

      const requestBody = {
        model: modelForAnalysis, // This logic for modelForAnalysis should already exist
        messages: [
          { role: "user", content: finalPrompt } // NEW: Use finalPrompt
        ],
        temperature: 0.7 // Or make this configurable later
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
    return true; // Crucial for async analyzeText

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
