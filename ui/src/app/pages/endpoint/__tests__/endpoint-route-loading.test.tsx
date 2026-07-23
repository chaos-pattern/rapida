import React from 'react';

const mockFallbacks: React.ReactNode[] = [];

jest.mock('@/utils/loadable', () => ({
  lazyLoad: jest.fn((_importFunc, _selectorFunc, opts) => {
    mockFallbacks.push(opts.fallback);
    return () => <div>Lazy endpoint page</div>;
  }),
}));

jest.mock('@/app/components/carbon/loading', () => ({
  PageLoading: ({ className }: any) => (
    <div data-testid="carbon-page-loading" className={className}>
      Loading
    </div>
  ),
}));

describe('endpoint route loading', () => {
  beforeEach(() => {
    mockFallbacks.length = 0;
    jest.resetModules();
  });

  it('uses Carbon PageLoading for all endpoint lazy route fallbacks', () => {
    require('@/app/pages/endpoint');
    const { PageLoading } = require('@/app/components/carbon/loading');

    expect(mockFallbacks).toHaveLength(5);
    mockFallbacks.forEach(fallback => {
      expect(React.isValidElement(fallback)).toBe(true);
      expect((fallback as React.ReactElement).type).toBe(PageLoading);
      expect((fallback as React.ReactElement).props.className).toBe('h-full');
    });
  });
});
