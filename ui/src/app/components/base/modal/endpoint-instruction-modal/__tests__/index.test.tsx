import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EndpointInstructionDialog } from '@/app/components/base/modal/endpoint-instruction-modal';

jest.mock('@/app/components/base/modal/right-side-modal', () => ({
  RightSideModal: ({ children, className, modalOpen }: any) =>
    modalOpen ? (
      <aside data-testid="right-side-modal" className={className}>
        {children}
      </aside>
    ) : null,
}));

jest.mock('@/app/components/integration-document/endpoint-integration', () => ({
  EndpointIntegration: ({ endpoint }: any) => (
    <section>Integration for {endpoint.getName()}</section>
  ),
}));

const makeEndpoint = () =>
  ({
    getName: () => 'Production endpoint',
  }) as any;

describe('EndpointInstructionDialog', () => {
  it('uses the platform right-side deployment drawer width', () => {
    render(
      <EndpointInstructionDialog
        modalOpen
        setModalOpen={jest.fn()}
        currentEndpoint={makeEndpoint()}
      />,
    );

    expect(screen.getByTestId('right-side-modal')).toHaveClass(
      'w-[580px]',
      'max-w-[calc(100vw-2rem)]',
    );
    expect(screen.getByText('Integration')).toBeInTheDocument();
    expect(screen.getByText('Production endpoint')).toBeInTheDocument();
    expect(
      screen.getByText('Integration for Production endpoint'),
    ).toBeInTheDocument();
  });

  it('keeps integration content hidden until endpoint data is available', () => {
    render(
      <EndpointInstructionDialog
        modalOpen
        setModalOpen={jest.fn()}
        currentEndpoint={null}
      />,
    );

    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.queryByText(/Integration for/)).not.toBeInTheDocument();
  });
});
