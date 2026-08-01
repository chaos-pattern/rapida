import {
  QuerySearch,
  parseQuerySearchFilters,
} from '@/app/components/carbon/query-search';
import type {
  QuerySearchField,
  QuerySearchOption,
} from '@/app/components/carbon/query-search';
import { TEXT_PROVIDERS } from '@/providers';

type EndpointSearchCriteria = {
  k: string;
  logic: string;
  v: string;
};

type EndpointQuerySearchProps = {
  onApply: (criteria: EndpointSearchCriteria[]) => void;
  onChange: (value: string) => void;
  value: string;
};

const PROVIDER_OPTIONS: QuerySearchOption[] = TEXT_PROVIDERS.map(provider => ({
  id: provider.code,
  text: provider.name,
}));

const ENDPOINT_SEARCH_FIELDS: QuerySearchField[] = [
  {
    aliases: ['endpointId', 'endpointID', 'endpoint_id'],
    queryKey: 'id',
    text: 'endpointID',
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
    aliases: ['provider', 'modelProviderName', 'model_provider_name'],
    formatValue: value =>
      PROVIDER_OPTIONS.find(option => option.id === value)?.text || value,
    items: PROVIDER_OPTIONS,
    queryKey: 'model_provider_name',
    text: 'provider',
    type: 'string',
  },
  {
    aliases: ['tag', 'endpointtag'],
    queryKey: 'tags',
    text: 'tags',
    type: 'string',
  },
];

const ENDPOINT_SEARCH_CRITERIA: Record<string, { key: string; logic: string }> =
  {
    endpointId: { key: 'id', logic: '=' },
    endpointID: { key: 'id', logic: '=' },
    endpoint_id: { key: 'id', logic: '=' },
    endpointtag: { key: 'tags', logic: 'contains' },
    id: { key: 'id', logic: '=' },
    model_provider_name: { key: 'model_provider_name', logic: '=' },
    modelProviderName: { key: 'model_provider_name', logic: '=' },
    name: { key: 'name', logic: '=' },
    nameContains: { key: 'name', logic: 'contains' },
    provider: { key: 'model_provider_name', logic: '=' },
    tag: { key: 'tags', logic: 'contains' },
    tags: { key: 'tags', logic: 'contains' },
  };

export const getEndpointSearchCriteria = (
  value: string,
): EndpointSearchCriteria[] =>
  parseQuerySearchFilters(ENDPOINT_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = ENDPOINT_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria.key,
        logic: criteria.logic,
        v: filter.value,
      };
    })
    .filter(
      (criteria): criteria is EndpointSearchCriteria => criteria !== null,
    );

export const EndpointQuerySearch = ({
  onApply,
  onChange,
  value,
}: EndpointQuerySearchProps) => (
  <QuerySearch
    fields={ENDPOINT_SEARCH_FIELDS}
    value={value}
    maxOptions={ENDPOINT_SEARCH_FIELDS.length}
    placeholder="Search for endpointID, name, provider, tags"
    onChange={onChange}
    onApply={nextValue => onApply(getEndpointSearchCriteria(nextValue))}
  />
);
