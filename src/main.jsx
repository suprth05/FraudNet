import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Global error boundary to catch silent crashes
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[FraudNet] App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f1117',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          color: '#f0f2f8',
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 20,
          }}>⚠</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Application Error</h1>
          <p style={{ color: '#8892b0', marginBottom: 20, maxWidth: 480 }}>
            FraudNet encountered an unexpected error. Please refresh the page.
          </p>
          <pre style={{
            background: '#1e2336', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '12px 20px', fontSize: 12,
            color: '#ef4444', maxWidth: 600, overflowX: 'auto', marginBottom: 24,
            textAlign: 'left',
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: '#4f6ef7', border: 'none',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
)
