import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { InputVarType } from '@/models/common';
import {
  EndpointArgumentList,
  getUnsupportedEndpointVariables,
  InputFormData,
} from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/input-var-form';

const mockStringToAny = jest.fn(value => ({ kind: 'string', value }));
const mockBytesToAny = jest.fn(value => ({ kind: 'bytes', value }));

jest.mock('@rapidaai/react', () => ({
  StringToAny: (value: string) => mockStringToAny(value),
  BytesToAny: (value: Uint8Array) => mockBytesToAny(value),
}));

jest.mock('@carbon/react', () => {
  const React = require('react');

  return {
    InlineNotification: ({ title, subtitle }: any) => (
      <div role="status">
        <span>{title}</span>
        <span>{subtitle}</span>
      </div>
    ),
    Tag: ({ children }: any) => <span>{children}</span>,
    TextArea: React.forwardRef(
      ({ labelText, hideLabel, invalid, invalidText, ...props }: any, ref) => (
        <label>
          {!hideLabel && labelText}
          <textarea
            ref={ref as any}
            aria-label={labelText}
            aria-invalid={invalid ? 'true' : undefined}
            data-invalid-text={invalidText}
            {...props}
          />
        </label>
      ),
    ),
    TextInput: React.forwardRef(
      ({ labelText, hideLabel, invalid, invalidText, ...props }: any, ref) => (
        <label>
          {!hideLabel && labelText}
          <input
            ref={ref as any}
            aria-label={labelText}
            aria-invalid={invalid ? 'true' : undefined}
            data-invalid-text={invalidText}
            {...props}
          />
        </label>
      ),
    ),
  };
});

function variable(name: string, type: InputVarType, defaultValue = '') {
  return {
    getId: () => `${name}-id`,
    getName: () => name,
    getType: () => type,
    getDefaultvalue: () => defaultValue,
  } as any;
}

describe('endpoint playground argument fields', () => {
  it('renders Carbon inputs for editable endpoint variable types', () => {
    render(
      <EndpointArgumentList
        variables={[
          variable('customer_name', InputVarType.stringInput, 'Ada'),
          variable('summary', InputVarType.paragraph, 'Existing summary'),
          variable('score', InputVarType.number, '42'),
          variable('callback_url', InputVarType.url, 'https://example.com'),
          variable('payload', InputVarType.json, '{ "ok": true }'),
        ]}
        getRegistration={item => ({
          name: item.getName(),
          onChange: jest.fn(),
          onBlur: jest.fn(),
          ref: jest.fn(),
        })}
      />,
    );

    expect(screen.getByLabelText('{{customer_name}}')).toHaveValue('Ada');
    expect(screen.getByLabelText('{{summary}}')).toHaveValue(
      'Existing summary',
    );
    expect(screen.getByLabelText('{{score}}')).toHaveAttribute(
      'type',
      'number',
    );
    expect(screen.getByLabelText('{{callback_url}}')).toHaveAttribute(
      'type',
      'url',
    );
    expect(screen.getByLabelText('{{payload}}')).toHaveValue('{ "ok": true }');
  });

  it('shows unsupported endpoint variable types instead of hiding them', () => {
    const variables = [
      variable('choice', InputVarType.select),
      variable('attachment', InputVarType.files),
      variable('knowledge', InputVarType.contexts),
    ];

    render(
      <EndpointArgumentList
        variables={variables}
        getRegistration={item => ({
          name: item.getName(),
          onChange: jest.fn(),
          onBlur: jest.fn(),
          ref: jest.fn(),
        })}
      />,
    );

    expect(getUnsupportedEndpointVariables(variables)).toHaveLength(3);
    expect(screen.getAllByText('Not runnable in playground')).toHaveLength(3);
    expect(
      screen.getByText(/Select variables do not expose options/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('{{choice}}')).not.toBeInTheDocument();
  });

  it('serializes submitted argument values without normalizing names or values', async () => {
    const result = await InputFormData({
      customer_name: 'Ada',
      payload: '{ "ok": true }',
    });

    expect(mockStringToAny).toHaveBeenCalledWith('Ada');
    expect(mockStringToAny).toHaveBeenCalledWith('{ "ok": true }');
    expect(Array.from(result.keys())).toEqual(['customer_name', 'payload']);
  });
});
