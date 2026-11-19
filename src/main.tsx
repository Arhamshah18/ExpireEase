import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  process.exit(1);
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Error boundary fallback UI
const ErrorFallback = ({ error }: { error: Error }) => (
  <div style={{ color: 'red' }}>
    <h1>App Failed to Load</h1>
    <pre>{error.message}</pre>
  </div>
);

// Wrap the app in an error boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }\n    return this.props.children;
  }
}

root.render(
  <ErrorBoundary>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ErrorBoundary>
);