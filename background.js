chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeText") {
    const textToAnalyze = request.text;

    chrome.storage.local.get(['apiEndpoint', 'apiKey'], (config) => {
      if (!config.apiEndpoint || !config.apiKey) {
        console.error('API endpoint or key not configured.');
        sendResponse({ error: "API not configured. Please set it in the extension popup." });
        return true; // Indicates asynchronous response
      }

      const fullPrompt = `I'm a beginner in English. I know some individual words, but I don't know which words should be read together as fixed expressions or collocations. Please help me analyze the following sentence. Show me all the word groups that are fixed expressions, collocations, or commonly used phrases — like “right now”, “as soon as possible”, or “by the way”. For each group, explain what it means in simple English. answer in chinese The sentence is: ${textToAnalyze}`;

      // Assuming OpenAI compatible API structure
      const requestBody = {
        model: "gpt-3.5-turbo", // Consider making this configurable later
        messages: [
          { role: "user", content: fullPrompt }
        ],
        temperature: 0.7 // Example temperature
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
            // Try to get a meaningful error message from the API response
            const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
          });
        }
        return response.json();
      })
      .then(data => {
        // Adjust based on the actual structure of the LLM response
        // This example assumes a typical OpenAI response structure
        if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
          sendResponse({ analysis: data.choices[0].message.content });
        } else {
          console.error('Unexpected API response structure:', data);
          sendResponse({ error: "Failed to parse analysis from API response. Check background script console." });
        }
      })
      .catch(error => {
        console.error('Error calling LLM API:', error);
        sendResponse({ error: `Error calling LLM API: ${error.message}` });
      });
    });

    return true; // Indicates that sendResponse will be called asynchronously
  }
});

// Optional: Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Text Analyzer AI Helper extension installed/updated.");
});
