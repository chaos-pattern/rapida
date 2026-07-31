import React from 'react';
import { Information } from '@carbon/icons-react';
import { Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';

export const HelpLabel: React.FC<{
  label: string;
  helpText?: React.ReactNode;
}> = ({ label, helpText }) => {
  if (!helpText) return <>{label}</>;

  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Toggletip align="right">
        <ToggletipButton label={`${label} information`}>
          <Information size={14} />
        </ToggletipButton>
        <ToggletipContent>{helpText}</ToggletipContent>
      </Toggletip>
    </span>
  );
};
