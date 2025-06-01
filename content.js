console.log("CONTENT.JS: Script loaded/reloaded - v2."); // Existing log
let analysisDisplayIdCounter = 0;

// --- Long Click Variables ---
let longClickTimer = null;
let mouseDownX = 0;
let mouseDownY = 0;
let mouseDownTarget = null;
let isStillConsideredMouseDown = false;
const LONG_CLICK_DELAY = 500; // milliseconds
const MOUSE_MOVE_THRESHOLD = 5; // pixels

// --- Selection Action Button Variables (from previous steps) ---
let currentSelection = null;
let actionButtonsContainer = null;
const ACTION_BUTTON_CONTAINER_ID = 'textAnalysisExtensionActionContainer';


// === New Long-Click Event Listeners ===

document.addEventListener('mousedown', (event) => {
  // Long-click specific mousedown logic
  if (event.button !== 0) { // Only left clicks for long-click
    return;
  }

  mouseDownTarget = event.target;
  mouseDownX = event.clientX;
  mouseDownY = event.clientY;
  isStillConsideredMouseDown = true;

  if (longClickTimer) {
    clearTimeout(longClickTimer);
    longClickTimer = null;
  }

  longClickTimer = setTimeout(() => {
    handleLongClickTrigger(mouseDownTarget, mouseDownX, mouseDownY);
  }, LONG_CLICK_DELAY);

  console.log("CONTENT.JS: mousedown (long-click candidate), longClickTimer started.", longClickTimer);

  // Existing mousedown logic for clearing selection buttons (from previous version)
  // This needs to be reconciled. For now, it runs after the long-click mousedown logic.
  // If a long click is in progress, this might prematurely clear the timer if not careful.
  // The `isStillConsideredMouseDown` might help, or the order of listeners.
  // Using capture for long-click mousedown ensures it runs first.
  if (actionButtonsContainer &&
      event.target.id !== ACTION_BUTTON_CONTAINER_ID &&
      !actionButtonsContainer.contains(event.target)) {
      const selection = window.getSelection();
      if (selection.isCollapsed) {
           removeActionButtons(); // This is for the T/S buttons
      }
  }
}, true); // Use capture phase for mousedown

document.addEventListener('mouseup', (event) => {
  // Long-click specific mouseup logic
  if (event.button !== 0) { // Only left clicks
    return;
  }

  if (longClickTimer) {
    clearTimeout(longClickTimer);
    longClickTimer = null;
    console.log("CONTENT.JS: mouseup (long-click), longClickTimer cleared.");
  }
  isStillConsideredMouseDown = false;

  // Existing mouseup logic for text selection (from previous version)
  // This will run AFTER the long-click mouseup logic due to capture on long-click's mouseup.
  console.log("CONTENT.JS: Mouseup event triggered (selection part).");
  if (event.target.tagName === 'BUTTON' && event.target.parentElement && event.target.parentElement.id === ACTION_BUTTON_CONTAINER_ID) {
    return;
  }

  currentSelection = document.getSelection();
  const selectedText = currentSelection.toString().trim();
  console.log("CONTENT.JS: Selected text (selection part): '", selectedText, "'");

  if (selectedText) {
    console.log("TEXT ANALYZER (New): Text selected (selection part) - ", selectedText);
    createOrShowActionButtons(currentSelection);
  } else {
    if(actionButtonsContainer) {
        removeActionButtons();
    }
  }
}, true); // Use capture phase for long-click mouseup

document.addEventListener('mousemove', (event) => {
  if (isStillConsideredMouseDown) {
    const deltaX = Math.abs(event.clientX - mouseDownX);
    const deltaY = Math.abs(event.clientY - mouseDownY);

    if (deltaX > MOUSE_MOVE_THRESHOLD || deltaY > MOUSE_MOVE_THRESHOLD) {
      if (longClickTimer) {
        clearTimeout(longClickTimer);
        longClickTimer = null;
        console.log("CONTENT.JS: mousemove threshold exceeded, longClickTimer cleared.");
      }
      isStillConsideredMouseDown = false;
    }
  }
}, true); // Use capture phase

function handleLongClickTrigger(initialTarget, initialX, initialY) {
  if (isStillConsideredMouseDown) {
    console.log("CONTENT.JS: Long-click successfully triggered on target:", initialTarget, "at x:", initialX, "y:", initialY);

    removeActionButtons(); // Hide T/S buttons if a selection previously showed them

    // Placeholder for future logic:
    // 1. Get word under cursor (initialX, initialY)
    // 2. Get sentence context for that word
    // 3. Call createOrShowActionButtons(...) with the new context / simulated selection

    isStillConsideredMouseDown = false;
  }
  longClickTimer = null;
}


// === Existing Action Button and Display Logic (from previous steps) ===

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
    tButton.addEventListener('click', () => handleActionButtonClick(currentSelection, "explainSelectionInSentence"));
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
    sButton.addEventListener('click', () => handleActionButtonClick(currentSelection, "analyzeWordForms"));
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

  const range = selectionObject.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  actionButtonsContainer.style.top = (rect.bottom + window.scrollY + 3) + 'px';
  actionButtonsContainer.style.left = (rect.left + window.scrollX) + 'px';
  console.log("CONTENT.JS: Action buttons container positioned.");
}

function handleActionButtonClick(selectionForContext, actionType) {
  console.log(`CONTENT.JS: ${actionType} action triggered.`);
  if (selectionForContext && selectionForContext.toString().trim()) {
    const context = getSentenceContext(selectionForContext);

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

  if (startIndexInFullText === -1 && range.startContainer.parentElement) { // Added null check for parentElement
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
  analysisDiv.style.position = 'absolute'; // Make analysis display absolute too
  analysisDiv.style.zIndex = '100000'; // Higher than action buttons
  analysisDiv.style.marginTop = '5px';
  analysisDiv.style.padding = '10px'; // Increased padding
  analysisDiv.style.border = '1px solid #ccc'; // More prominent border
  analysisDiv.style.backgroundColor = isError ? '#fff0f0' : '#f9f9f9'; // Error color
  analysisDiv.style.fontSize = '0.9em';
  analysisDiv.style.fontFamily = 'sans-serif';
  analysisDiv.style.color = isError ? 'red' : '#333';
  analysisDiv.style.textAlign = 'left';
  analysisDiv.style.whiteSpace = 'pre-wrap';
  analysisDiv.style.boxShadow = '0px 2px 5px rgba(0,0,0,0.1)'; // Add shadow
  analysisDiv.style.maxWidth = '400px'; // Max width for readability

  analysisDiv.textContent = analysisText;

  // Position analysis div below the originalElement (which is anchorElement from context)
  const anchorRect = originalElement.getBoundingClientRect();
  analysisDiv.style.top = (anchorRect.bottom + window.scrollY + 5) + 'px';
  analysisDiv.style.left = (anchorRect.left + window.scrollX) + 'px';


  const closeButton = document.createElement('button');
  closeButton.textContent = 'X'; // Simpler close button
  closeButton.style.position = 'absolute';
  closeButton.style.top = '3px';
  closeButton.style.right = '3px';
  closeButton.style.padding = '1px 5px';
  closeButton.style.fontSize = '0.8em';
  closeButton.style.backgroundColor = '#eee';
  closeButton.style.border = '1px solid #ccc';
  closeButton.style.borderRadius = '50%';
  closeButton.style.cursor = 'pointer';
  closeButton.style.lineHeight = '1'; // Ensure X is centered if padding makes it tall

  closeButton.onclick = (e) => {
    e.stopPropagation(); // Prevent click from bubbling to other listeners
    analysisDiv.remove();
  };
  analysisDiv.appendChild(closeButton);

  document.body.appendChild(analysisDiv); // Append to body for absolute positioning freedom
}
// console.log("Text Analyzer AI Helper content script loaded.");
