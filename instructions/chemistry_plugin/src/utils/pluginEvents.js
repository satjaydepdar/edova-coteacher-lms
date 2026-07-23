let hostCallbacks = {
  onReady: () => {},
  onChapterStart: () => {},
  onChapterComplete: () => {},
  onQuizComplete: () => {},
  onProgressUpdate: () => {},
  onError: () => {},
  onUnmount: () => {},
};

/**
 * Configure callbacks provided by the host application
 */
export const setHostCallbacks = (callbacks) => {
  if (!callbacks) return;
  hostCallbacks = {
    ...hostCallbacks,
    ...callbacks,
  };
};

/**
 * Trigger an event, calling the host-supplied callback and dispatching a CustomEvent on the window
 */
export const triggerEvent = (eventName, data = {}) => {
  // 1. Call the react prop callback if it exists
  if (hostCallbacks[eventName] && typeof hostCallbacks[eventName] === 'function') {
    try {
      hostCallbacks[eventName](data);
    } catch (err) {
      console.error(`[Plugin Error] Error executing host callback for '${eventName}':`, err);
    }
  }

  // 2. Dispatch a custom DOM Event on the window for non-React or generic hosts
  try {
    const customEvent = new CustomEvent(`edova:${eventName}`, {
      detail: data,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(customEvent);
  } catch (err) {
    console.error(`[Plugin Error] Failed to dispatch CustomEvent for '${eventName}':`, err);
  }
};
