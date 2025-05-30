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
        // console.log("Hotkey pressed. Text to analyze:", textContent); // Optional: original console log
        const originalElementForAnalysis = lastHoveredElement; 

        chrome.runtime.sendMessage({ action: "analyzeText", text: textContent }, (response) => {
          if (chrome.runtime.lastError) {
            // Handle errors from sending the message (e.g., if background script isn't ready)
            const LCRmessage = `Failed to communicate with the extension's background script: ${chrome.runtime.lastError.message}. If the extension was just installed or updated, try reloading the page.`;
            console.error("Error sending message to background script:", LCRmessage);
            displayAnalysis(originalElementForAnalysis, `Error: ${LCRmessage}`, true); // Enhanced message
            return;
          }
          
          if (response) {
            if (response.error) {
              console.error("Error from background script:", response.error);
              displayAnalysis(originalElementForAnalysis, `Error: ${response.error}`, true);
            } else if (response.analysis) {
              // console.log("Analysis received:", response.analysis); // Optional: original console log
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
        // console.log("Hotkey pressed, but no text content found in the hovered element."); // Optional: original console log
      }
    } else {
      // console.log("Hotkey pressed, but no element was hovered."); // Optional: original console log
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
  analysisDiv.style.textAlign = 'left'; 
  analysisDiv.style.whiteSpace = 'pre-wrap'; 
  
  analysisDiv.textContent = analysisText;

  originalElement.parentNode.insertBefore(analysisDiv, originalElement.nextSibling);
  
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

// console.log("Text Analyzer AI Helper content script loaded."); // Optional: original final console log
