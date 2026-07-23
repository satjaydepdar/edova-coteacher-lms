# Edova Chemistry Learning Plugin Documentation

This document explains the Micro Frontend architecture, API lifecycle, build setup, and styling isolation for the Chemistry learning module located in `E:\Innux AI\chemistry_plugin`.

---

## 1. Micro Frontend Architecture

We selected a **Self-Contained Library Wrapper** approach using **Vite Library Mode** and **CSS Injection**. 

### Explanation of the Architecture:
- **Plug-and-Play Bundle**: The compiler packages all components, assets, React 19 framework, routing, and libraries (like Framer Motion, Zustand, Tailwind v4 compiler resets) into a single JavaScript file: `dist/chemistry-plugin.es.js` (for ES Modules) and `dist/chemistry-plugin.umd.js` (for older environments).
- **CSS Injection**: We use `vite-plugin-css-injected-by-js` to inject all compiled Tailwind and subject styling into the JS file. When the host imports the plugin and mounts it, the styling is automatically loaded into the document head, requiring no extra `<link>` stylesheets from the host.
- **Style Isolation boundary**: To prevent global styling conflicts, a custom PostCSS prefix plugin wraps all compiled styles under a parent class `.chemistry-plugin-root`. This guarantees zero styling leaks to the host or other concurrent plugins.
- **Zustand & Framer Motion**: All state and animations are retained internally without exposing variables to the global window space.

---

## 2. Code Modifications & Project Structure

The original project at `E:\Innux AI\Edova_chemistry` remains **100% untouched**. 

### Files Added:
1. `plugin.json` — The plugin metadata manifest.
2. `src/plugin-entry.jsx` — The micro frontend lifecycle wrapper containing `mount` and `unmount` functions.
3. `src/utils/pluginEvents.js` — Communication hub for triggering host callbacks and dispatching CustomEvents on the window.
4. `vite.config.js` — Build instructions for both standalone dev mode and library output.
5. `test-host.html` — Interactive harness to test the lifecycle methods and events.

### Files Modified (Adapted in `chemistry_plugin` only):
1. `package.json` — Defined exact versions of dependencies from the original codebase, added React 19.2.5 explicitly, and added Vite React and CSS plugins.
2. `postcss.config.js` — Prefixed all styles with `.chemistry-plugin-root` for style isolation.
3. `src/App.jsx` — Configured dynamic router selection (uses `MemoryRouter` in plugin mode to isolate navigation from host, and `BrowserRouter` in standalone dev mode).
4. `src/components/chemistry/ReactionMatcher.jsx` & `src/store/useChemistryStore.js` — Injected `triggerEvent` calls at key completion milestones (e.g. balancing equations, identifying types, matching quiz completion).

---

## 3. Plugin API & Lifecycle Methods

The plugin exposes two principal lifecycle methods from its entry file `src/plugin-entry.jsx`:

### `mount(container, props)`
Mounts the React application inside the target DOM node.
- **`container`**: `HTMLElement` (required) — The DOM wrapper where the plugin should mount.
- **`props`**: `Object` (optional) — Configuration data and callbacks.
  - **Context Contextual Props**:
    - `studentId` (String)
    - `schoolId` (String)
    - `class` (String)
    - `section` (String)
    - `chapter` (String)
    - `topic` (String)
    - `theme` (String)
    - `language` (String)
    - `initialPath` (String) — E.g. `/equations` or `/reactions` to bootstrap on a specific page (defaults to `/`).
  - **Callback Hooks**:
    - `onReady(data)` — Triggered when the plugin finishes mounting.
    - `onChapterStart(data)` — Triggered when a chapter or sub-page starts rendering (passes `data.chapter`).
    - `onChapterComplete(data)` — Triggered when a chapter/lab is completed (passes `data.chapter`, `data.score`).
    - `onQuizComplete(data)` — Triggered when a quiz/matching game is completed (passes scores).
    - `onProgressUpdate(data)` — Real-time progress changes (passes `data.progress` from `0.0` to `1.0`).
    - `onError(error)` — Fired when an internal React or loading error is intercepted.
    - `onUnmount()` — Fired upon clean teardown.

### `unmount(container)`
Unmounts the application, tears down the React virtual DOM tree, and removes the `.chemistry-plugin-root` styling boundary to prevent memory and style leaks.

---

## 4. Manifest File (`plugin.json`)

The manifest helps host systems register and load the plugin dynamically.
```json
{
  "id": "chemistry",
  "name": "Chemistry Learning Plugin",
  "subject": "Chemistry",
  "version": "1.0.0",
  "entry": "plugin-entry.js",
  "type": "microfrontend"
}
```

---

## 5. Usage & Host Integration Example

An external host React application can load and mount this plugin dynamically:

```javascript
import React, { useEffect, useRef } from 'react';

function ChemistryWidget() {
  const mountRef = useRef(null);

  useEffect(() => {
    let unmountFn = null;

    async function loadAndMount() {
      // 1. Dynamically import the ES Module bundle from its server/path
      const plugin = await import('http://localhost:5173/dist/chemistry-plugin.es.js');
      
      // 2. Save unmount for cleanup
      unmountFn = plugin.unmount;

      // 3. Mount the plugin with custom props
      plugin.mount(mountRef.current, {
        initialPath: '/equations',
        studentId: 'STUDENT_A',
        class: '10',
        onQuizComplete: (data) => {
          console.log('Student finished quiz! Score:', data.score);
        },
        onProgressUpdate: (data) => {
          console.log('Module Progress:', data.progress);
        }
      });
    }

    loadAndMount();

    // Cleanup: cleanly unmount when component unmounts from host React tree
    return () => {
      if (unmountFn && mountRef.current) {
        unmountFn(mountRef.current);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', minHeight: '600px' }} />;
}

export default ChemistryWidget;
```

---

## 6. Build & Run Instructions

### Prerequisites
- Node.js (v18+)
- npm (v10+)

### Setup
Navigate to the directory and install dependencies:
```bash
npm install --legacy-peer-deps
```

### Standalone Mode (Development)
To run and test the project independently like the original React app:
```bash
npm run dev
```
Open `http://localhost:5173` to interact with it.

### Compile Plugin Bundle
Build the compiled, isolated ESM and UMD bundles:
```bash
npm run build
```
This outputs:
- `dist/chemistry-plugin.es.js` (ES Module bundle)
- `dist/chemistry-plugin.umd.js` (Universal Module Definition)

### Preview Host Verification Harness
To test mounting, unmounting, style isolation, and events:
1. Run `npm run dev` to start the local static server.
2. Open `http://localhost:5173/test-host.html` in your browser.
3. Use the sidebar to Mount, Unmount, switch start routes, and monitor the Event Stream.

---

## 7. Assumptions & Limitations

- **Browser Context**: Assumes host environments allow dynamic ES module imports. For legacy browsers, load `chemistry-plugin.umd.js`.
- **Global Variables**: We assume the host application doesn't define custom global CSS rules overriding `.chemistry-plugin-root *` with `!important`. Scoping is fully enforced otherwise.
- **Portals**: If using packages that render overlays in `document.body` (outside the mount container), they may lose styled scoping. No body portals are active in the current Chemistry module.
