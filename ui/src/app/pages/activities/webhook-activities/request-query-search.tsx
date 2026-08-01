import {
  QuerySearch,
  parseQuerySearchFilters,
} from '@/app/components/carbon/query-search';
import type {
  QuerySearchField,
  QuerySearchOption,
} from '@/app/components/carbon/query-search';

type RequestLogSearchCriteria = {
  k: string;
  logic: string;
  v: string;
};

type RequestLogQuerySearchProps = {
  onApply: (criteria: RequestLogSearchCriteria[]) => void;
  onChange: (value: string) => void;
  value: string;
};

const METHOD_OPTIONS: QuerySearchOption[] = [
  { id: 'GET', text: 'GET' },
  { id: 'POST', text: 'POST' },
  { id: 'PUT', text: 'PUT' },
  { id: 'PATCH', text: 'PATCH' },
  { id: 'DELETE', text: 'DELETE' },
];

const STATUS_OPTIONS: QuerySearchOption[] = [
  { id: 'IN_PROGRESS', text: 'in progress' },
  { id: 'COMPLETE', text: 'complete' },
  { id: 'FAILED', text: 'failed' },
];

const NUMBER_LOGIC_OPTIONS = [
  { label: 'is', logic: '=' },
  { label: 'is greater than or equal to', logic: '>=' },
  { label: 'is less than or equal to', logic: '<=' },
];

const REQUEST_LOG_SEARCH_FIELDS: QuerySearchField[] = [
  {
    queryKey: 'id',
    text: 'logID',
    type: 'string',
  },
  {
    logicLabel: 'is after',
    logicOptions: [
      { label: 'is after', logic: '>=' },
      { label: 'is before', logic: '<=' },
      { label: 'is', logic: '=' },
    ],
    queryKey: 'timestamp',
    text: 'timestamp',
    type: 'date',
  },
  {
    queryKey: 'source_ref_id',
    text: 'requestID',
    type: 'number',
  },
  {
    queryKey: 'assistant_conversation_id',
    text: 'sessionID',
    type: 'string',
  },
  {
    queryKey: 'assistant_id',
    text: 'assistantID',
    type: 'string',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'contains', logic: 'contains' },
    ],
    queryKey: 'source_event',
    text: 'event',
    type: 'string',
  },
  {
    items: METHOD_OPTIONS,
    queryKey: 'http_method',
    text: 'method',
    type: 'string',
  },
  {
    logicLabel: 'contains',
    logicOptions: [
      { label: 'contains', logic: 'contains' },
      { label: 'is', logic: '=' },
    ],
    queryKey: 'http_url',
    text: 'endpoint',
    type: 'string',
  },
  {
    logicLabel: 'is',
    logicOptions: NUMBER_LOGIC_OPTIONS,
    queryKey: 'response_status',
    text: 'httpStatus',
    type: 'number',
  },
  {
    logicLabel: 'is',
    logicOptions: NUMBER_LOGIC_OPTIONS,
    queryKey: 'time_taken',
    text: 'timeTaken',
    type: 'number',
  },
  {
    logicLabel: 'is',
    logicOptions: NUMBER_LOGIC_OPTIONS,
    queryKey: 'retry_count',
    text: 'retryCount',
    type: 'number',
  },
  {
    formatValue: value =>
      STATUS_OPTIONS.find(option => option.id === value)?.text || value,
    items: STATUS_OPTIONS,
    queryKey: 'status',
    text: 'status',
    type: 'string',
  },
];

const REQUEST_LOG_SEARCH_CRITERIA: Record<string, string> = {
  assistant_conversation_id: 'assistant_conversation_id',
  assistant_id: 'assistant_id',
  http_method: 'http_method',
  http_url: 'http_url',
  id: 'id',
  response_status: 'response_status',
  retry_count: 'retry_count',
  source_event: 'source_event',
  source_ref_id: 'source_ref_id',
  status: 'status',
  time_taken: 'time_taken',
  timestamp: 'created_date',
};

export const getRequestLogSearchCriteria = (
  value: string,
): RequestLogSearchCriteria[] =>
  parseQuerySearchFilters(REQUEST_LOG_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = REQUEST_LOG_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria,
        logic: filter.logic,
        v: filter.value,
      };
    })
    .filter(
      (criteria): criteria is RequestLogSearchCriteria => criteria !== null,
    );

export const RequestLogQuerySearch = ({
  onApply,
  onChange,
  value,
}: RequestLogQuerySearchProps) => (
  <QuerySearch
    dateTimeMode="local-to-utc"
    fields={REQUEST_LOG_SEARCH_FIELDS}
    value={value}
    maxOptions={REQUEST_LOG_SEARCH_FIELDS.length}
    placeholder="Search for logID, requestID, endpoint, status and more"
    onChange={onChange}
    onApply={nextValue => onApply(getRequestLogSearchCriteria(nextValue))}
  />
);
