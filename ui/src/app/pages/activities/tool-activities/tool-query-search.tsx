import {
  QuerySearch,
  parseQuerySearchFilters,
} from '@/app/components/carbon/query-search';
import type {
  QuerySearchField,
  QuerySearchOption,
} from '@/app/components/carbon/query-search';

type ToolLogSearchCriteria = {
  k: string;
  logic: string;
  v: string;
};

type ToolLogQuerySearchProps = {
  onApply: (criteria: ToolLogSearchCriteria[]) => void;
  onChange: (value: string) => void;
  value: string;
};

const STATUS_OPTIONS: QuerySearchOption[] = [
  { id: 'IN_PROGRESS', text: 'in progress' },
  { id: 'COMPLETE', text: 'complete' },
  { id: 'FAILED', text: 'failed' },
];

const TOOL_LOG_SEARCH_FIELDS: QuerySearchField[] = [
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
    queryKey: 'assistant_id',
    text: 'assistantID',
    type: 'string',
  },
  {
    queryKey: 'assistant_conversation_id',
    text: 'sessionID',
    type: 'string',
  },
  {
    queryKey: 'assistant_conversation_message_id',
    text: 'messageID',
    type: 'string',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'contains', logic: 'contains' },
    ],
    queryKey: 'assistant_tool_name',
    text: 'toolName',
    type: 'string',
  },
  {
    queryKey: 'tool_call_id',
    text: 'toolCallID',
    type: 'string',
  },
  {
    formatValue: value =>
      STATUS_OPTIONS.find(option => option.id === value)?.text || value,
    items: STATUS_OPTIONS,
    queryKey: 'status',
    text: 'status',
    type: 'string',
  },
  {
    logicLabel: 'is',
    logicOptions: [
      { label: 'is', logic: '=' },
      { label: 'is greater than', logic: '>' },
      { label: 'is less than', logic: '<' },
    ],
    queryKey: 'time_taken',
    text: 'timeTaken',
    type: 'number',
  },
];

const TOOL_LOG_SEARCH_CRITERIA: Record<string, string> = {
  assistant_conversation_id: 'assistant_conversation_id',
  assistant_conversation_message_id: 'assistant_conversation_message_id',
  assistant_id: 'assistant_id',
  assistant_tool_name: 'assistant_tool_name',
  id: 'id',
  status: 'status',
  time_taken: 'time_taken',
  timestamp: 'created_date',
  tool_call_id: 'tool_call_id',
};

export const getToolLogSearchCriteria = (
  value: string,
): ToolLogSearchCriteria[] =>
  parseQuerySearchFilters(TOOL_LOG_SEARCH_FIELDS, value)
    .map(filter => {
      const criteria = TOOL_LOG_SEARCH_CRITERIA[filter.key];
      if (!criteria || !filter.value.trim()) return null;

      return {
        k: criteria,
        logic: filter.logic,
        v: filter.value,
      };
    })
    .filter((criteria): criteria is ToolLogSearchCriteria => criteria !== null);

export const ToolLogQuerySearch = ({
  onApply,
  onChange,
  value,
}: ToolLogQuerySearchProps) => (
  <QuerySearch
    dateTimeMode="local-to-utc"
    fields={TOOL_LOG_SEARCH_FIELDS}
    value={value}
    maxOptions={TOOL_LOG_SEARCH_FIELDS.length}
    placeholder="Search for logID, toolName, assistantID, status and more"
    onChange={onChange}
    onApply={nextValue => onApply(getToolLogSearchCriteria(nextValue))}
  />
);
