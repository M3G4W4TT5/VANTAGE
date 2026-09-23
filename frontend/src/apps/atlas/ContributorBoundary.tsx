import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@blueprintjs/core';

export class ContributorBoundary extends Component<{ label: string; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (!this.state.error) return this.props.children;
    return <div role="alert" style={{ padding: 12 }}>
      {this.props.label} could not render. Other layers remain available.
      <Button small onClick={() => this.setState({ error: false })}>Retry layer</Button>
    </div>;
  }
}
