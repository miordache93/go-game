import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Example test for UI components
describe('UI Components', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <button>Click me</button>;
    render(<TestComponent />);
    expect(screen.getByText('Click me')).toBeDefined();
  });
});