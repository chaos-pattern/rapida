import { Dashboard, SourceControl, Activity } from '@carbon/icons-react';
import type { ComponentType } from 'react';

export interface EndpointNavChild {
  key: string;
  label: string;
  path: string;
}

export interface EndpointNavItem {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  path: string;
  exact?: boolean;
  children?: EndpointNavChild[];
}

export interface EndpointNavSection {
  label: string;
  items: EndpointNavItem[];
}

export const endpointNavSections: EndpointNavSection[] = [
  {
    label: '',
    items: [
      {
        key: 'overview',
        label: 'Overview',
        icon: Dashboard,
        path: 'overview',
        exact: true,
      },
      {
        key: 'traces',
        label: 'Logs',
        icon: Activity,
        path: 'logs',
      },
      {
        key: 'versions',
        label: 'Versions',
        icon: SourceControl,
        path: 'versions',
        children: [
          { key: 'versions-list', label: 'View all', path: 'versions' },
          {
            key: 'versions-create',
            label: 'Add new version',
            path: 'create-endpoint-version',
          },
        ],
      },
    ],
  },
];
