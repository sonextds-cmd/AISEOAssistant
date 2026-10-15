import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // iOS system colors
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          bg: '#F2F2F7',
          fill: '#E3E3E8',
          label: '#1C1C1E',
          secondary: '#8E8E93',
          tertiary: '#C7C7CC',
          separator: '#E5E5EA'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', '"Noto Sans Thai"', 'Sarabun', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
