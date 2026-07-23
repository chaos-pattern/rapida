import { Play } from '@carbon/icons-react';
import { Button, Loading, Tag } from '@carbon/react';
import { FC } from 'react';

export const PlaygroundHeader: FC<{
  isValid: boolean;
  loading: boolean;
  disabled?: boolean;
  variableCount?: number;
  unsupportedCount?: number;
}> = ({
  loading,
  disabled = false,
  variableCount = 0,
  unsupportedCount = 0,
}) => {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-gray-200 bg-white pl-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          Playground
        </h2>
        <div className="hidden items-center gap-2 sm:flex">
          <Tag size="sm" type="gray" title={`${variableCount} arguments`}>
            {variableCount} arguments
          </Tag>
          {unsupportedCount > 0 && (
            <Tag
              size="sm"
              type="red"
              title={`${unsupportedCount} unsupported arguments`}
            >
              {unsupportedCount} unsupported
            </Tag>
          )}
        </div>
      </div>

      <div className="flex h-12 items-stretch border-l border-gray-200 dark:border-gray-800">
        <Button
          type="submit"
          kind="tertiary"
          size="md"
          disabled={loading || disabled}
          renderIcon={!loading ? Play : undefined}
          className="h-12 min-h-12 border-y-0 border-r-0"
        >
          {loading ? 'Running' : 'Run'}
          {loading && (
            <Loading
              description="Executing endpoint"
              withOverlay={false}
              small
              className="ml-2"
            />
          )}
        </Button>
      </div>
    </div>
  );
};
