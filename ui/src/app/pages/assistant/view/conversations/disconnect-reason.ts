import { Metadata } from '@rapidaai/react';

export type DisconnectReasonDetail = {
  label: string;
  value: string;
};

export type DisconnectReasonDisplay = {
  label: string;
  tooltip: string;
  details: DisconnectReasonDetail[];
};

const DETAIL_FIELDS = [
  { key: 'status', label: 'Status' },
  { key: 'disconnect_reason', label: 'Disconnect reason' },
  { key: 'disconnect_raw_reason', label: 'Raw reason' },
  { key: 'failure_class', label: 'Failure class' },
  { key: 'failure_reason', label: 'Failure reason' },
  { key: 'sli_result', label: 'SLI result' },
  { key: 'sli_reason', label: 'SLI reason' },
  { key: 'provider_status_code', label: 'Provider status' },
  { key: 'call_error', label: 'Call error' },
] as const;

const getMetadataValue = (metadata: Metadata[] | undefined, key: string): string =>
  metadata?.find(item => item.getKey() === key)?.getValue()?.trim() ?? '';

const humanize = (value: string): string =>
  value
    .trim()
    .replace(/^DISCONNECTION_TYPE_/, '')
    .replace(/^CONVERSATIONDISCONNECTION_/, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());

const isTerminalStatus = (status?: string): boolean => {
  const value = status?.trim().toUpperCase();
  return ['FAILED', 'CANCELLED', 'CANCELED', 'COMPLETE', 'COMPLETED'].includes(
    value || '',
  );
};

const isBusy = (reason?: string | null, metadata?: Metadata[]): boolean => {
  const failureClass = getMetadataValue(metadata, 'failure_class').toLowerCase();
  const failureReason = getMetadataValue(metadata, 'failure_reason').toLowerCase();
  const sliReason = getMetadataValue(metadata, 'sli_reason').toLowerCase();
  const providerStatusCode = getMetadataValue(metadata, 'provider_status_code');
  const rawReason = reason?.trim().toLowerCase();

  return (
    providerStatusCode === '486' ||
    failureClass === 'busy' ||
    sliReason === 'outbound_busy' ||
    rawReason === 'outbound_busy' ||
    failureReason.includes('busy')
  );
};

const getDetails = (
  reason?: string | null,
  status?: string,
  metadata?: Metadata[],
): DisconnectReasonDetail[] => {
  const values = new Map<string, string>();
  const cleanReason = reason?.trim() ?? '';
  if (status?.trim()) values.set('status', status.trim());
  if (cleanReason && cleanReason.toLowerCase() !== 'unknown') {
    values.set('disconnect_reason', cleanReason);
  }

  DETAIL_FIELDS.forEach(field => {
    if (field.key === 'status') return;
    const value = getMetadataValue(metadata, field.key);
    if (value) values.set(field.key, value);
  });

  return DETAIL_FIELDS.flatMap(field => {
    const value = values.get(field.key);
    return value ? [{ label: field.label, value }] : [];
  });
};

export const getDisconnectReasonDisplay = (
  reason?: string | null,
  status?: string,
  metadata?: Metadata[],
): DisconnectReasonDisplay => {
  const details = getDetails(reason, status, metadata);
  const cleanReason = reason?.trim() ?? '';
  const hasReason = cleanReason && cleanReason.toLowerCase() !== 'unknown';

  if (isBusy(reason, metadata)) {
    return {
      label: 'User busy',
      tooltip: 'The outbound call was rejected because the callee was busy.',
      details,
    };
  }

  if (hasReason) {
    return {
      label: humanize(cleanReason),
      tooltip: 'The backend reported this disconnect reason for the session.',
      details,
    };
  }

  if (!isTerminalStatus(status)) {
    return {
      label: 'In progress',
      tooltip: 'The session has not ended yet, so no disconnect reason is available.',
      details,
    };
  }

  return {
    label: 'No reason',
    tooltip: 'No disconnect reason metadata was recorded for this session.',
    details,
  };
};
