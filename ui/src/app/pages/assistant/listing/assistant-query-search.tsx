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
    aliases: ['assistantId', 'assistantID', 'assistant_id'],
    queryKey: 'id',
    text: 'assistantID',
    type: 'string',
  },
  {
    aliases: ['nameContains'],
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', queryKey: 'name' },
      { label: 'contains', queryKey: 'nameContains' },
    ],
    queryKey: 'name',
    text: 'name',
    type: 'string',
  },
  {
    aliases: ['provider'],
    formatValue: value =>
      PROVIDER_OPTIONS.find(option => option.id === value)?.text || value,
    items: PROVIDER_OPTIONS,
    queryKey: 'assistant_provider',
    text: 'provider',
    type: 'string',
  },
  {
    aliases: ['tag', 'assistanttag'],
    queryKey: 'tags',
    text: 'tags',
    type: 'string',
  },
];

const ASSISTANT_SEARCH_CRITERIA: Record<
  string,
  { key: string; logic: string }
> = {
  assistantId: { key: 'id', logic: '=' },
  assistantID: { key: 'id', logic: '=' },
  assistant_id: { key: 'id', logic: '=' },
  assistant_provider: { key: 'assistant_provider', logic: '=' },
  assistantprovider: { key: 'assistant_provider', logic: '=' },
  assistanttag: { key: 'tags', logic: 'contains' },
  id: { key: 'id', logic: '=' },
  name: { key: 'name', logic: '=' },
  nameContains: { key: 'name', logic: 'contains' },
  provider: { key: 'assistant_provider', logic: '=' },
  tag: { key: 'tags', logic: 'contains' },
  tags: { key: 'tags', logic: 'contains' },
};

export const getAssistantSearchCriteria = (
  value: string,
): AssistantSearchCriteria[] =>
  parseQuerySearchFilters(ASSISTANT_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = ASSISTANT_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria.key,
        logic: criteria.logic,
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
