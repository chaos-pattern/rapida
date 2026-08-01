import {
  QuerySearch,
  parseQuerySearchFilters,
} from '@/app/components/carbon/query-search';
import type {
  QuerySearchField,
  QuerySearchOption,
} from '@/app/components/carbon/query-search';
import { TEXT_PROVIDERS } from '@/providers';

type LLMLogSearchCriteria = {
  k: string;
  logic: string;
  v: string;
};

type LLMLogQuerySearchProps = {
  onApply: (criteria: LLMLogSearchCriteria[]) => void;
  onChange: (value: string) => void;
  value: string;
};

const PROVIDER_OPTIONS: QuerySearchOption[] = TEXT_PROVIDERS.map(provider => ({
  id: provider.code,
  text: provider.name,
}));

const STATUS_OPTIONS: QuerySearchOption[] = [
  { id: 'COMPLETE', text: 'complete' },
  { id: 'FAILED', text: 'failed' },
];

const LLM_LOG_SEARCH_FIELDS: QuerySearchField[] = [
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
    formatValue: value =>
      PROVIDER_OPTIONS.find(option => option.id === value)?.text || value,
    items: PROVIDER_OPTIONS,
    queryKey: 'provider_name',
    text: 'provider',
    type: 'string',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'contains', logic: 'contains' },
    ],
    queryKey: 'model_name',
    text: 'model',
    type: 'string',
  },
  {
    queryKey: 'assistant_id',
    text: 'assistantID',
    type: 'string',
  },
  {
    queryKey: 'endpoint_id',
    text: 'endpointID',
    type: 'string',
  },
  {
    queryKey: 'knowledge_id',
    text: 'knowledgeID',
    type: 'string',
  },
  {
    queryKey: 'source',
    text: 'source',
    type: 'string',
  },
  {
    queryKey: 'response_status',
    text: 'httpStatus',
    type: 'number',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'is greater than or equal to', logic: '>=' },
      { label: 'is less than or equal to', logic: '<=' },
    ],
    queryKey: 'time_to_first_token',
    text: 'ttft',
    type: 'number',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'is greater than or equal to', logic: '>=' },
      { label: 'is less than or equal to', logic: '<=' },
    ],
    queryKey: 'time_taken',
    text: 'trt',
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

const LLM_LOG_SEARCH_CRITERIA: Record<string, string> = {
  assistant_id: 'assistant_id',
  endpoint_id: 'endpoint_id',
  id: 'id',
  knowledge_id: 'knowledge_id',
  model_name: 'model_name',
  provider_name: 'provider_name',
  response_status: 'response_status',
  source: 'source',
  status: 'status',
  time_taken: 'time_taken',
  time_to_first_token: 'time_to_first_token',
  timestamp: 'created_date',
};

export const getLLMLogSearchCriteria = (
  value: string,
): LLMLogSearchCriteria[] =>
  parseQuerySearchFilters(LLM_LOG_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = LLM_LOG_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria,
        logic: filter.logic,
        v: filter.value,
      };
    })
    .filter((criteria): criteria is LLMLogSearchCriteria => criteria !== null);

export const LLMLogQuerySearch = ({
  onApply,
  onChange,
  value,
}: LLMLogQuerySearchProps) => (
  <QuerySearch
    dateTimeMode="local-to-utc"
    fields={LLM_LOG_SEARCH_FIELDS}
    value={value}
    maxOptions={LLM_LOG_SEARCH_FIELDS.length}
    placeholder="Search for logID, provider, model, ttft, trt and more"
    onChange={onChange}
    onApply={nextValue => onApply(getLLMLogSearchCriteria(nextValue))}
  />
);
