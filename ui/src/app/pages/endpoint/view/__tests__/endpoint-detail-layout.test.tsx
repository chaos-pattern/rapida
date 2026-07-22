import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EndpointSideNav } from '@/app/pages/endpoint/view/endpoint-side-nav';
import { ViewEndpointPage } from '@/app/pages/endpoint/view';
import { EndpointViewLayout } from '@/app/pages/endpoint/view/endpoint-view.layout';
import { useEndpointPageStore } from '@/hooks';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();
const mockOnGetEndpoint = jest.fn();
const mockOnShowInstruction = jest.fn();
const mockOnShowUpdateDetailVisible = jest.fn();
const mockOnShowEditTagVisible = jest.fn();
const mockWriteText = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@carbon/icons-react', () => ({
  Checkmark: ({ size }: any) => <span data-icon-size={size}>checkmark</span>,
  Copy: ({ size }: any) => <span data-icon-size={size}>copy</span>,
  Edit: ({ size }: any) => <span data-icon-size={size}>edit</span>,
  Information: ({ size }: any) => <span data-icon-size={size}>info</span>,
  SourceControl: ({ size }: any) => (
    <span data-icon-size={size}>source-control</span>
  ),
  Tag: ({ size }: any) => <span data-icon-size={size}>tag</span>,
  SidePanelClose: () => <span>close panel</span>,
  SidePanelOpen: () => <span>open panel</span>,
}));

jest.mock('@/hooks/use-credential', () => ({
  useCredential: () => ['user-1', 'token-1', 'project-1'],
}));

jest.mock('@/hooks', () => {
  const actual = jest.requireActual('@/hooks');
  return {
    ...actual,
    useRapidaStore: () => ({
      showLoader: mockShowLoader,
      hideLoader: mockHideLoader,
    }),
  };
});

jest.mock('@carbon/react', () => ({
  Breadcrumb: ({ children }: any) => <nav>{children}</nav>,
  BreadcrumbItem: ({ children, href, isCurrentPage }: any) =>
    isCurrentPage ? <span>{children}</span> : <a href={href}>{children}</a>,
  HeaderGlobalBar: ({ children, ...props }: any) => (
    <div role="toolbar" {...props}>
      {children}
    </div>
  ),
  HeaderGlobalAction: ({ children, tooltipAlignment, ...props }: any) => (
    <button data-tooltip-alignment={tooltipAlignment} {...props}>
      {children}
    </button>
  ),
  SideNav: ({ children, expanded, isRail, className, ...props }: any) => (
    <aside
      className={className}
      data-expanded={expanded}
      data-rail={isRail}
      {...props}
    >
      {children}
    </aside>
  ),
  SideNavItems: ({ children }: any) => <ul>{children}</ul>,
  SideNavLink: ({ children, isActive, href, renderIcon: Icon }: any) => (
    <a data-active={isActive} href={href}>
      {Icon ? <Icon size={16} /> : null}
      {children}
    </a>
  ),
  SideNavMenu: ({
    children,
    title,
    isActive,
    defaultExpanded,
    renderIcon: Icon,
  }: any) => (
    <li data-active={isActive} data-expanded={defaultExpanded}>
      {Icon ? <Icon size={16} /> : null}
      <span>{title}</span>
      {children}
    </li>
  ),
  SideNavMenuItem: ({ children, isActive, href }: any) => (
    <a data-active={isActive} href={href}>
      {children}
    </a>
  ),
  SkeletonText: () => <span>Loading nav item</span>,
}));

jest.mock('@/app/pages/endpoint/view/try-playground', () => ({
  Playground: () => <section>Endpoint playground</section>,
}));

jest.mock('@/app/pages/endpoint/view/traces', () => ({
  EndpointTraces: () => <section>Endpoint logs</section>,
}));

jest.mock('@/app/pages/endpoint/view/version-list', () => ({
  Version: () => <section>Endpoint versions</section>,
}));

jest.mock('@/app/components/base/modal/endpoint-instruction-modal', () => ({
  EndpointInstructionDialog: () => null,
}));

jest.mock('@/app/components/base/modal/create-tag-modal', () => ({
  CreateTagDialog: () => null,
}));

jest.mock('@/app/components/base/modal/update-description-modal', () => ({
  UpdateDescriptionDialog: () => null,
}));

jest.mock('@/app/components/helmet', () => ({
  Helmet: () => null,
}));

jest.mock('react-hot-toast/headless', () => ({
  error: jest.fn(),
}));

const makeTimestamp = (date: Date) => ({
  getSeconds: () => Math.floor(date.getTime() / 1000),
  getNanos: () => 0,
  toDate: () => date,
});

const makeEndpoint = () =>
  ({
    getId: () => 'endpoint-1',
    getName: () => 'Production endpoint',
    getDescription: () => 'Endpoint description',
    getEndpointtag: () => ({ getTagList: () => [] }),
    getEndpointprovidermodel: () => ({
      getId: () => 'epm-1',
      getCreateddate: () => makeTimestamp(new Date()),
    }),
  }) as any;

const renderEndpointDetailRoute = (
  initialEntry = '/deployment/endpoint/endpoint-1/overview',
) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/deployment/endpoint/:endpointId"
          element={<EndpointViewLayout />}
        >
          <Route
            path="create-endpoint-version"
            element={<section>Create endpoint version</section>}
          />
          <Route path=":tab" element={<ViewEndpointPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('Endpoint detail layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mockWriteText },
    });
    useEndpointPageStore.setState({
      currentEndpoint: makeEndpoint(),
      currentEndpointProviderModel: {
        getId: () => 'epm-1',
      },
      instructionVisible: false,
      editTagVisible: false,
      updateDetailVisible: false,
      onGetEndpoint: mockOnGetEndpoint,
      onShowInstruction: mockOnShowInstruction,
      onShowUpdateDetailVisible: mockOnShowUpdateDetailVisible,
      onShowEditTagVisible: mockOnShowEditTagVisible,
    } as any);
    mockOnGetEndpoint.mockImplementation(
      (
        _endpointId,
        _endpointProviderId,
        _projectId,
        _token,
        _userId,
        _onError,
        onSuccess,
      ) => {
        onSuccess(makeEndpoint());
      },
    );
  });

  it('matches assistant side nav behavior for collapse and loading states', () => {
    const onToggle = jest.fn();
    const { rerender, container } = render(
      <MemoryRouter
        initialEntries={['/deployment/endpoint/endpoint-1/overview']}
      >
        <EndpointSideNav
          endpointId="endpoint-1"
          endpoint={makeEndpoint()}
          expanded
          onToggle={onToggle}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Endpoint actions')).toHaveAttribute(
      'data-expanded',
      'true',
    );
    expect(container.firstElementChild).toHaveClass('w-56');
    expect(screen.getByText('Logs')).toHaveAttribute(
      'href',
      '/deployment/endpoint/endpoint-1/logs',
    );
    expect(screen.getByText('source-control')).toHaveAttribute(
      'data-icon-size',
      '16',
    );
    expect(screen.getByText('Overview')).toHaveAttribute('data-active', 'true');

    rerender(
      <MemoryRouter initialEntries={['/deployment/endpoint/endpoint-1/logs']}>
        <EndpointSideNav
          endpointId="endpoint-1"
          endpoint={makeEndpoint()}
          expanded={false}
          onToggle={onToggle}
        />
      </MemoryRouter>,
    );
    expect(container.firstElementChild).toHaveClass('w-12');

    rerender(
      <MemoryRouter
        initialEntries={['/deployment/endpoint/endpoint-1/overview']}
      >
        <EndpointSideNav
          endpointId="endpoint-1"
          endpoint={null}
          expanded
          onToggle={onToggle}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Loading nav item').length).toBeGreaterThan(0);
  });

  it('keeps endpoint header and side nav visible on overview and logs URLs', () => {
    const overviewRender = renderEndpointDetailRoute(
      '/deployment/endpoint/endpoint-1/overview',
    );
    expect(screen.getByText('Production endpoint')).toBeInTheDocument();
    expect(screen.getByText('Endpoint playground')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toHaveAttribute(
      'href',
      '/deployment/endpoint/endpoint-1/logs',
    );

    overviewRender.unmount();
    renderEndpointDetailRoute('/deployment/endpoint/endpoint-1/logs');

    expect(screen.getByText('Production endpoint')).toBeInTheDocument();
    expect(screen.getByText('Endpoint logs')).toBeInTheDocument();
    expect(screen.queryByText('Endpoint playground')).not.toBeInTheDocument();
  });

  it('keeps endpoint side nav visible on create version URL', () => {
    renderEndpointDetailRoute(
      '/deployment/endpoint/endpoint-1/create-endpoint-version',
    );

    expect(screen.getByLabelText('Endpoint actions')).toBeInTheDocument();
    expect(screen.getByText('Create endpoint version')).toBeInTheDocument();
    expect(screen.getByText('Add new version')).toHaveAttribute(
      'href',
      '/deployment/endpoint/endpoint-1/create-endpoint-version',
    );
  });

  it('uses a Carbon shell header with right-side global actions', () => {
    renderEndpointDetailRoute();

    const toolbar = screen.getByRole('toolbar', {
      name: 'Endpoint header actions',
    });
    expect(toolbar).toBeInTheDocument();
    expect(
      within(toolbar)
        .getAllByText(/source-control|info|edit|tag|copy/)
        .map(icon => icon),
    ).toHaveLength(5);
    within(toolbar)
      .getAllByText(/source-control|info|edit|tag|copy/)
      .forEach(icon => expect(icon).toHaveAttribute('data-icon-size', '16'));
    expect(screen.getByText('Endpoints')).toBeInTheDocument();
    expect(screen.getByText('Production endpoint')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create new version' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/deployment/endpoint/endpoint-1/create-endpoint-version',
    );
    expect(
      screen.getByRole('button', { name: 'Create new version' }),
    ).toHaveAttribute('data-tooltip-alignment', 'end');

    fireEvent.click(screen.getByRole('button', { name: 'View instructions' }));
    expect(mockOnShowInstruction).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'View instructions' }),
    ).toHaveAttribute('data-tooltip-alignment', 'end');

    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(mockOnShowUpdateDetailVisible).toHaveBeenCalledWith(
      expect.objectContaining({
        getId: expect.any(Function),
      }),
    );
    expect(
      screen.getByRole('button', { name: 'Edit details' }),
    ).toHaveAttribute('data-tooltip-alignment', 'end');

    fireEvent.click(screen.getByRole('button', { name: 'Edit tags' }));
    expect(mockOnShowEditTagVisible).toHaveBeenCalledWith(
      expect.objectContaining({
        getId: expect.any(Function),
      }),
    );

    expect(screen.getByRole('button', { name: 'Edit tags' })).toHaveAttribute(
      'data-tooltip-alignment',
      'end',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy endpoint ID' }));
    expect(mockWriteText).toHaveBeenCalledWith('endpoint-1');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
