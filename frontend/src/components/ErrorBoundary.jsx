import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CineSense ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#f43f5e', backgroundColor: '#06070a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>⚠️ CineSense Render Error</h2>
          <pre style={{ marginTop: '20px', padding: '16px', backgroundColor: '#10131e', borderRadius: '8px', overflowX: 'auto', border: '1px solid rgba(244,63,94,0.3)' }}>
            {this.state.error?.toString() || 'Unknown error'}
            {'\n'}
            {this.state.error?.stack || ''}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#06b6d4', color: '#06070a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
