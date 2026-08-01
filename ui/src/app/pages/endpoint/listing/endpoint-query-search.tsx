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
    queryKey: 'id',
    text: 'endpointID',
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
    queryKey: 'model_provider_name',
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

const ENDPOINT_SEARCH_CRITERIA: Record<string, string> = {
  id: 'id',
  model_provider_name: 'model_provider_name',
  name: 'name',
  tags: 'tags',
};

export const getEndpointSearchCriteria = (
  value: string,
): EndpointSearchCriteria[] =>
  parseQuerySearchFilters(ENDPOINT_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = ENDPOINT_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria,
        logic: filter.logic,
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
