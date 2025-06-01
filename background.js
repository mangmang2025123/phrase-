const DEFAULT_PROMPT_TEMPLATE_BG = "In the following sentence, please explain the meaning of '{{SELECTED_TEXT}}'. Answer in Chinese. Sentence: {{SENTENCE}}";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "explainSelectionInSentence") {
    // const textToAnalyze = request.text; // This will change
    const sentenceText = request.sentence; // New
    const selectedTextInSentence = request.selectedText; // New

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

      let chosenPromptTemplate = DEFAULT_PROMPT_TEMPLATE_BG;
      if (config.customPromptTemplate && typeof config.customPromptTemplate === 'string' &&
          config.customPromptTemplate.includes("{{SENTENCE}}") && config.customPromptTemplate.includes("{{SELECTED_TEXT}}")) {
        chosenPromptTemplate = config.customPromptTemplate;
      } else if (config.customPromptTemplate) {
        console.warn("Text Analyzer: Invalid custom prompt (missing placeholders). Using default.");
      }

      // Replace both placeholders
      let finalPrompt = chosenPromptTemplate.replace("{{SENTENCE}}", sentenceText);
      finalPrompt = finalPrompt.replace("{{SELECTED_TEXT}}", selectedTextInSentence);

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
    return true; // Crucial for async operation

  } else if (request.action === "analyzeWordForms") {
    const selectedTextForForms = request.selectedText; // Expecting this from content.js

    const WORD_FORMS_PROMPT_TEMPLATE = `You answer my questions according to the following rules:

when:
{
user: Beauty
you:
Beauty (名词) - 美；美人
Beautiful (形容词) - 美丽的
Beautifully (副词) - 美丽地
Beautify (动词) - 美化
Beautician (名词) - 美容师
Beauteous (形容词) - 美丽的 (文学化)
Beautification (名词) - 美化
Beautifier (名词) - 美化者/物
}

when:
{
user: been
you:
be (动词原形) - 是，存在
am (动词) - 是 (用于第一人称单数现在时)
is(动词) - 是 (用于第三人称单数现在时)
are (动词) - 是 (用于第二人称单复数现在时，及第一、三人称复数现在时)
was (动词) - 是 (用于第一、三人称单数过去时)
were(动词) - 是 (用于第二人称单复数过去时，及第一、三人称复数过去时)
being (动词现在分词 / 名词) - 正在是；存在，生物
been(动词过去分词) - (已经)是
}

Wherein Beauty or been are both variables.
Currently, the text input by the user is:{{SELECTED_TEXT}}`;

    if (!selectedTextForForms) {
      console.error("analyzeWordForms: selectedText is missing.");
      sendResponse({ error: "Selected text is missing for word forms analysis." });
      return true; // Important for async if error occurs early
    }

    const finalWordFormsPrompt = WORD_FORMS_PROMPT_TEMPLATE.replace("{{SELECTED_TEXT}}", selectedTextForForms);

    chrome.storage.local.get(['apiEndpoint', 'apiKey', 'modelPresets', 'selectedModelPresetIndex'], (config) => {
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

      const requestBody = {
        model: modelForAnalysis,
        messages: [{ role: "user", content: finalWordFormsPrompt }],
        temperature: 0.7 // Or adjust as needed
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
