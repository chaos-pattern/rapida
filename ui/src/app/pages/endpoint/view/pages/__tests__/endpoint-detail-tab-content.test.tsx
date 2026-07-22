import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EndpointDetailTabContent } from '@/app/pages/endpoint/view/pages';

jest.mock('@/app/pages/endpoint/view/try-playground', () => ({
  Playground: ({ currentEndpoint, currentEndpointProviderModel }: any) => (
    <section>
      Overview page {currentEndpoint.getName()}{' '}
      {currentEndpointProviderModel.getId()}
    </section>
  ),
}));

jest.mock('@/app/pages/endpoint/view/traces', () => ({
  EndpointTraces: ({ currentEndpoint }: any) => (
    <section>Logs page {currentEndpoint.getName()}</section>
  ),
}));

jest.mock('@/app/pages/endpoint/view/version-list', () => ({
  Version: ({ currentEndpoint, onReload }: any) => (
    <section>
      Versions page {currentEndpoint.getName()}
      <button type="button" onClick={onReload}>
        Reload versions
      </button>
    </section>
  ),
}));

const makeEndpoint = () =>
  ({
    getId: () => 'endpoint-1',
    getName: () => 'Production endpoint',
  }) as any;

const makeEndpointProviderModel = () =>
  ({
    getId: () => 'epm-1',
  }) as any;

describe('EndpointDetailTabContent', () => {
  it('renders the overview page for the overview tab', () => {
    render(
      <EndpointDetailTabContent
        activeTab="overview"
        currentEndpoint={makeEndpoint()}
        currentEndpointProviderModel={makeEndpointProviderModel()}
        onReload={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Overview page Production endpoint epm-1'),
    ).toBeInTheDocument();
  });

  it('renders logs and versions pages from their route keys', () => {
    const onReload = jest.fn();
    const { rerender } = render(
      <EndpointDetailTabContent
        activeTab="logs"
        currentEndpoint={makeEndpoint()}
        currentEndpointProviderModel={makeEndpointProviderModel()}
        onReload={onReload}
      />,
    );

    expect(
      screen.getByText('Logs page Production endpoint'),
    ).toBeInTheDocument();

    rerender(
      <EndpointDetailTabContent
        activeTab="versions"
        currentEndpoint={makeEndpoint()}
        currentEndpointProviderModel={makeEndpointProviderModel()}
        onReload={onReload}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload versions' }));
    expect(
      screen.getByText(/Versions page Production endpoint/),
    ).toBeInTheDocument();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('renders nothing until endpoint data is ready', () => {
    const { container } = render(
      <EndpointDetailTabContent
        activeTab="overview"
        currentEndpoint={null}
        currentEndpointProviderModel={makeEndpointProviderModel()}
        onReload={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('falls back to overview for unknown endpoint tab paths', () => {
    render(
      <EndpointDetailTabContent
        activeTab="unknown-tab"
        currentEndpoint={makeEndpoint()}
        currentEndpointProviderModel={makeEndpointProviderModel()}
        onReload={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Overview page Production endpoint epm-1'),
    ).toBeInTheDocument();
  });
});
