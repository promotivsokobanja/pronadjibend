'use client';

import { Component } from 'react';

/**
 * Class-based Error Boundary za granularnu izolaciju segmenata.
 * Greška u <Admin> ne može nikada da obori <Public>.
 */
export default class ErrorBoundaryClient extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    try {
      console.error(`[ErrorBoundary:${this.props.segment || 'unknown'}]`, error, info);
    } catch {
      // never throw from catch
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '40vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            gap: '0.75rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Došlo je do greške u segmentu: {this.props.segment || 'aplikacija'}
          </h2>
          <p style={{ color: '#64748b', maxWidth: 400 }}>
            Ostatak sajta radi normalno.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 10,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Pokušaj ponovo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
