'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service
      console.log('Error would be sent to monitoring service');
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-container">
          <h2>Något gick fel</h2>
          <p>Vi beklagar, men något oväntat hände. Försök att ladda om sidan.</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Ladda om sidan
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}




