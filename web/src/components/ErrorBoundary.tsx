import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: '#ff4d4f' }}>Something went wrong</h2>
          <p style={{ color: '#888' }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
