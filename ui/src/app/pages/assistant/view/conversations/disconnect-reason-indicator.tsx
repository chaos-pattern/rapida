import { useState } from 'react';
import { Information } from '@carbon/icons-react';
import { Metadata } from '@rapidaai/react';
import { Tag } from '@carbon/react';
import { getDisconnectReasonDisplay } from './disconnect-reason';
import { IconOnlyButton } from '@/app/components/carbon/button';
import { DisconnectDetailsDialog } from '@/app/components/base/modal/disconnect-details-modal';

export const DisconnectReasonIndicator = ({
  reason,
  status,
  metadata,
}: {
  reason: string;
  status?: string;
  metadata?: Metadata[];
}) => {
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const display = getDisconnectReasonDisplay(reason, status, metadata);

  return (
    <>
      <div className="inline-flex items-center gap-1 whitespace-nowrap">
        <Tag size="md" type="gray">
          {display.label}
        </Tag>
        <IconOnlyButton
          kind="ghost"
          size="sm"
          renderIcon={Information}
          iconDescription="View disconnect details"
          tooltipPosition="bottom"
          onClick={() => setDetailsOpen(true)}
        />
      </div>
      <DisconnectDetailsDialog
        modalOpen={isDetailsOpen}
        setModalOpen={setDetailsOpen}
        details={display.details}
      />
    </>
  );
};
