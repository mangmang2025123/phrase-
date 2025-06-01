console.log("CONTENT.JS: Script loaded/reloaded - v2.");
// let lastHoveredElement = null; // Old listener, commented out
let analysisDisplayIdCounter = 0; // To give unique IDs to analysis divs if needed - Keep for displayAnalysis

// Track the element currently under the mouse
// document.addEventListener('mouseover', (event) => {
//   lastHoveredElement = event.target;
// });

// Listen for the hotkey - Old listener, commented out
// document.addEventListener('keydown', (event) => {
//   if (event.altKey && event.key === 'a') {
//     event.preventDefault(); // Prevent any default browser action for 'alt+a'

//     if (lastHoveredElement) {
//       const textContent = lastHoveredElement.textContent?.trim();

//       if (textContent) {
//         // console.log("Hotkey pressed. Text to analyze:", textContent); // Optional: original console log
//         const originalElementForAnalysis = lastHoveredElement;

//         chrome.runtime.sendMessage({ action: "analyzeText", text: textContent }, (response) => { // OLD: sends only 'text'
//           if (chrome.runtime.lastError) {
//             const LCRmessage = `Failed to communicate with the extension's background script: ${chrome.runtime.lastError.message}. If the extension was just installed or updated, try reloading the page.`;
//             console.error("Error sending message to background script:", LCRmessage);
//             displayAnalysis(originalElementForAnalysis, `Error: ${LCRmessage}`, true);
//             return;
//           }

//           if (response) {
//             if (response.error) {
//               console.error("Error from background script:", response.error);
//               displayAnalysis(originalElementForAnalysis, `Error: ${response.error}`, true);
//             } else if (response.analysis) {
//               displayAnalysis(originalElementForAnalysis, response.analysis, false);
//             }
//           } else {
//             console.error("No response from background script or response was undefined.");
//             displayAnalysis(originalElementForAnalysis, "Error: No response from analysis service.", true);
//           }
//         });
//       } else {
//         // console.log("Hotkey pressed, but no text content found in the hovered element.");
//       }
//     } else {
//       // console.log("Hotkey pressed, but no element was hovered.");
//     }
//   }
// });

let currentSelection = null; // To store the current Selection object
let analysisPopupButton = null; // To hold reference to our button
const POPUP_BUTTON_ID = 'textAnalysisExtensionPopupButton'; // ID for the button

document.addEventListener('mouseup', (event) => {
  console.log("CONTENT.JS: Mouseup event triggered.");
  // Don't trigger if clicking on our own popup button
  if (event.target.id === POPUP_BUTTON_ID) {
    return;
  }

  currentSelection = document.getSelection();
  const selectedText = currentSelection.toString().trim();
  console.log("CONTENT.JS: Selected text: '", selectedText, "'");

  if (selectedText) {
    console.log("TEXT ANALYZER (New): Text selected - ", selectedText); // Keeping original log for context
    createOrShowAnalysisButton(currentSelection);
  } else {
    // If no text is selected, and the button exists, remove it.
    // This handles cases where a selection is cleared without a mousedown (e.g., programmatic changes, some browser actions)
    if(analysisPopupButton) {
        removeAnalysisButton();
    }
  }
});

function createOrShowAnalysisButton(selectionObject) {
  console.log("CONTENT.JS: createOrShowAnalysisButton called. Current analysisPopupButton state:", analysisPopupButton);
  if (!analysisPopupButton) {
    analysisPopupButton = document.createElement('button');
    console.log("CONTENT.JS: Button element created locally:", analysisPopupButton);
    analysisPopupButton.id = POPUP_BUTTON_ID;
    analysisPopupButton.textContent = 'Analyze Selection';

    // Styling for dynamic positioning and smaller size
    analysisPopupButton.style.position = 'absolute';
    analysisPopupButton.style.zIndex = '99999'; // Ensure it's on top
    analysisPopupButton.style.padding = '4px 8px';
    analysisPopupButton.style.fontSize = '0.85em';
    analysisPopupButton.style.backgroundColor = '#4CAF50'; // Green
    analysisPopupButton.style.color = 'white';
    analysisPopupButton.style.border = 'none';
    analysisPopupButton.style.borderRadius = '4px';
    analysisPopupButton.style.cursor = 'pointer';

    const range = selectionObject.getRangeAt(0); // Get the first range of the selection
    const rect = range.getBoundingClientRect();
    analysisPopupButton.style.top = (rect.bottom + window.scrollY + 3) + 'px';
    analysisPopupButton.style.left = (rect.left + window.scrollX) + 'px';

    analysisPopupButton.addEventListener('click', () => {
      const textToAnalyze = selectionObject.toString().trim();
      if (textToAnalyze) {
        // For this phase, just log. Later, this will get sentence & send to background.js
        console.log("TEXT ANALYZER (New): Analyze button clicked for selection: ", textToAnalyze);
        console.log("TEXT ANALYZER (New): Sentence detection and API call not implemented in this step.");
        // Placeholder for where sentence detection and message sending will go:
        // const sentence = getSentenceAroundSelection(selectionObject); // Future function
        // chrome.runtime.sendMessage({ action: "analyzeText", sentence: sentence, selectedText: textToAnalyze }, response => { ... });
      }
      removeAnalysisButton(); // Remove button after click
    });
    console.log("CONTENT.JS: Attempting to append button:", analysisPopupButton);
    try {
      document.body.appendChild(analysisPopupButton);
      console.log("CONTENT.JS: Button supposedly appended. Button in DOM by ID:", document.getElementById(POPUP_BUTTON_ID));
    } catch (e) {
      console.error("CONTENT.JS: Error appending button to body:", e);
    }
  }
  // If button already exists, ensure it's visible or update its state if needed (not necessary for fixed pos)
}

function removeAnalysisButton() {
  console.log("CONTENT.JS: removeAnalysisButton called.");
  if (analysisPopupButton) {
    analysisPopupButton.remove();
    analysisPopupButton = null;
  }
}

document.addEventListener('mousedown', function(event) {
    // If the click is not on the selection itself and not on our button,
    // and a button exists, remove it.
    // This helps hide the button if the user clicks away from the selection.
    if (analysisPopupButton && event.target.id !== POPUP_BUTTON_ID) {
        const selection = window.getSelection();
        if (selection.isCollapsed) { // isCollapsed means no selection or just a caret
             removeAnalysisButton();
        }
    }
}, true); // Use capture phase to catch clicks early


// displayAnalysis function remains for future use when API calls are re-integrated
function displayAnalysis(originalElement, analysisText, isError) {
  if (!originalElement || !document.body.contains(originalElement)) {
    console.warn("Original element for analysis is no longer in the DOM. Cannot display analysis.");
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

// console.log("Text Analyzer AI Helper content script loaded.");
