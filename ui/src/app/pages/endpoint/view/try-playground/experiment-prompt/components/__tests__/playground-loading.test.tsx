import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ExecuteMessage } from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/execute-message';
import { PlaygroundHeader } from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/playground-header';

jest.mock('@carbon/react', () => ({
  Button: ({ children, disabled, renderIcon: Icon, type }: any) => (
    <button disabled={disabled} type={type}>
      {children}
      {Icon && <Icon />}
    </button>
  ),
  Loading: ({ description, small, withOverlay }: any) => (
    <span
      data-testid="carbon-loading"
      data-description={description}
      data-small={String(small)}
      data-with-overlay={String(withOverlay)}
    />
  ),
  Tag: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@carbon/icons-react', () => ({
  Play: () => <span>play icon</span>,
}));

describe('endpoint playground loading states', () => {
  it('uses Carbon Loading while endpoint execution is running', () => {
    render(<ExecuteMessage loading metrics={[]} />);

    expect(screen.getByTestId('carbon-loading')).toHaveAttribute(
      'data-description',
      'Executing endpoint',
    );
    expect(screen.getByTestId('carbon-loading')).toHaveAttribute(
      'data-with-overlay',
      'false',
    );
    expect(screen.getByText('Executing your endpoint.')).toBeInTheDocument();
  });

  it('uses Carbon Loading inside the execute button', () => {
    render(<PlaygroundHeader isValid={false} loading />);

    expect(screen.getByRole('button', { name: /Running/i })).toBeDisabled();
    expect(screen.getByTestId('carbon-loading')).toHaveAttribute(
      'data-small',
      'true',
    );
    expect(screen.queryByText('play icon')).not.toBeInTheDocument();
  });

  it('disables execution when unsupported endpoint variables exist', () => {
    render(
      <PlaygroundHeader
        isValid
        loading={false}
        disabled
        variableCount={2}
        unsupportedCount={1}
      />,
    );

    expect(screen.getByRole('button', { name: /Run/i })).toBeDisabled();
    expect(screen.getByText('2 arguments')).toBeInTheDocument();
    expect(screen.getByText('1 unsupported')).toBeInTheDocument();
  });
});
