let lastHoveredElement = null;
let analysisDisplayIdCounter = 0; // To give unique IDs to analysis divs if needed

// Track the element currently under the mouse
document.addEventListener('mouseover', (event) => {
  lastHoveredElement = event.target;
});

// Listen for the hotkey
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.key === 'a') {
    event.preventDefault(); // Prevent any default browser action for 'alt+a'
    
    if (lastHoveredElement) {
      const textContent = lastHoveredElement.textContent?.trim();
      
      if (textContent) {
        console.log("Hotkey pressed. Text to analyze:", textContent);
        // Store a reference to the element for later display.
        // If the element is removed or changed before response, this might fail.
        // A more robust way might involve adding a temporary ID to the element.
        const originalElementForAnalysis = lastHoveredElement; 

        chrome.runtime.sendMessage({ action: "analyzeText", text: textContent }, (response) => {
          if (chrome.runtime.lastError) {
            // Handle errors from sending the message (e.g., if background script isn't ready)
            console.error("Error sending message to background script:", chrome.runtime.lastError.message);
            displayAnalysis(originalElementForAnalysis, `Error: ${chrome.runtime.lastError.message}`, true);
            return;
          }
          
          if (response) {
            if (response.error) {
              console.error("Error from background script:", response.error);
              displayAnalysis(originalElementForAnalysis, `Error: ${response.error}`, true);
            } else if (response.analysis) {
              console.log("Analysis received:", response.analysis);
              displayAnalysis(originalElementForAnalysis, response.analysis, false);
            }
          } else {
            // This case might occur if the background script doesn't send a response
            // or if it was closed before responding.
            console.error("No response from background script or response was undefined.");
            displayAnalysis(originalElementForAnalysis, "Error: No response from analysis service.", true);
          }
        });
      } else {
        console.log("Hotkey pressed, but no text content found in the hovered element.");
      }
    } else {
      console.log("Hotkey pressed, but no element was hovered.");
    }
  }
});

function displayAnalysis(originalElement, analysisText, isError) {
  if (!originalElement || !document.body.contains(originalElement)) {
    console.warn("Original element for analysis is no longer in the DOM. Cannot display analysis.");
    // Optionally, show a general notification if the original element is gone.
    alert("Analysis result: " + analysisText); 
    return;
  }

  // Remove any existing analysis display for this element if we decide to re-analyze
  // For now, we'll allow multiple, but this could be changed.
  // Example: const existingAnalysisDiv = document.getElementById(`analysis_for_${originalElement.dataset.analysisId}`);
  // if (existingAnalysisDiv) existingAnalysisDiv.remove();

  const analysisDiv = document.createElement('div');
  analysisDisplayIdCounter++;
  const uniqueId = `text_analyzer_ai_helper_result_${analysisDisplayIdCounter}`;
  analysisDiv.id = uniqueId;
  analysisDiv.style.marginTop = '5px';
  analysisDiv.style.padding = '8px';
  analysisDiv.style.border = '1px solid #ddd';
  analysisDiv.style.backgroundColor = '#f9f9f9';
  analysisDiv.style.fontSize = '0.9em';
  analysisDiv.style.fontFamily = 'sans-serif';
  analysisDiv.style.color = isError ? 'red' : '#333';
  analysisDiv.style.textAlign = 'left'; // Explicitly set text alignment
  analysisDiv.style.whiteSpace = 'pre-wrap'; // Preserve whitespace and newlines from LLM
  
  analysisDiv.textContent = analysisText;

  // Insert after the original element
  originalElement.parentNode.insertBefore(analysisDiv, originalElement.nextSibling);
  
  // Optional: Add a way for the user to dismiss the analysis
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close Analysis';
  closeButton.style.display = 'block';
  closeButton.style.marginTop = '5px';
  closeButton.style.fontSize = '0.8em';
  closeButton.onclick = () => {
    analysisDiv.remove();
  };
  analysisDiv.appendChild(closeButton);
}

console.log("Text Analyzer AI Helper content script loaded.");
