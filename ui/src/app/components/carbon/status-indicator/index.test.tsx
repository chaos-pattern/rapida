import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CarbonStatusIndicator } from '.';

jest.mock('@carbon/react', () => ({
  unstable__ShapeIndicator: ({ kind, label, textSize }: any) => (
    <span data-kind={kind} data-text-size={textSize}>
      {label}
    </span>
  ),
}));

jest.mock('@/app/components/carbon/icon-indicator', () => ({
  CarbonIconIndicator: ({ align, iconDescription, kind, label, size }: any) => (
    <span
      data-align={align}
      data-icon-description={iconDescription}
      data-icon-kind={kind}
      data-size={size}
    >
      {label}
    </span>
  ),
}));

describe('CarbonStatusIndicator', () => {
  it('renders in-progress with Carbon IconIndicator', () => {
    render(<CarbonStatusIndicator state="IN_PROGRESS" />);

    expect(screen.getByText('In progress')).toHaveAttribute(
      'data-icon-kind',
      'in-progress',
    );
    expect(screen.getByText('In progress')).toHaveAttribute(
      'data-align',
      'right',
    );
    expect(screen.getByText('In progress')).toHaveAttribute(
      'data-icon-description',
      'Icon',
    );
    expect(screen.getByText('In progress')).toHaveAttribute('data-size', '16');
  });

  it('renders ringing with the pending Carbon IconIndicator', () => {
    render(<CarbonStatusIndicator state="RINGING" />);

    expect(screen.getByText('Ringing')).toHaveAttribute(
      'data-icon-kind',
      'pending',
    );
    expect(screen.getByText('Ringing')).toHaveAttribute('data-align', 'right');
    expect(screen.getByText('Ringing')).toHaveAttribute(
      'data-icon-description',
      'Icon',
    );
    expect(screen.getByText('Ringing')).toHaveAttribute('data-size', '16');
  });
});
