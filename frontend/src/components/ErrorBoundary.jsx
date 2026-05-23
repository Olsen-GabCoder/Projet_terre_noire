import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Lazy import to avoid circular deps
      const ServerError = React.lazy(() => import('../pages/ServerError'));
      return (
        <React.Suspense fallback={null}>
          <ServerError />
        </React.Suspense>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
