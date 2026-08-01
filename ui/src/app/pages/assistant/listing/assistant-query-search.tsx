import {
  QuerySearch,
  parseQuerySearchFilters,
} from '@/app/components/carbon/query-search';
import type {
  QuerySearchField,
  QuerySearchOption,
} from '@/app/components/carbon/query-search';

type AssistantSearchCriteria = {
  k: string;
  logic: string;
  v: string;
};

type AssistantQuerySearchProps = {
  onApply: (criteria: AssistantSearchCriteria[]) => void;
  onChange: (value: string) => void;
  value: string;
};

const PROVIDER_OPTIONS: QuerySearchOption[] = [
  { id: 'MODEL', text: 'model' },
  { id: 'AGENTKIT', text: 'agentkit' },
  { id: 'AGENTFLOW', text: 'agentflow' },
];

const ASSISTANT_SEARCH_FIELDS: QuerySearchField[] = [
  {
    queryKey: 'id',
    text: 'assistantID',
    type: 'string',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'contains', logic: 'contains' },
    ],
    queryKey: 'name',
    text: 'name',
    type: 'string',
  },
  {
    formatValue: value =>
      PROVIDER_OPTIONS.find(option => option.id === value)?.text || value,
    items: PROVIDER_OPTIONS,
    queryKey: 'assistant_provider',
    text: 'provider',
    type: 'string',
  },
  {
    logicLabel: 'contains',
    logicOptions: [{ label: 'contains', logic: 'contains' }],
    queryKey: 'tags',
    text: 'tags',
    type: 'string',
  },
];

const ASSISTANT_SEARCH_CRITERIA: Record<string, string> = {
  assistant_provider: 'assistant_provider',
  id: 'id',
  name: 'name',
  tags: 'tags',
};

export const getAssistantSearchCriteria = (
  value: string,
): AssistantSearchCriteria[] =>
  parseQuerySearchFilters(ASSISTANT_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = ASSISTANT_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria,
        logic: filter.logic,
        v: filter.value,
      };
    })
    .filter(
      (criteria): criteria is AssistantSearchCriteria => criteria !== null,
    );

export const AssistantQuerySearch = ({
  onApply,
  onChange,
  value,
}: AssistantQuerySearchProps) => (
  <QuerySearch
    fields={ASSISTANT_SEARCH_FIELDS}
    value={value}
    maxOptions={ASSISTANT_SEARCH_FIELDS.length}
    placeholder="Search for assistantID, name, provider, tags"
    onChange={onChange}
    onApply={nextValue => onApply(getAssistantSearchCriteria(nextValue))}
  />
);
