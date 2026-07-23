import { Endpoint, EndpointProviderModel } from '@rapidaai/react';
import { RightSideModal } from '@/app/components/base/modal/right-side-modal';
import { EndpointIntegration } from '@/app/components/integration-document/endpoint-integration';
import { ModalProps } from '@/app/components/base/modal';
import { cn } from '@/utils';
import { HTMLAttributes } from 'react';

interface EndpointInstructionDialogProps
  extends ModalProps,
    HTMLAttributes<HTMLDivElement> {
  currentEndpoint?: Endpoint | null;
  currentEndpointProviderModel?: EndpointProviderModel | null;
}

export function EndpointInstructionDialog(
  props: EndpointInstructionDialogProps,
) {
  const {
    currentEndpoint,
    currentEndpointProviderModel,
    className,
    ...mldAttr
  } = props;

  return (
    <RightSideModal
      className={cn('w-[580px] max-w-[calc(100vw-2rem)]', className)}
      {...mldAttr}
    >
      {/* Carbon breadcrumb header */}
      <div className="h-12 px-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
          Integration
        </span>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {currentEndpoint?.getName() || 'Get started'}
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-auto h-[calc(100vh-48px)]">
        {currentEndpoint && <EndpointIntegration endpoint={currentEndpoint} />}
      </div>
    </RightSideModal>
  );
}
