import { useMemo, useRef, useState } from 'react';
import { Button } from '@carbon/react';
import { Close, Search } from '@carbon/icons-react';
import {
  ALL_EVENT_OPTIONS,
  COMPONENT_OPTIONS,
  FilterOption,
  KIND_OPTIONS,
  LEVEL_OPTIONS,
  METRIC_NAME_OPTIONS,
  ROLE_OPTIONS,
  SCOPE_OPTIONS,
} from '../constants';

type QueryFilterCategory = 'attributes' | 'date' | 'event' | 'record' | 'scope';

type QueryFilterField = {
  aliases?: string[];
  category: QueryFilterCategory;
  items?: FilterOption[];
  queryKey: string;
  text: string;
  type: 'date' | 'number' | 'string';
};

type QueryFilterTab = {
  id: 'all' | QueryFilterCategory;
  text: string;
};

type TraceQuerySearchProps = {
  onApply: (value: string) => void;
  onChange: (value: string) => void;
  value: string;
};

type QueryTokenPart = {
  end: number;
  start: number;
  text: string;
};

type QueryFilterChip = {
  key: string;
  label: string;
  raw: string;
  value: string;
};

const QUERY_FILTER_TABS: QueryFilterTab[] = [
  { id: 'all', text: 'All' },
  { id: 'event', text: 'Event' },
  { id: 'scope', text: 'Scope' },
  { id: 'attributes', text: 'Attributes' },
  { id: 'date', text: 'Date' },
  { id: 'record', text: 'Record' },
];

const withoutAll = (options: FilterOption[]): FilterOption[] =>
  options.filter(option => option.id !== 'all');

const QUERY_FILTER_FIELDS: QueryFilterField[] = [
  {
    aliases: [
      'assistantConversationId',
      'assistant_conversation_id',
      'conversation',
      'conversation_id',
      'conversationId',
    ],
    category: 'scope',
    queryKey: 'scopeAttributes.assistantConversationId',
    text: 'conversation',
    type: 'number',
  },
  {
    category: 'attributes',
    items: withoutAll(COMPONENT_OPTIONS),
    queryKey: 'component',
    text: 'component',
    type: 'string',
  },
  {
    category: 'event',
    items: withoutAll(ALL_EVENT_OPTIONS),
    queryKey: 'event',
    text: 'event',
    type: 'string',
  },
  {
    category: 'scope',
    items: withoutAll(SCOPE_OPTIONS),
    queryKey: 'scope',
    text: 'scope',
    type: 'string',
  },
  {
    category: 'scope',
    items: withoutAll(ROLE_OPTIONS),
    queryKey: 'role',
    text: 'role',
    type: 'string',
  },
  {
    category: 'record',
    items: withoutAll(KIND_OPTIONS),
    queryKey: 'kind',
    text: 'kind',
    type: 'string',
  },
  {
    category: 'record',
    items: withoutAll(LEVEL_OPTIONS),
    queryKey: 'level',
    text: 'level',
    type: 'string',
  },
  {
    category: 'record',
    items: withoutAll(METRIC_NAME_OPTIONS),
    queryKey: 'metric',
    text: 'metric',
    type: 'string',
  },
  {
    category: 'record',
    queryKey: 'trace',
    text: 'trace',
    type: 'string',
  },
  {
    category: 'scope',
    queryKey: 'assistant',
    text: 'assistant',
    type: 'number',
  },
  {
    category: 'scope',
    queryKey: 'message',
    text: 'message',
    type: 'string',
  },
  {
    category: 'attributes',
    queryKey: 'attributes.component',
    text: 'attributes.component',
    type: 'string',
  },
  {
    category: 'attributes',
    queryKey: 'attributes.provider',
    text: 'attributes.provider',
    type: 'string',
  },
  {
    category: 'attributes',
    queryKey: 'context.traceId',
    text: 'context.traceId',
    type: 'string',
  },
  {
    category: 'date',
    queryKey: 'from',
    text: 'from',
    type: 'date',
  },
  {
    category: 'date',
    queryKey: 'to',
    text: 'to',
    type: 'date',
  },
];

const getCurrentTokenRange = (value: string) => {
  const end = value.length;
  const start = Math.max(value.lastIndexOf(' ') + 1, 0);
  return {
    end,
    start,
    text: value.slice(start, end),
  };
};

const QUERY_TOKEN_PATTERN = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\S+/g;

const splitQueryParts = (query: string): QueryTokenPart[] =>
  Array.from(query.matchAll(QUERY_TOKEN_PATTERN)).map(match => ({
    end: (match.index || 0) + match[0].length,
    start: match.index || 0,
    text: match[0],
  }));

const quoteFilterValue = (value: string): string =>
  /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;

const unquoteFilterValue = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const splitFilterToken = (
  token: string,
): { key: string; value: string } | null => {
  const separatorIndex = token.indexOf(':');
  if (separatorIndex <= 0) return null;

  return {
    key: token.slice(0, separatorIndex),
    value: token.slice(separatorIndex + 1),
  };
};

const parseQueryFilterChip = (token: string): QueryFilterChip | null => {
  const filterToken = splitFilterToken(token);
  if (!filterToken) return null;

  const { key, value: rawValue } = filterToken;
  if (!rawValue) return null;
  const field = getFieldByKey(key);
  if (!field) return null;

  return {
    key,
    label: field.text,
    raw: token,
    value: unquoteFilterValue(rawValue),
  };
};

const joinQueryParts = (chips: QueryFilterChip[], draft: string): string =>
  [...chips.map(chip => chip.raw), draft.trim()].filter(Boolean).join(' ');

const replaceCurrentToken = (value: string, nextToken: string): string => {
  const token = getCurrentTokenRange(value);
  const before = value.slice(0, token.start).trimEnd();
  const after = value.slice(token.end).trimStart();
  return [before, nextToken, after].filter(Boolean).join(' ');
};

const completeCurrentToken = (value: string, nextToken: string): string =>
  replaceCurrentToken(value, nextToken).trim();

const getFieldByKey = (queryKey: string): QueryFilterField | undefined =>
  QUERY_FILTER_FIELDS.find(
    field => field.queryKey === queryKey || field.aliases?.includes(queryKey),
  );

export const TraceQuerySearch = ({
  onApply,
  onChange,
  value,
}: TraceQuerySearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<QueryFilterTab['id']>('all');
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const valueEndsWithSpace = /\s$/.test(value);
  const queryParts = splitQueryParts(value);
  const displayParts = queryParts.reduce(
    (next, part, index) => {
      const chip = parseQueryFilterChip(part.text);
      const isCurrentPart = index === queryParts.length - 1;
      if (chip && (!isCurrentPart || valueEndsWithSpace || !isEditingDraft)) {
        next.chips.push(chip);
        return next;
      }
      next.draftParts.push(part.text);
      return next;
    },
    { chips: [] as QueryFilterChip[], draftParts: [] as string[] },
  );
  const chipTokens = displayParts.chips;
  const draftValue = displayParts.draftParts.join(' ');
  const currentToken = getCurrentTokenRange(draftValue);
  const currentFilterToken = splitFilterToken(currentToken.text);
  const currentValue = currentFilterToken?.value || '';
  const selectedField = currentFilterToken
    ? getFieldByKey(currentFilterToken.key)
    : undefined;
  const isValueMode = Boolean(selectedField);
  const currentDisplayValue = unquoteFilterValue(currentValue);

  const fieldOptions = useMemo(
    () =>
      QUERY_FILTER_FIELDS.filter(field => {
        const matchesTab = activeTab === 'all' || field.category === activeTab;
        const matchesSearch =
          !currentToken.text ||
          field.text.toLowerCase().includes(currentToken.text.toLowerCase()) ||
          field.queryKey
            .toLowerCase()
            .includes(currentToken.text.toLowerCase());
        return matchesTab && matchesSearch;
      }).slice(0, 10),
    [activeTab, currentToken.text],
  );

  const directEventOptions = useMemo(() => {
    if (activeTab !== 'event' || isValueMode) return [];
    const search = currentToken.text.toLowerCase();
    return withoutAll(ALL_EVENT_OPTIONS).filter(
      option => !search || option.id.toLowerCase().includes(search),
    );
  }, [activeTab, currentToken.text, isValueMode]);

  const valueOptions = useMemo(() => {
    if (!selectedField?.items) return [];
    const search = currentValue.toLowerCase();
    const options = selectedField.items.filter(option =>
      option.id.toLowerCase().includes(search),
    );
    return selectedField.queryKey === 'event' ? options : options.slice(0, 10);
  }, [currentValue, selectedField]);

  const applyNextValue = (nextValue: string) => {
    setIsEditingDraft(false);
    onChange(nextValue);
    onApply(nextValue);
  };

  const setDraftValue = (nextDraft: string) => {
    setIsEditingDraft(true);
    onChange(joinQueryParts(chipTokens, nextDraft));
  };

  const selectField = (field: QueryFilterField) => {
    const nextDraft = replaceCurrentToken(draftValue, `${field.queryKey}:`);
    setDraftValue(nextDraft);
    setIsOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const selectValue = (field: QueryFilterField, option: FilterOption) => {
    const nextDraft = completeCurrentToken(
      draftValue,
      `${field.queryKey}:${quoteFilterValue(option.id)}`,
    );
    applyNextValue(`${joinQueryParts(chipTokens, nextDraft)} `);
    setIsOpen(false);
  };

  const selectEvent = (option: FilterOption) => {
    const eventField = getFieldByKey('event');
    if (!eventField) return;
    const nextDraft = completeCurrentToken(
      draftValue,
      `${eventField.queryKey}:${quoteFilterValue(option.id)}`,
    );
    applyNextValue(`${joinQueryParts(chipTokens, nextDraft)} `);
    setIsOpen(false);
  };

  const removeChip = (index: number) => {
    const nextChips = chipTokens.filter((_, chipIndex) => chipIndex !== index);
    applyNextValue(joinQueryParts(nextChips, draftValue));
  };

  const clearDraftFilter = () => {
    setDraftValue(replaceCurrentToken(draftValue, ''));
    setIsOpen(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearSearch = () => {
    setIsEditingDraft(false);
    applyNextValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const fieldOptionRows = fieldOptions.map(field => (
    <button
      key={field.queryKey}
      type="button"
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
      onClick={() => selectField(field)}
    >
      <span className="truncate font-mono">{field.text}</span>
      <span className="text-[var(--cds-link-primary)]">{field.type}</span>
    </button>
  ));

  const valueOptionRows =
    selectedField && valueOptions.length > 0
      ? valueOptions.map(option => (
          <button
            key={option.id}
            type="button"
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
            onClick={() => selectValue(selectedField, option)}
          >
            <span className="truncate font-mono">{option.id}</span>
            <span className="text-[var(--cds-link-primary)]">
              {selectedField.type}
            </span>
          </button>
        ))
      : null;

  const directEventRows =
    directEventOptions.length > 0
      ? directEventOptions.map(option => (
          <button
            key={option.id}
            type="button"
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
            onClick={() => selectEvent(option)}
          >
            <span className="truncate font-mono">{option.id}</span>
            <span className="text-[var(--cds-link-primary)]">event</span>
          </button>
        ))
      : null;
  let optionRows = fieldOptionRows;
  if (activeTab === 'event') optionRows = directEventRows;
  if (isValueMode) optionRows = valueOptionRows;

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className={[
          'flex h-12 min-w-0 items-center gap-2 border border-transparent bg-white px-3 text-sm dark:bg-gray-950',
          isOpen
            ? 'border-[var(--cds-border-interactive)] shadow-[0_0_0_1px_var(--cds-border-interactive)]'
            : 'border-gray-200 dark:border-gray-800',
        ].join(' ')}
      >
        <Search className="h-5 w-5 shrink-0 text-gray-500" />
        {chipTokens.map((chip, index) => (
          <span
            key={`${chip.raw}-${index}`}
            className="flex max-w-[280px] shrink-0 items-center gap-1 border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-sm dark:border-gray-800 dark:bg-gray-900"
            title={
              chip.key === chip.label ? chip.raw : `${chip.key}:${chip.value}`
            }
          >
            <span className="truncate text-gray-600 dark:text-gray-300">
              {chip.label}
            </span>
            <span className="text-gray-500">is</span>
            <span className="truncate text-[var(--cds-link-primary)]">
              {chip.value}
            </span>
            <button
              type="button"
              className="ml-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => removeChip(index)}
            >
              x
            </button>
          </span>
        ))}
        {isValueMode && selectedField ? (
          <span className="flex max-w-[360px] shrink-0 items-center gap-1 border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-sm dark:border-gray-800 dark:bg-gray-900">
            <span className="truncate text-gray-600 dark:text-gray-300">
              {selectedField.text}
            </span>
            <span className="text-gray-500">is</span>
            <input
              ref={inputRef}
              className="min-w-[80px] flex-1 bg-transparent text-[var(--cds-link-primary)] outline-none placeholder:text-gray-400"
              placeholder="value"
              value={currentDisplayValue}
              onBlur={() =>
                window.setTimeout(() => {
                  setIsEditingDraft(false);
                  setIsOpen(false);
                }, 150)
              }
              onChange={event => {
                setDraftValue(
                  replaceCurrentToken(
                    draftValue,
                    `${selectedField.queryKey}:${quoteFilterValue(
                      event.target.value,
                    )}`,
                  ),
                );
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Backspace' && !currentDisplayValue) {
                  clearDraftFilter();
                }
                if (event.key === 'Enter') {
                  const nextDraftChip = parseQueryFilterChip(draftValue.trim());
                  const nextValue = nextDraftChip
                    ? `${joinQueryParts([...chipTokens, nextDraftChip], '')} `
                    : joinQueryParts(chipTokens, draftValue);
                  applyNextValue(nextValue);
                  setIsOpen(false);
                }
                if (event.key === 'Escape') setIsOpen(false);
              }}
            />
            <button
              type="button"
              className="ml-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              onClick={clearDraftFilter}
            >
              x
            </button>
          </span>
        ) : (
          <input
            ref={inputRef}
            className="min-w-[180px] flex-1 bg-transparent font-mono text-sm outline-none placeholder:font-sans placeholder:text-gray-500"
            placeholder="Search or filter: conversation:234 component:tts event:tts.speaking"
            value={draftValue}
            onBlur={() =>
              window.setTimeout(() => {
                setIsEditingDraft(false);
                setIsOpen(false);
              }, 150)
            }
            onChange={event => {
              const nextDraft = event.target.value;
              const nextDraftChip = parseQueryFilterChip(nextDraft.trim());
              if (nextDraftChip && /\s$/.test(nextDraft)) {
                onChange(
                  `${joinQueryParts([...chipTokens, nextDraftChip], '')} `,
                );
              } else {
                setDraftValue(nextDraft);
              }
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                const nextDraftChip = parseQueryFilterChip(draftValue.trim());
                const nextValue = nextDraftChip
                  ? `${joinQueryParts([...chipTokens, nextDraftChip], '')} `
                  : joinQueryParts(chipTokens, draftValue);
                applyNextValue(nextValue);
                setIsOpen(false);
              }
              if (event.key === 'Escape') setIsOpen(false);
            }}
          />
        )}
        <Button
          hasIconOnly
          kind="ghost"
          size="sm"
          iconDescription="Case sensitive"
          tooltipPosition="bottom"
          className="!h-8 !min-h-8 !w-8 !min-w-8 !p-0"
        >
          Aa
        </Button>
        {value && (
          <Button
            hasIconOnly
            kind="ghost"
            size="sm"
            renderIcon={Close}
            iconDescription="Clear search"
            tooltipPosition="bottom"
            className="!h-8 !min-h-8 !w-8 !min-w-8 !p-0"
            onClick={clearSearch}
          />
        )}
      </div>

      {isOpen && (
        <div
          className="absolute left-0 top-[calc(100%+0.125rem)] z-40 w-[min(760px,calc(100vw-2rem))] overflow-hidden border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
          onMouseDown={event => event.preventDefault()}
        >
          {!isValueMode && (
            <div className="flex border-b border-gray-200 px-2 pt-2 dark:border-gray-800">
              {QUERY_FILTER_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={[
                    'px-3 py-2 text-sm',
                    activeTab === tab.id
                      ? 'border-b-2 border-[var(--cds-border-interactive)] text-[var(--cds-text-primary)]'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200',
                  ].join(' ')}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.text}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-[320px] overflow-auto py-2">{optionRows}</div>
        </div>
      )}
    </div>
  );
};
