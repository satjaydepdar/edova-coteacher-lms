import React from 'react';
import { motion } from 'framer-motion';
import RedoxVisualizer from '../components/chemistry/RedoxVisualizer';
import RealWorldSection from '../components/chemistry/RealWorldSection';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 border-2 border-red-500 rounded-xl m-8">
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <pre className="text-sm font-mono whitespace-pre-wrap">{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const RedoxPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Oxidation & Reduction</h1>
        <p className="text-slate-600">
          Understand electron and oxygen transfer in redox reactions and observe their real-world effects.
        </p>
      </div>

      <ErrorBoundary>
        <RedoxVisualizer />
        <div className="mt-12">
          <RealWorldSection />
        </div>
      </ErrorBoundary>
      
    </motion.div>
  );
};

export default RedoxPage;
