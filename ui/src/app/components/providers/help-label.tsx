import React from 'react';
import { Information } from '@carbon/icons-react';
import { Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';

export const HelpToggletip: React.FC<{
  label: string;
  helpText?: React.ReactNode;
}> = ({ label, helpText }) => {
  if (!helpText) return null;

  return (
    <Toggletip align="right">
      <ToggletipButton label={`${label} information`}>
        <Information size={14} />
      </ToggletipButton>
      <ToggletipContent>{helpText}</ToggletipContent>
    </Toggletip>
  );
};
