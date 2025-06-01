console.log("CONTENT.JS: Script loaded/reloaded - v2 (reverted from long-click).");
let analysisDisplayIdCounter = 0;

// Variables for selection-based action buttons
let currentSelection = null;
let actionButtonsContainer = null;
const ACTION_BUTTON_CONTAINER_ID = 'textAnalysisExtensionActionContainer';

// Mouseup listener for text selection
document.addEventListener('mouseup', (event) => {
  console.log("CONTENT.JS: Mouseup event triggered (selection logic).");
  // If the click was on one of our action buttons, let their listeners handle it.
  if (event.target.tagName === 'BUTTON' && event.target.parentElement && event.target.parentElement.id === ACTION_BUTTON_CONTAINER_ID) {
    return;
  }

  currentSelection = document.getSelection();
  const selectedText = currentSelection.toString().trim();
  console.log("CONTENT.JS: Selected text (selection logic): '", selectedText, "'");

  if (selectedText) {
    console.log("TEXT ANALYZER: Text selected (selection logic) - ", selectedText);
    createOrShowActionButtons(currentSelection);
  } else {
    if(actionButtonsContainer) { // If no text selected, remove any existing button container
        removeActionButtons();
    }
  }
});

// Mousedown listener to clear buttons if clicking away from selection
document.addEventListener('mousedown', function(event) {
    if (actionButtonsContainer &&
        event.target.id !== ACTION_BUTTON_CONTAINER_ID &&
        !actionButtonsContainer.contains(event.target)) {
        const selection = window.getSelection();
        if (selection.isCollapsed) {
             removeActionButtons();
        }
    }
}, true); // Using capture as it was in the previous version for this functionality


function createOrShowActionButtons(selectionObject) {
  console.log("CONTENT.JS: createOrShowActionButtons called. Current container state:", actionButtonsContainer);
  if (!actionButtonsContainer) {
    actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.id = ACTION_BUTTON_CONTAINER_ID;
    actionButtonsContainer.style.position = 'absolute';
    actionButtonsContainer.style.zIndex = '99999';
    actionButtonsContainer.style.display = 'flex';
    actionButtonsContainer.style.gap = '3px';

    const tButton = document.createElement('button');
    tButton.textContent = 'T';
    tButton.style.padding = '5px 8px';
    tButton.style.fontSize = '0.85em';
    tButton.style.backgroundColor = '#4CAF50';
    tButton.style.color = 'white';
    tButton.style.border = '1px solid #388E3C';
    tButton.style.borderRadius = '3px';
    tButton.style.cursor = 'pointer';
    // Use currentSelection when T button is clicked, as selectionObject might be stale if not managed carefully
    tButton.addEventListener('click', () => handleActionButtonClick(window.getSelection(), "explainSelectionInSentence"));
    actionButtonsContainer.appendChild(tButton);

    const sButton = document.createElement('button');
    sButton.textContent = 'S';
    sButton.style.padding = '5px 8px';
    sButton.style.fontSize = '0.85em';
    sButton.style.backgroundColor = '#03A9F4';
    sButton.style.color = 'white';
    sButton.style.border = '1px solid #0288D1';
    sButton.style.borderRadius = '3px';
    sButton.style.cursor = 'pointer';
    // Use currentSelection when S button is clicked
    sButton.addEventListener('click', () => handleActionButtonClick(window.getSelection(), "analyzeWordForms"));
    actionButtonsContainer.appendChild(sButton);

    console.log("CONTENT.JS: Action buttons container created with T and S buttons.");

    try {
      document.body.appendChild(actionButtonsContainer);
      console.log("CONTENT.JS: Action buttons container appended to body.");
    } catch (e) {
      console.error("CONTENT.JS: Error appending action buttons container to body:", e);
      actionButtonsContainer = null;
      return;
    }
  }

  // Ensure selectionObject is valid and has ranges before trying to get a rect
  if (!selectionObject || selectionObject.rangeCount === 0) {
    console.warn("CONTENT.JS: createOrShowActionButtons called with no valid selection/range for positioning.");
    removeActionButtons(); // Remove if we can't position
    return;
  }
  const range = selectionObject.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  actionButtonsContainer.style.top = (rect.bottom + window.scrollY + 3) + 'px';
  actionButtonsContainer.style.left = (rect.left + window.scrollX) + 'px';
  console.log("CONTENT.JS: Action buttons container positioned.");
}

function handleActionButtonClick(selectionForContext, actionType) {
  console.log(`CONTENT.JS: ${actionType} action triggered.`);

  // Ensure we're using the most current selection state, especially if `selectionForContext` might be stale.
  // `window.getSelection()` is generally reliable for the current user selection at event time.
  const activeSelectionToProcess = selectionForContext || window.getSelection();

  if (activeSelectionToProcess && activeSelectionToProcess.toString().trim()) {
    // For `getSentenceContext`, it internally uses `window.getSelection()`.
    // We need to ensure the selection it sees is the one we intend.
    // If `activeSelectionToProcess` is different from current `window.getSelection()`,
    // (e.g. if it was from a long-click context that temporarily changed selection),
    // we'd need to re-apply it. For simple selection, `activeSelectionToProcess` IS `window.getSelection()`.
    // The version before long-click didn't have complex selection restoration for this handler.
    // It relied on `currentSelection` passed from the button creation or `window.getSelection()`.

    const context = getSentenceContext(activeSelectionToProcess);

    if (context && context.selectedText && context.anchorElement) {
      console.log("CONTENT.JS: Sending to background for action:", actionType, { sentence: context.sentence, selectedText: context.selectedText });

      chrome.runtime.sendMessage(
        {
          action: actionType,
          sentence: context.sentence,
          selectedText: context.selectedText
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(`CONTENT.JS: Error sending message for ${actionType}:`, chrome.runtime.lastError.message);
            displayAnalysis(context.anchorElement, `Error: ${chrome.runtime.lastError.message}`, true);
            return;
          }
          if (response) {
            if (response.error) {
              console.error(`CONTENT.JS: Error from background for ${actionType}:`, response.error);
              displayAnalysis(context.anchorElement, `Error: ${response.error}`, true);
            } else if (response.analysis) {
              console.log(`CONTENT.JS: Analysis received from background for ${actionType}.`);
              displayAnalysis(context.anchorElement, response.analysis, false);
            } else {
              console.warn(`CONTENT.JS: Received empty/unexpected response for ${actionType}.`);
              displayAnalysis(context.anchorElement, "Received an empty or unexpected response.", true);
            }
          } else {
            console.warn(`CONTENT.JS: No response from background for ${actionType}.`);
            displayAnalysis(context.anchorElement, "No response received from the analysis service.", true);
          }
        }
      );
    } else {
      console.warn("CONTENT.JS: Could not get valid sentence context for action:", actionType);
    }
  } else {
    console.warn(`CONTENT.JS: No valid selection found when ${actionType} was triggered.`);
  }
  removeActionButtons();
}

function removeActionButtons() {
  console.log("CONTENT.JS: removeActionButtons called.");
  if (actionButtonsContainer) {
    actionButtonsContainer.remove();
    actionButtonsContainer = null;
  }
}

function getSentenceContext(selectionObject) {
  if (!selectionObject || selectionObject.rangeCount === 0) {
    console.warn("getSentenceContext: Invalid selection object or no range.");
    return null;
  }

  const selectedText = selectionObject.toString().trim();
  if (!selectedText) {
    console.warn("getSentenceContext: Selected text is empty.");
    return { sentence: "", selectedText: "", anchorElement: document.body };
  }

  const range = selectionObject.getRangeAt(0);
  let commonAncestor = range.commonAncestorContainer;

  let anchorElement = commonAncestor;
  if (anchorElement.nodeType === Node.TEXT_NODE) {
    anchorElement = anchorElement.parentElement;
  }

  let currentElementForContext = anchorElement;
  while (currentElementForContext && currentElementForContext !== document.body) {
    // Check if parentElement is null before trying to get its display style or tagName
    if (!currentElementForContext.parentElement) {
        anchorElement = document.body; // Fallback if we somehow detach from body
        break;
    }
    const displayStyle = window.getComputedStyle(currentElementForContext).display;
    const tagName = currentElementForContext.tagName.toUpperCase();
    if (['BLOCK', 'LIST-ITEM', 'TABLE-CELL'].includes(displayStyle.toUpperCase()) ||
        ['P', 'DIV', 'LI', 'TD', 'ARTICLE', 'SECTION', 'ASIDE', 'MAIN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      anchorElement = currentElementForContext;
      break;
    }
    currentElementForContext = currentElementForContext.parentElement;
  }

  const fullText = anchorElement.textContent || "";
  if (!fullText) {
    console.warn("getSentenceContext: Anchor element has no text content.", anchorElement);
    return { sentence: selectedText, selectedText: selectedText, anchorElement: anchorElement };
  }

  let startIndexInFullText = fullText.indexOf(selectedText);

  if (startIndexInFullText === -1 && range.startContainer.parentElement) {
      const directParentText = range.startContainer.parentElement.textContent || "";
      startIndexInFullText = directParentText.indexOf(selectedText);
  }

  if (startIndexInFullText === -1) {
    console.warn("getSentenceContext: Selected text not reliably found in anchor's textContent. Using selected text as sentence.", anchorElement, "Full text checked:", fullText.substring(0, 200));
    return { sentence: selectedText, selectedText: selectedText, anchorElement: anchorElement };
  }

  const endIndexInFullText = startIndexInFullText + selectedText.length;
  const sentenceEndChars = ".?!";
  let sentenceStartIndex = startIndexInFullText;

  while (sentenceStartIndex > 0) {
    const charBefore = fullText[sentenceStartIndex - 1];
    if (sentenceEndChars.includes(charBefore) && (sentenceStartIndex < fullText.length && (fullText[sentenceStartIndex] === ' ' || fullText[sentenceStartIndex] === '\n'))) {
      break;
    }
    sentenceStartIndex--;
  }

  let sentenceEndIndex = endIndexInFullText;
  while (sentenceEndIndex < fullText.length) {
    const charAt = fullText[sentenceEndIndex];
    if (sentenceEndChars.includes(charAt)) {
      sentenceEndIndex++;
      break;
    }
    sentenceEndIndex++;
  }

  let sentence = fullText.substring(sentenceStartIndex, sentenceEndIndex).trim();

  if (!sentence.includes(selectedText) || sentence.length > selectedText.length + 500) {
    console.warn("getSentenceContext: Derived sentence too long or does not contain selected text. Using a smaller local context.");
    const contextRadius = 150;
    const localStart = Math.max(0, startIndexInFullText - contextRadius);
    const correctedLocalEnd = Math.min(fullText.length, (startIndexInFullText + selectedText.length) + contextRadius);
    sentence = fullText.substring(localStart, correctedLocalEnd).trim();
    if (!sentence.includes(selectedText)) {
        sentence = selectedText;
    }
  }

  console.log("CONTENT.JS: getSentenceContext: ", { sentence: sentence, selectedText: selectedText, anchorElement: anchorElement });
  return { sentence, selectedText, anchorElement };
}

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
  analysisDiv.style.position = 'absolute';
  analysisDiv.style.zIndex = '100000';
  analysisDiv.style.marginTop = '5px';
  analysisDiv.style.padding = '10px';
  analysisDiv.style.border = '1px solid #ccc';
  analysisDiv.style.backgroundColor = isError ? '#fff0f0' : '#f9f9f9';
  analysisDiv.style.fontSize = '0.9em';
  analysisDiv.style.fontFamily = 'sans-serif';
  analysisDiv.style.color = isError ? 'red' : '#333';
  analysisDiv.style.textAlign = 'left';
  analysisDiv.style.whiteSpace = 'pre-wrap';
  analysisDiv.style.boxShadow = '0px 2px 5px rgba(0,0,0,0.1)';
  analysisDiv.style.maxWidth = '400px';

  analysisDiv.textContent = analysisText;

  const anchorRect = originalElement.getBoundingClientRect();
  analysisDiv.style.top = (anchorRect.bottom + window.scrollY + 5) + 'px';
  analysisDiv.style.left = (anchorRect.left + window.scrollX) + 'px';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '3px';
  closeButton.style.right = '3px';
  closeButton.style.padding = '1px 5px';
  closeButton.style.fontSize = '0.8em';
  closeButton.style.backgroundColor = '#eee';
  closeButton.style.border = '1px solid #ccc';
  closeButton.style.borderRadius = '50%';
  closeButton.style.cursor = 'pointer';
  closeButton.style.lineHeight = '1';

  closeButton.onclick = (e) => {
    e.stopPropagation();
    analysisDiv.remove();
  };
  analysisDiv.appendChild(closeButton);

  document.body.appendChild(analysisDiv);
}
// console.log("Text Analyzer AI Helper content script loaded."); // This was the final log in that version.
