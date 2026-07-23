import tailwindcssPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

// Custom lightweight PostCSS plugin to prefix all selectors for style isolation
const prefixSelectorPlugin = () => {
  return {
    postcssPlugin: 'prefix-selector-plugin',
    Rule(rule) {
      const file = rule.source?.input?.file || '';
      const normalizedPath = file.replace(/\\/g, '/');
      
      // Only prefix styles that originate from the React source directory (src/)
      if (!normalizedPath.includes('/src/')) {
        return;
      }

      // Skip styling inside keyframes
      if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') {
        return;
      }
      
      rule.selectors = rule.selectors.map(selector => {
        const trimmed = selector.trim();
        
        // Skip if empty
        if (!trimmed) return selector;
        
        // If it already starts with our prefix, don't double-prefix it
        if (trimmed.startsWith('.chemistry-plugin-root')) {
          return selector;
        }
        
        // Map global elements (html, body, :root) directly to our root class
        if (trimmed === 'html' || trimmed === 'body' || trimmed === ':root' || trimmed === ':host') {
          return '.chemistry-plugin-root';
        }
        
        // Prefix all standard selectors
        return `.chemistry-plugin-root ${selector}`;
      });
    }
  };
};
prefixSelectorPlugin.postcss = true;

export default {
  plugins: [
    tailwindcssPostcss(),
    prefixSelectorPlugin(),
    autoprefixer()
  ]
};
