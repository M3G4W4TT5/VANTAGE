import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button, NonIdealState } from '@blueprintjs/core';

export class PaneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <NonIdealState title="This pane could not open" description="Your saved workspace is preserved. Other panes and workspace controls remain available."
      action={<Button onClick={() => this.setState({ error: false })}>Retry pane</Button>} /> : this.props.children;
  }
}
