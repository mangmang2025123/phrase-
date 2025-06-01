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
let longClickProcessed = false; // Flag to coordinate long-click vs selection


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
  longClickProcessed = false; // Reset flag on new mousedown

  if (longClickTimer) {
    clearTimeout(longClickTimer);
    longClickTimer = null;
  }

  longClickTimer = setTimeout(() => {
    handleLongClickTrigger(mouseDownTarget, mouseDownX, mouseDownY);
  }, LONG_CLICK_DELAY);

  console.log("CONTENT.JS: mousedown (long-click candidate), longClickTimer started.", longClickTimer);

  if (actionButtonsContainer &&
      event.target.id !== ACTION_BUTTON_CONTAINER_ID &&
      !actionButtonsContainer.contains(event.target)) {
      const selection = window.getSelection();
      if (selection.isCollapsed) {
           removeActionButtons();
      }
  }
}, true);

document.addEventListener('mouseup', (event) => {
  if (event.button !== 0) {
    return;
  }

  if (longClickTimer) {
    clearTimeout(longClickTimer);
    longClickTimer = null;
    console.log("CONTENT.JS: mouseup (long-click timer cleared as it didn't fire).");
  }

  if (longClickProcessed) {
    console.log("CONTENT.JS: mouseup after longClickProcessed. Resetting flags.");
    isStillConsideredMouseDown = false;
    longClickProcessed = false;
    // Potentially do not proceed to selection logic if long click handled it.
    // However, user might still want to select something else.
    // For now, let selection logic proceed but be mindful of button state.
    // removeActionButtons(); // Ensure long-click buttons are gone if user starts new selection.
    // This might be too aggressive if the user wants to interact with long-click buttons.
    // The buttons remove themselves on click.
    return; // Stop further processing for this mouseup if it was part of a processed long-click.
  }

  isStillConsideredMouseDown = false; // Reset if it was a short click or mousemove cancelled.

  console.log("CONTENT.JS: Mouseup event triggered (standard selection part).");
  if (event.target.tagName === 'BUTTON' && event.target.parentElement && event.target.parentElement.id === ACTION_BUTTON_CONTAINER_ID) {
    return;
  }

  currentSelection = document.getSelection();
  const selectedText = currentSelection.toString().trim();
  console.log("CONTENT.JS: Selected text (standard selection part): '", selectedText, "'");

  if (selectedText) {
    console.log("TEXT ANALYZER (New): Text selected (standard selection part) - ", selectedText);
    createOrShowActionButtons(currentSelection);
  } else {
    if(actionButtonsContainer) {
        removeActionButtons();
    }
  }
}, true);

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
}, true);

function handleLongClickTrigger(initialTarget, initialX, initialY) {
  if (isStillConsideredMouseDown) {
    console.log("CONTENT.JS: Long-click successfully triggered on target:", initialTarget, "at x:", initialX, "y:", initialY);
    let wordFound = false;

    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(initialX, initialY);
      if (range) {
        try {
          range.expand('word');
          const word = range.toString().trim();
          console.log("CONTENT.JS: Word identified by range.expand('word'): '", word, "' Range:", range);

          if (word) {
            processLongClickedWord(word, range, initialTarget);
            wordFound = true;
          } else {
            console.warn("CONTENT.JS: Long-click - range.expand('word') did not yield a word.");
          }
        } catch (e) {
          console.warn("CONTENT.JS: Long-click - error during range.expand('word'):", e);
        }
      } else {
        console.warn("CONTENT.JS: Long-click - document.caretRangeFromPoint returned no range.");
      }
    } else {
      console.warn("CONTENT.JS: Long-click - document.caretRangeFromPoint is not supported in this browser/context.");
    }

    if (!wordFound) {
      removeActionButtons();
      isStillConsideredMouseDown = false;
      longClickProcessed = false; // Ensure flag is reset if we don't proceed
    }
    // If wordFound, processLongClickedWord sets longClickProcessed = true.
    // isStillConsideredMouseDown will be reset by the subsequent mouseup via longClickProcessed.
  }
  longClickTimer = null;
}

function processLongClickedWord(word, wordRange, clickTargetElement) {
  console.log("CONTENT.JS: Processing long-clicked word:'", word, "' with range:", wordRange, "and initial target:", clickTargetElement);

  if (!word || !wordRange) {
    console.warn("CONTENT.JS: processLongClickedWord - Invalid word or range provided.");
    removeActionButtons();
    isStillConsideredMouseDown = false;
    longClickProcessed = false;
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    console.error("CONTENT.JS: processLongClickedWord - window.getSelection() is not available or returned null.");
    removeActionButtons();
    isStillConsideredMouseDown = false;
    longClickProcessed = false;
    return;
  }

  const originalRanges = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    originalRanges.push(selection.getRangeAt(i).cloneRange());
  }
  selection.removeAllRanges();
  selection.addRange(wordRange.cloneRange()); // Use a clone to avoid modifying the original wordRange if needed later

  const context = getSentenceContext(selection);

  selection.removeAllRanges();
  originalRanges.forEach(originalRange => {
    selection.addRange(originalRange);
  });

  if (context && context.sentence && context.anchorElement) {
    console.log("CONTENT.JS: Long-click - Context found:", context);
    removeActionButtons();

    selection.removeAllRanges(); // Ensure selection is clean before adding the word range for button positioning
    selection.addRange(wordRange.cloneRange()); // Add cloned wordRange for createOrShowActionButtons

    createOrShowActionButtons(selection);

    longClickProcessed = true;
  } else {
    console.warn("CONTENT.JS: Long-click - Could not get sentence context for the identified word:", word);
    removeActionButtons();
    isStillConsideredMouseDown = false;
    longClickProcessed = false;
  }
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
  // Use the current window selection at the moment of click,
  // or the selectionForContext if it's guaranteed to be the relevant one (e.g., for long-click)
  let activeSelection = window.getSelection();
  if (selectionForContext && selectionForContext.rangeCount > 0 && selectionForContext.toString().trim() !== "") {
      // If selectionForContext (passed from long-click's temporary selection) is valid, use it.
      // This is important because window.getSelection() might have changed if user clicked elsewhere slightly
      // before the button click event fired, or if restoring original selection cleared it.
      activeSelection = selectionForContext;
       console.log("CONTENT.JS: Using selectionForContext for API call", activeSelection.toString());
  } else {
      console.log("CONTENT.JS: Using current window.getSelection() for API call", activeSelection.toString());
  }


  if (activeSelection && activeSelection.toString().trim()) {
    // Important: getSentenceContext itself uses window.getSelection().
    // So, we must ensure the 'activeSelection' (which is the word from long-click, or user's selection)
    // is the one window.getSelection() will return when getSentenceContext is called.
    const tempRanges = [];
    const currentGlobalSelection = window.getSelection();
    for (let i = 0; i < currentGlobalSelection.rangeCount; i++) {
        tempRanges.push(currentGlobalSelection.getRangeAt(i).cloneRange());
    }
    currentGlobalSelection.removeAllRanges();
    // Add the range from activeSelection (which should be the word range for long-click, or user's selection)
    if (activeSelection.rangeCount > 0) {
        currentGlobalSelection.addRange(activeSelection.getRangeAt(0).cloneRange());
    } else {
        console.warn("CONTENT.JS: activeSelection had no range to add for getSentenceContext.");
        // Restore original global selection and bail
        tempRanges.forEach(r => currentGlobalSelection.addRange(r));
        removeActionButtons();
        return;
    }

    const context = getSentenceContext(currentGlobalSelection);

    // Restore previous global selection state
    currentGlobalSelection.removeAllRanges();
    tempRanges.forEach(r => currentGlobalSelection.addRange(r));


    if (context && context.selectedText && context.anchorElement) {
      console.log("CONTENT.JS: Sending to background for action:", actionType, { sentence: context.sentence, selectedText: context.selectedText });

      chrome.runtime.sendMessage(
        {
          action: actionType,
          sentence: context.sentence,
          selectedText: context.selectedText // This selectedText is from getSentenceContext
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
// console.log("Text Analyzer AI Helper content script loaded.");
