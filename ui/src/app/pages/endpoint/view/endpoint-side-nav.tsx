import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/utils';
import { SidePanelOpen, SidePanelClose } from '@carbon/icons-react';
import {
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkeletonText,
} from '@carbon/react';
import {
  endpointNavSections,
  EndpointNavItem,
  EndpointNavSection,
} from './endpoint-nav-config';
import { Endpoint } from '@rapidaai/react';

const NavItemSkeleton: FC<{ itemKey: string }> = ({ itemKey }) => (
  <div key={itemKey} className="flex h-8 items-center px-4 py-2">
    <SkeletonText className="mb-0! flex-1" width="70%" />
  </div>
);

const NavItem: FC<{
  item: EndpointNavItem;
  basePath: string;
  isPathActive: (path: string, exact?: boolean) => boolean;
  isLoading?: boolean;
}> = ({ item, basePath, isPathActive, isLoading }) => {
  if (isLoading) return <NavItemSkeleton itemKey={item.key} />;

  if (item.children && item.children.length > 0) {
    const isAnyChildActive = item.children.some(child =>
      isPathActive(child.path, true),
    );

    return (
      <SideNavMenu
        key={item.key}
        title={item.label}
        renderIcon={item.icon}
        isActive={isAnyChildActive}
        defaultExpanded={isAnyChildActive}
      >
        {item.children.map(child => (
          <SideNavMenuItem
            key={child.key}
            href={`${basePath}/${child.path}`}
            isActive={isPathActive(child.path, true)}
          >
            {child.label}
          </SideNavMenuItem>
        ))}
      </SideNavMenu>
    );
  }

  return (
    <SideNavLink
      key={item.key}
      renderIcon={item.icon}
      href={`${basePath}/${item.path}`}
      isActive={isPathActive(item.path, item.exact)}
    >
      {item.label}
    </SideNavLink>
  );
};

const NavSection: FC<{
  section: EndpointNavSection;
  basePath: string;
  expanded: boolean;
  isPathActive: (path: string, exact?: boolean) => boolean;
  isLoading?: boolean;
}> = ({ section, basePath, expanded, isPathActive, isLoading }) => {
  if (section.items.length === 0) return null;

  return (
    <div>
      {section.label && (
        <li
          className={cn(
            'cds--switcher__item--divider transition-all duration-200',
            !expanded &&
              'opacity-0 h-0 overflow-hidden !py-0 !my-0 !border-none',
          )}
        >
          {isLoading ? (
            <SkeletonText className="!mb-0" width="50%" />
          ) : (
            <span className="uppercase!">{section.label}</span>
          )}
        </li>
      )}
      {section.items.map(item => (
        <NavItem
          key={item.key}
          item={item}
          basePath={basePath}
          isPathActive={isPathActive}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

interface EndpointSideNavProps {
  endpointId?: string;
  endpoint: Endpoint | null;
  expanded: boolean;
  onToggle: () => void;
}

export const EndpointSideNav: FC<EndpointSideNavProps> = ({
  endpointId,
  endpoint,
  expanded,
  onToggle,
}) => {
  const { pathname } = useLocation();
  const isLoading = !endpoint;
  const basePath = endpointId ? `/deployment/endpoint/${endpointId}` : '';

  const isPathActive = (path: string, exact?: boolean) => {
    const fullPath = `${basePath}/${path}`;
    return exact ? pathname === fullPath : pathname.startsWith(fullPath);
  };

  return (
    <div
      className={cn(
        'relative shrink-0 flex flex-col h-full',
        'bg-white dark:bg-gray-900',
        'border-r border-gray-200 dark:border-gray-800',
        'transition-all duration-200',
        expanded ? 'w-56' : 'w-12',
      )}
    >
      <SideNav
        aria-label="Endpoint actions"
        expanded={expanded}
        isRail={!expanded}
        className="relative! inset-auto! h-auto! flex-1 w-full! border-none! z-0!"
      >
        <SideNavItems>
          {endpointNavSections.map((section, idx) => (
            <NavSection
              key={idx}
              section={section}
              basePath={basePath}
              expanded={expanded}
              isPathActive={isPathActive}
              isLoading={isLoading}
            />
          ))}
        </SideNavItems>
      </SideNav>

      <div className="shrink-0 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex items-center h-10 w-full cursor-pointer px-4',
            'text-gray-400 dark:text-gray-500',
            'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400',
            'transition-colors duration-100',
          )}
          aria-label={expanded ? 'Collapse nav' : 'Expand nav'}
        >
          <span className="shrink-0">
            {expanded ? (
              <SidePanelClose size={16} />
            ) : (
              <SidePanelOpen size={16} />
            )}
          </span>
          {expanded && <span className="text-xs truncate ml-3">Collapse</span>}
        </button>
      </div>
    </div>
  );
};
