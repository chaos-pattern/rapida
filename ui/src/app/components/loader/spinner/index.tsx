import { Loading } from '@carbon/react';
import { cn } from '@/utils';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'sm', className }: SpinnerProps) {
  return (
    <Loading
      active
      withOverlay={false}
      small={size === 'xs' || size === 'sm'}
      description="Loading"
      className={cn(className)}
    />
  );
}
