import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { setHostCallbacks, triggerEvent } from './utils/pluginEvents';
import './index.css';

// Keep track of all active React roots by container
const activeRoots = new Map();

/**
 * Mounts the Chemistry learning module into the host container.
 * 
 * @param {HTMLElement} container - DOM container element to mount within.
 * @param {Object} props - Custom configuration and event callbacks.
 */
export function mount(container, props = {}) {
  if (!container) {
    console.error('[Plugin Error] A valid DOM container element is required to mount the plugin.');
    return;
  }

  // Clear existing mount if applicable
  if (activeRoots.has(container)) {
    unmount(container);
  }

  // Register host callbacks
  const {
    onReady,
    onChapterStart,
    onChapterComplete,
    onQuizComplete,
    onProgressUpdate,
    onError,
    onUnmount,
    initialPath = '/',
    ...otherProps
  } = props;

  setHostCallbacks({
    onReady,
    onChapterStart,
    onChapterComplete,
    onQuizComplete,
    onProgressUpdate,
    onError,
    onUnmount,
  });

  // Apply style isolation boundary class
  container.classList.add('chemistry-plugin-root');

  try {
    const root = ReactDOM.createRoot(container);
    activeRoots.set(container, root);

    // Render application in plugin mode
    root.render(
      <React.StrictMode>
        <App isPlugin={true} initialPath={initialPath} {...otherProps} />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('[Plugin Error] Failed during mounting:', err);
    if (onError && typeof onError === 'function') {
      onError({ error: err });
    }
  }
}

/**
 * Unmounts the Chemistry learning module from the container.
 * 
 * @param {HTMLElement} container - DOM container element to unmount.
 */
export function unmount(container) {
  if (!container) return;

  const root = activeRoots.get(container);
  if (root) {
    try {
      root.unmount();
      activeRoots.delete(container);
      container.classList.remove('chemistry-plugin-root');
      triggerEvent('onUnmount');
    } catch (err) {
      console.error('[Plugin Error] Failed during unmounting:', err);
    }
  }
}
