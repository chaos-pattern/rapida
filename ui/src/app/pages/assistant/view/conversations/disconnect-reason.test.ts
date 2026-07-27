import { Metadata } from '@rapidaai/react';
import { getDisconnectReasonDisplay } from './disconnect-reason';

const metadata = (key: string, value: string): Metadata => {
  const item = new Metadata();
  item.setKey(key);
  item.setValue(value);
  return item;
};

describe('getDisconnectReasonDisplay', () => {
  it('shows user busy when SIP busy metadata is present', () => {
    const display = getDisconnectReasonDisplay('outbound_rejected', 'FAILED', [
      metadata('failure_class', 'busy'),
      metadata('failure_reason', 'Busy Here'),
      metadata('sli_result', 'client_error'),
      metadata('sli_reason', 'outbound_busy'),
      metadata('provider_status_code', '486'),
    ]);

    expect(display.label).toBe('User busy');
    expect(display.details).toEqual(
      expect.arrayContaining([
        { label: 'Disconnect reason', value: 'outbound_rejected' },
        { label: 'Failure class', value: 'busy' },
        { label: 'Failure reason', value: 'Busy Here' },
        { label: 'SLI result', value: 'client_error' },
        { label: 'SLI reason', value: 'outbound_busy' },
        { label: 'Provider status', value: '486' },
      ]),
    );
  });

  it('shows in progress when a non-terminal session has no reason', () => {
    expect(getDisconnectReasonDisplay('', 'ACTIVE').label).toBe('In progress');
  });

  it('shows no reason when a terminal session has no reason', () => {
    expect(getDisconnectReasonDisplay('', 'FAILED').label).toBe('No reason');
  });

  it('humanizes raw backend reasons', () => {
    expect(getDisconnectReasonDisplay('outbound_rejected', 'FAILED').label).toBe(
      'Outbound Rejected',
    );
  });
});
