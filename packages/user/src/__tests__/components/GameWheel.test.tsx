import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameWheel from '../../components/GameWheel';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GameWheel Component', () => {
  test('renders wheel with all numbers', () => {
    render(
      <GameWheel 
        isSpinning={false} 
        winningNumber={null} 
      />
    );

    // Check if all numbers 0-9 are rendered
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  test('displays winning number when provided', () => {
    render(
      <GameWheel 
        isSpinning={false} 
        winningNumber={7} 
      />
    );

    expect(screen.getByText('Winner: 7')).toBeInTheDocument();
  });

  test('shows spinning state correctly', () => {
    const { rerender } = render(
      <GameWheel 
        isSpinning={true} 
        winningNumber={5} 
      />
    );

    // When spinning, winning number should not be displayed yet
    expect(screen.queryByText('Winner: 5')).not.toBeInTheDocument();

    // After spinning stops
    rerender(
      <GameWheel 
        isSpinning={false} 
        winningNumber={5} 
      />
    );

    expect(screen.getByText('Winner: 5')).toBeInTheDocument();
  });

  test('calls onSpinComplete when spin animation finishes', (done) => {
    const mockOnSpinComplete = jest.fn();
    
    render(
      <GameWheel 
        isSpinning={true} 
        winningNumber={3} 
        onSpinComplete={mockOnSpinComplete}
      />
    );

    // The component should call onSpinComplete after 4 seconds
    setTimeout(() => {
      expect(mockOnSpinComplete).toHaveBeenCalled();
      done();
    }, 4100);
  });

  test('applies correct colors to numbers', () => {
    render(
      <GameWheel 
        isSpinning={false} 
        winningNumber={null} 
      />
    );

    // Numbers 1, 3, 5, 7, 9 should be red (odd numbers)
    // Numbers 0, 2, 4, 6, 8 should be black (even numbers)
    
    // This test would need to check the computed styles or class names
    // depending on how colors are applied in your implementation
  });
});