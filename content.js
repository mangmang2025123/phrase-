console.log("CONTENT.JS: Script loaded/reloaded - v2.");
// let lastHoveredElement = null; // Old listener, commented out
let analysisDisplayIdCounter = 0; // To give unique IDs to analysis divs if needed - Keep for displayAnalysis

// Old listeners commented out (from previous steps)
// document.addEventListener('mouseover', ...);
// document.addEventListener('keydown', ...);

let currentSelection = null; // To store the current Selection object
// let analysisPopupButton = null; // Old single button reference
// const POPUP_BUTTON_ID = 'textAnalysisExtensionPopupButton'; // Old ID

let actionButtonsContainer = null; // Will hold both T and S buttons
const ACTION_BUTTON_CONTAINER_ID = 'textAnalysisExtensionActionContainer';

document.addEventListener('mouseup', (event) => {
  console.log("CONTENT.JS: Mouseup event triggered.");
  // If the click was on one of our action buttons, let their listeners handle it.
  if (event.target.tagName === 'BUTTON' && event.target.parentElement && event.target.parentElement.id === ACTION_BUTTON_CONTAINER_ID) {
    return;
  }

  currentSelection = document.getSelection();
  const selectedText = currentSelection.toString().trim();
  console.log("CONTENT.JS: Selected text: '", selectedText, "'");

  if (selectedText) {
    console.log("TEXT ANALYZER (New): Text selected - ", selectedText);
    createOrShowActionButtons(currentSelection);
  } else {
    if(actionButtonsContainer) { // If no text selected, remove any existing button container
        removeActionButtons();
    }
  }
});

function createOrShowActionButtons(selectionObject) {
  console.log("CONTENT.JS: createOrShowActionButtons called. Current container state:", actionButtonsContainer);
  if (!actionButtonsContainer) {
    actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.id = ACTION_BUTTON_CONTAINER_ID;
    actionButtonsContainer.style.position = 'absolute';
    actionButtonsContainer.style.zIndex = '99999';
    actionButtonsContainer.style.display = 'flex'; // Arrange buttons in a row
    actionButtonsContainer.style.gap = '3px'; // Space between buttons

    // Create 'T' button
    const tButton = document.createElement('button');
    tButton.textContent = 'T';
    tButton.style.padding = '5px 8px';
    tButton.style.fontSize = '0.85em';
    tButton.style.backgroundColor = '#4CAF50';
    tButton.style.color = 'white';
    tButton.style.border = '1px solid #388E3C';
    tButton.style.borderRadius = '3px';
    tButton.style.cursor = 'pointer';
    tButton.addEventListener('click', () => handleActionButtonClick(currentSelection, "explainSelectionInSentence"));
    actionButtonsContainer.appendChild(tButton);

    // Create 'S' button
    const sButton = document.createElement('button');
    sButton.textContent = 'S';
    sButton.style.padding = '5px 8px';
    sButton.style.fontSize = '0.85em';
    sButton.style.backgroundColor = '#03A9F4';
    sButton.style.color = 'white';
    sButton.style.border = '1px solid #0288D1';
    sButton.style.borderRadius = '3px';
    sButton.style.cursor = 'pointer';
    sButton.addEventListener('click', () => handleActionButtonClick(currentSelection, "analyzeWordForms"));
    actionButtonsContainer.appendChild(sButton);

    console.log("CONTENT.JS: Action buttons container created with T and S buttons.");

    try {
      document.body.appendChild(actionButtonsContainer);
      console.log("CONTENT.JS: Action buttons container appended to body.");
    } catch (e) {
      console.error("CONTENT.JS: Error appending action buttons container to body:", e);
      actionButtonsContainer = null; // Reset if append failed
      return;
    }
  }

  // Positioning logic (applies to the container)
  const range = selectionObject.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  actionButtonsContainer.style.top = (rect.bottom + window.scrollY + 3) + 'px';
  actionButtonsContainer.style.left = (rect.left + window.scrollX) + 'px';
  console.log("CONTENT.JS: Action buttons container positioned.");
}

function handleActionButtonClick(selectionForContext, actionType) {
  console.log(`CONTENT.JS: ${actionType} action triggered.`);
  if (selectionForContext && selectionForContext.toString().trim()) {
    const context = getSentenceContext(selectionForContext); // Existing function

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
  removeActionButtons(); // Remove container (and thus both buttons)
}

function removeActionButtons() {
  console.log("CONTENT.JS: removeActionButtons called.");
  if (actionButtonsContainer) {
    actionButtonsContainer.remove();
    actionButtonsContainer = null;
  }
}

document.addEventListener('mousedown', function(event) {
    if (actionButtonsContainer &&
        event.target.id !== ACTION_BUTTON_CONTAINER_ID &&
        !actionButtonsContainer.contains(event.target)) {
        const selection = window.getSelection();
        if (selection.isCollapsed) {
             removeActionButtons();
        }
    }
}, true);


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
    const displayStyle = window.getComputedStyle(currentElementForContext).display;
    const tagName = currentElementForContext.tagName.toUpperCase();
    if (['BLOCK', 'LIST-ITEM', 'TABLE-CELL'].includes(displayStyle.toUpperCase()) ||
        ['P', 'DIV', 'LI', 'TD', 'ARTICLE', 'SECTION', 'ASIDE', 'MAIN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      anchorElement = currentElementForContext;
      break;
    }
    if (!currentElementForContext.parentElement) break;
    currentElementForContext = currentElementForContext.parentElement;
  }

  const fullText = anchorElement.textContent || "";
  if (!fullText) {
    console.warn("getSentenceContext: Anchor element has no text content.", anchorElement);
    return { sentence: selectedText, selectedText: selectedText, anchorElement: anchorElement };
  }

  let startIndexInFullText = fullText.indexOf(selectedText);

  if (startIndexInFullText === -1 && range.startContainer.textContent) {
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
    if (sentenceEndChars.includes(charBefore) && (fullText[sentenceStartIndex] === ' ' || fullText[sentenceStartIndex] === '\n')) {
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
    const localEnd = Math.min(fullText.length, endIndexInFullText + contextRadius); // endIndexInFullText was used here, should be startIndexInFullText + selectedText.length
    // Correcting localEnd based on definition of endIndexInFullText
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
