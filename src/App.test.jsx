import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

afterEach(cleanup);

// PeerJS opens a real signalling socket on construction —
// the connection itself is covered by manual testing, not jsdom.
vi.mock('peerjs', () => ({ default: class FakePeer { on() {} } }));

describe('App', () => {
  it('renders the connection status', () => {
    render(<App />);
    expect(screen.getByText(/Starting/)).toBeTruthy();
  });

  it('guides empty rooms to drop a picture', () => {
    render(<App />);
    expect(screen.getByText(/Drop in a picture to share/)).toBeTruthy();
  });
});
