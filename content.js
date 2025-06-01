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
    analysisPopupButton.textContent = 'T';

    // Styling for dynamic positioning and smaller size
    analysisPopupButton.style.position = 'absolute';
    analysisPopupButton.style.zIndex = '99999'; // Ensure it's on top
    analysisPopupButton.style.padding = '5px 10px';
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
      // Inside analysisPopupButton.addEventListener('click', () => { ... });

      if (currentSelection && currentSelection.toString().trim()) {
        const context = getSentenceContext(currentSelection);

        if (context && context.sentence && context.selectedText && context.anchorElement) {
          console.log("CONTENT.JS: Sending to background for analysis:", { sentence: context.sentence, selectedText: context.selectedText });

          chrome.runtime.sendMessage(
            {
              action: "analyzeText", // This is the action background.js expects
              sentence: context.sentence,
              selectedText: context.selectedText
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("CONTENT.JS: Error sending message to background:", chrome.runtime.lastError.message);
                // Optionally, display this error using displayAnalysis
                // displayAnalysis(context.anchorElement, `Error sending message: ${chrome.runtime.lastError.message}`, true);
                return;
              }
              if (response) {
                if (response.error) {
                  console.error("CONTENT.JS: Error from background script:", response.error);
                  displayAnalysis(context.anchorElement, `Error: ${response.error}`, true);
                } else if (response.analysis) {
                  console.log("CONTENT.JS: Analysis received from background.");
                  displayAnalysis(context.anchorElement, response.analysis, false);
                } else {
                  console.warn("CONTENT.JS: Received empty or unexpected response from background.");
                   displayAnalysis(context.anchorElement, "Received an empty or unexpected response from the analysis service.", true);
                }
              } else {
                   console.warn("CONTENT.JS: No response from background script.");
                   displayAnalysis(context.anchorElement, "No response received from the analysis service.", true);
              }
            }
          );
        } else {
          console.warn("CONTENT.JS: Could not get valid sentence context for analysis.");
          // Optionally inform the user if context is invalid
          // alert("Could not determine the context of the selected text.");
        }
      } else {
        console.warn("CONTENT.JS: No valid selection found when 'T' button was clicked.");
      }

      removeAnalysisButton(); // This should already be here, ensures button is removed after click.
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


function getSentenceContext(selectionObject) {
  if (!selectionObject || selectionObject.rangeCount === 0) {
    console.warn("getSentenceContext: Invalid selection object or no range.");
    return null;
  }

  const selectedText = selectionObject.toString().trim();
  if (!selectedText) {
    // This case should ideally be handled by the caller (mouseup listener)
    // which shouldn't call getSentenceContext if selectedText is empty.
    console.warn("getSentenceContext: Selected text is empty.");
    return { sentence: "", selectedText: "", anchorElement: document.body };
  }

  const range = selectionObject.getRangeAt(0);
  let commonAncestor = range.commonAncestorContainer;

  // Determine a suitable anchorElement for text content and later for displaying analysis
  let anchorElement = commonAncestor;
  if (anchorElement.nodeType === Node.TEXT_NODE) {
    anchorElement = anchorElement.parentElement;
  }

  // Traverse up to find a more significant block-level element or a common container like P, DIV, ARTICLE, etc.
  let currentElementForContext = anchorElement;
  while (currentElementForContext && currentElementForContext !== document.body) {
    const displayStyle = window.getComputedStyle(currentElementForContext).display;
    const tagName = currentElementForContext.tagName.toUpperCase();
    if (['BLOCK', 'LIST-ITEM', 'TABLE-CELL'].includes(displayStyle.toUpperCase()) ||
        ['P', 'DIV', 'LI', 'TD', 'ARTICLE', 'SECTION', 'ASIDE', 'MAIN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      anchorElement = currentElementForContext; // Found a good block-level container
      break;
    }
    if (!currentElementForContext.parentElement) break; // Should not happen before hitting body
    currentElementForContext = currentElementForContext.parentElement;
  }


  const fullText = anchorElement.textContent || "";
  if (!fullText) {
    console.warn("getSentenceContext: Anchor element has no text content.", anchorElement);
    // Fallback: sentence is just selected text, anchor is what we found
    return { sentence: selectedText, selectedText: selectedText, anchorElement: anchorElement };
  }

  let startIndexInFullText = fullText.indexOf(selectedText);

  // If selectedText is not found directly (e.g. due to normalization or complex structure),
  // try to find it within a more limited scope around the selection's direct parent.
  if (startIndexInFullText === -1 && range.startContainer.textContent) {
      const directParentText = range.startContainer.parentElement.textContent || "";
      startIndexInFullText = directParentText.indexOf(selectedText);
      if (startIndexInFullText !== -1) {
          // Found in direct parent, use this as fullText for sentence detection
          // This is a heuristic and might not always be the "fullest" context but better than nothing.
          // fullText = directParentText; // This line was commented as it made it worse in testing.
          // For now, if not found in broader anchor, this will lead to fallback.
      } else {
         // Still not found, prepare for fallback
      }
  }


  if (startIndexInFullText === -1) {
    console.warn("getSentenceContext: Selected text not reliably found in anchor's textContent. Using selected text as sentence.", anchorElement, "Full text checked:", fullText.substring(0, 200));
    return { sentence: selectedText, selectedText: selectedText, anchorElement: anchorElement };
  }

  const endIndexInFullText = startIndexInFullText + selectedText.length;

  // Simplified sentence terminators: '.', '?', '!'
  // More refined regex: /(?<!(?:Mr|Mrs|Ms|Dr|Sr|Jr|Inc|Ltd|Co|e\.g|i\.e))\s*[.?!](?!\s*\w)/g
  // Simpler for now:
  const sentenceEndChars = ".?!";

  let sentenceStartIndex = startIndexInFullText;
  while (sentenceStartIndex > 0) {
    const charBefore = fullText[sentenceStartIndex - 1];
    if (sentenceEndChars.includes(charBefore) && (fullText[sentenceStartIndex] === ' ' || fullText[sentenceStartIndex] === '\n')) { // Check for space/newline after terminator
      break;
    }
    sentenceStartIndex--;
  }
   // Adjust if loop ended at 0 but first char isn't start of sentence (e.g. space)
  if (sentenceStartIndex > 0 && fullText[sentenceStartIndex -1] !== ' ' && !sentenceEndChars.includes(fullText[sentenceStartIndex-1])) {
      // This means we might be in middle of word or sentence start.
      // No, if sentenceStartIndex is > 0, it means fullText[sentenceStartIndex-1] was a terminator or loop finished.
      // If fullText[sentenceStartIndex] is a space, trim it.
  }


  let sentenceEndIndex = endIndexInFullText;
  while (sentenceEndIndex < fullText.length) {
    const charAt = fullText[sentenceEndIndex];
    if (sentenceEndChars.includes(charAt)) {
      sentenceEndIndex++; // include the terminator
      break;
    }
    sentenceEndIndex++;
  }

  let sentence = fullText.substring(sentenceStartIndex, sentenceEndIndex).trim();

  // Fallback / Sanity check: If derived sentence is huge or doesn't contain selected text, use a simpler context.
  // This can happen if the selected text itself contains sentence-like structures or if block element is too large.
  if (!sentence.includes(selectedText) || sentence.length > selectedText.length + 500) { // Max 500 chars of context
    console.warn("getSentenceContext: Derived sentence too long or does not contain selected text. Using a smaller local context.");
    // Create a smaller context around the selection
    const contextRadius = 150; // Characters before and after
    const localStart = Math.max(0, startIndexInFullText - contextRadius);
    const localEnd = Math.min(fullText.length, endIndexInFullText + contextRadius);
    sentence = fullText.substring(localStart, localEnd).trim();
    // If even this doesn't contain selectedText (should be rare), fallback to just selectedText
    if (!sentence.includes(selectedText)) {
        sentence = selectedText;
    }
  }

  console.log("CONTENT.JS: getSentenceContext: ", { sentence: sentence, selectedText: selectedText, anchorElement: anchorElement });
  return { sentence, selectedText, anchorElement };
}


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
