import React, { useEffect } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ChemicalEquationsPage from './pages/ChemicalEquationsPage';
import ReactionTypesPage from './pages/ReactionTypesPage';
import RedoxPage from './pages/RedoxPage';
import { triggerEvent } from './utils/pluginEvents';

// Listener component inside the router context to handle navigation events
function RouteListener() {
  const location = useLocation();

  useEffect(() => {
    // Notify host when a chapter/topic/page is loaded/changed
    triggerEvent('onChapterStart', { chapter: location.pathname });
  }, [location]);

  return null;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/equations" element={<ChemicalEquationsPage />} />
          <Route path="/reactions" element={<ReactionTypesPage />} />
          <Route path="/redox" element={<RedoxPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App({ isPlugin = false, initialPath = '/' }) {
  // Trigger onReady when the module is successfully mounted
  useEffect(() => {
    triggerEvent('onReady', { isPlugin, timestamp: Date.now() });
  }, [isPlugin]);

  if (isPlugin) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <RouteListener />
        <AppContent />
      </MemoryRouter>
    );
  }

  return (
    <BrowserRouter>
      <RouteListener />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
