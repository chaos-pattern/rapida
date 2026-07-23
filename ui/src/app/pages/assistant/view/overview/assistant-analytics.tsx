import {
  Assistant,
  AssistantConversation,
  AssistantConversationMessage,
  GetAllAssistantConversation,
} from '@rapidaai/react';
import { connectionConfig } from '@/configs';
import { toDate, toDateString } from '@/utils/date';
import {
  getTotalTokenMetric,
  findMetricByName,
  isConversationCompleted,
} from '@/utils/metadata';
import {
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Bar,
  BarChart,
  YAxis,
  AreaChart,
  Area,
} from 'recharts';
import {
  NameType,
  ValueType,
} from 'recharts/types/component/DefaultTooltipContent';
import { ContentType } from 'recharts/types/component/Tooltip';
import { useAssistantTracePageStore } from '@/hooks/use-assistant-trace-page-store';
import { FC, ReactNode, useEffect, useState } from 'react';
import { cn } from '@/utils';
import { useCurrentCredential } from '@/hooks/use-credential';
import { useGlobalNavigation } from '@/hooks/use-global-navigator';
import { Dropdown } from '@/app/components/carbon/dropdown';
import { Tile } from '@/app/components/carbon/tile';
import {
  Button,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
} from '@carbon/react';
import { Information } from '@carbon/icons-react';

const CHART_COLORS = [
  'var(--cds-interactive, #1e40af)',
  '#22d3ee',
  '#f59e0b',
  '#10b981',
  '#f43f5e',
  '#8b5cf6',
];

const DATE_RANGES = [
  { id: 'last_24_hours', text: 'Last 24 hours' },
  { id: 'last_3_days', text: 'Last 3 days' },
  { id: 'last_7_days', text: 'Last 7 days' },
  { id: 'last_30_days', text: 'Last 30 days' },
];

const AUTO_REFRESH_OPTIONS = [
  { id: '0', text: 'Off' },
  { id: '5', text: 'Every 5 min' },
  { id: '10', text: 'Every 10 min' },
  { id: '30', text: 'Every 30 min' },
];

const getStartDate = (range: string): Date => {
  const now = new Date();
  switch (range) {
    case 'last_24_hours':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'last_3_days':
      return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    case 'last_7_days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

export const AssistantAnalytics: FC<{ assistant: Assistant }> = props => {
  const assistantTraceAction = useAssistantTracePageStore();
  const navigation = useGlobalNavigation();
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<null | number>(
    null,
  );
  const [selectedRange, setSelectedRange] = useState<string>('last_30_days');
  const [convList, setConvList] = useState<AssistantConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { authId, token, projectId } = useCurrentCredential();

  const getDateRangeCriteria = (range: string) => ({
    k: 'assistant_conversation_messages.created_date',
    v: toDateString(getStartDate(range)),
    logic: '>=',
  });

  const getConversationDateCriteria = (range: string) => [
    {
      key: 'assistant_conversations.created_date',
      value: toDateString(getStartDate(range)),
      logic: '>=',
    },
  ];

  useEffect(() => {
    assistantTraceAction.clear();
    assistantTraceAction.addCriterias([getDateRangeCriteria(selectedRange)]);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAssistantMessages();
    fetchConversations();
  }, [
    props.assistant.getId(),
    projectId,
    selectedRange,
    JSON.stringify(assistantTraceAction.criteria),
    token,
    authId,
  ]);

  const fetchAssistantMessages = () => {
    assistantTraceAction.setPageSize(0);
    assistantTraceAction.setFields(['metadata', 'metric']);
    assistantTraceAction.addCriterias([getDateRangeCriteria(selectedRange)]);
    assistantTraceAction.getAssistantMessages(
      props.assistant.getId(),
      projectId,
      token,
      authId,
      () => {
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
  };

  const fetchConversations = () => {
    GetAllAssistantConversation(
      connectionConfig,
      props.assistant.getId(),
      1,
      0,
      getConversationDateCriteria(selectedRange),
      (err, res) => {
        if (res?.getSuccess()) setConvList(res.getDataList());
      },
      { authorization: token, 'x-auth-id': authId, 'x-project-id': projectId },
    );
  };

  useEffect(() => {
    let id: NodeJS.Timeout | null = null;
    if (autoRefreshInterval && autoRefreshInterval > 0)
      id = setInterval(
        () => {
          fetchAssistantMessages();
          fetchConversations();
        },
        autoRefreshInterval * 60 * 1000,
      );
    return () => {
      if (id) clearInterval(id);
    };
  }, [autoRefreshInterval]);

  // ── Derive conversation groups ──
  const conversationsMap = assistantTraceAction.assistantMessages.reduce(
    (acc, message) => {
      const id = message.getAssistantconversationid();
      if (!acc.has(id)) acc.set(id, []);
      acc.get(id)!.push(message);
      return acc;
    },
    new Map<string, AssistantConversationMessage[]>(),
  );

  const conversations = Array.from(conversationsMap.values());
  const totalMessages = assistantTraceAction.assistantMessages.length;

  // ── All counts from conversations API for consistency ──
  const totalSessions = convList.length;
  const completedConversations = convList.filter(c =>
    isConversationCompleted(c.getMetricsList?.() || []),
  ).length;
  const failedConversations = convList.filter(c => {
    const s = findMetricByName(
      c.getMetricsList?.() || [],
      'status',
    ).toUpperCase();
    return s === 'FAILED' || s === 'ERROR';
  }).length;
  const activeConversations =
    totalSessions - completedConversations - failedConversations;

  // ── Duration: from message-grouped conversations (message-level data) ──
  const durations = conversations.map(conv => {
    const sorted = [...conv].sort(
      (a, b) =>
        toDate(a.getCreateddate()!).getTime() -
        toDate(b.getCreateddate()!).getTime(),
    );
    return (
      (toDate(sorted[sorted.length - 1].getCreateddate()!).getTime() -
        toDate(sorted[0].getCreateddate()!).getTime()) /
      1000
    );
  });
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);
  const avgSessionDuration =
    durations.length > 0 ? totalDuration / durations.length : 0;

  // ── Message-level metrics: STT, EOS, TTS & LLM latency ──
  const sttLatencies: number[] = [];
  const eosLatencies: number[] = [];
  const ttsLatencies: number[] = [];
  const llmLatencies: number[] = [];
  assistantTraceAction.assistantMessages.forEach(m => {
    const metrics = m.getMetricsList();
    const stt = findMetricByName(metrics, 'stt_latency_ms');
    if (stt) sttLatencies.push(Number(stt));
    const eos = findMetricByName(metrics, 'eos_latency_ms');
    if (eos) eosLatencies.push(Number(eos));
    const tts = findMetricByName(metrics, 'tts_latency_ms');
    if (tts) ttsLatencies.push(Number(tts));
    const llm = findMetricByName(metrics, 'llm_latency_ms');
    if (llm) llmLatencies.push(Number(llm));
  });
  const avgSttLatency =
    sttLatencies.length > 0
      ? sttLatencies.reduce((a, b) => a + b, 0) / sttLatencies.length
      : 0;
  const avgEosLatency =
    eosLatencies.length > 0
      ? eosLatencies.reduce((a, b) => a + b, 0) / eosLatencies.length
      : 0;
  const avgTtsLatency =
    ttsLatencies.length > 0
      ? ttsLatencies.reduce((a, b) => a + b, 0) / ttsLatencies.length
      : 0;
  const avgLlmLatency =
    llmLatencies.length > 0
      ? llmLatencies.reduce((a, b) => a + b, 0) / llmLatencies.length
      : 0;
  const totalSttDurationSec = convList.reduce((sum, conv) => {
    const ns = Number(
      findMetricByName(conv.getMetricsList?.() || [], 'stt_duration'),
    );
    return sum + (isNaN(ns) ? 0 : ns / 1e9);
  }, 0);
  const totalTtsDurationSec = convList.reduce((sum, conv) => {
    const ns = Number(
      findMetricByName(conv.getMetricsList?.() || [], 'tts_duration'),
    );
    return sum + (isNaN(ns) ? 0 : ns / 1e9);
  }, 0);
  const failureRate =
    totalSessions > 0 ? (failedConversations / totalSessions) * 100 : 0;
  const latencyValues = [
    avgSttLatency,
    avgEosLatency,
    avgTtsLatency,
    avgLlmLatency,
  ].filter(value => value > 0);
  const avgLatency =
    latencyValues.length > 0
      ? latencyValues.reduce((sum, value) => sum + value, 0) /
        latencyValues.length
      : 0;

  // ── Token metrics ──
  const totalTokens = assistantTraceAction.assistantMessages.reduce(
    (sum, m) => sum + getTotalTokenMetric(m.getMetricsList()),
    0,
  );

  // ── Language from user messages only ──
  const languageCounts: Record<string, number> = {};
  let userMessageCount = 0;
  assistantTraceAction.assistantMessages.forEach(item => {
    const msgId = item.getMessageid?.() || '';
    const role = item.getRole?.()?.toLowerCase() || '';
    const isUser = msgId.startsWith('user-') || role === 'user';
    if (!isUser) return;
    userMessageCount++;
    const lang = item
      .getMetadataList()
      .find(m => m.getKey() === 'language')
      ?.getValue();
    if (lang) languageCounts[lang] = (languageCounts[lang] || 0) + 1;
  });
  const languageData = Object.entries(languageCounts).map(
    ([language, count]) => ({
      language,
      count,
      percentage: ((count / Math.max(userMessageCount, 1)) * 100).toFixed(1),
    }),
  );

  // ── Source distribution ──
  const sourceData = Object.entries(
    assistantTraceAction.assistantMessages.reduce(
      (acc, item) => {
        const source = item.getSource();
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).map(([source, count]) => ({
    source,
    count,
    percentage: ((count / Math.max(totalMessages, 1)) * 100).toFixed(1),
  }));

  // ── Time-series buckets ──
  const activeSessionsData = (() => {
    const now = new Date();
    let interval: number;
    let formatLabel: (d: Date) => string;
    switch (selectedRange) {
      case 'last_24_hours':
        interval = 30;
        formatLabel = d =>
          `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        break;
      case 'last_3_days':
        interval = 120;
        formatLabel = d =>
          `${toDateString(d)} ${d.getHours().toString().padStart(2, '0')}:00`;
        break;
      case 'last_7_days':
        interval = 240;
        formatLabel = d =>
          `${toDateString(d)} ${d.getHours().toString().padStart(2, '0')}:00`;
        break;
      default:
        interval = 1440;
        formatLabel = d => toDateString(d);
    }
    const startTime = new Date();
    startTime.setMinutes(0, 0, 0);
    switch (selectedRange) {
      case 'last_24_hours':
        startTime.setTime(startTime.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_3_days':
        startTime.setTime(startTime.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case 'last_7_days':
        startTime.setTime(startTime.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime.setTime(startTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const buckets: Array<{
      date: Date;
      total: number;
      sttMs: number;
      eosMs: number;
      ttsMs: number;
      llmMs: number;
      sttCount: number;
      eosCount: number;
      ttsCount: number;
      llmCount: number;
    }> = [];
    for (
      let t = startTime.getTime();
      t < now.getTime();
      t += interval * 60 * 1000
    )
      buckets.push({
        date: new Date(t),
        total: 0,
        sttMs: 0,
        eosMs: 0,
        ttsMs: 0,
        llmMs: 0,
        sttCount: 0,
        eosCount: 0,
        ttsCount: 0,
        llmCount: 0,
      });

    assistantTraceAction.assistantMessages.forEach(m => {
      const idx = Math.floor(
        (toDate(m.getCreateddate()!).getTime() - startTime.getTime()) /
          (interval * 60 * 1000),
      );
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].total += 1;
        const stt = findMetricByName(m.getMetricsList(), 'stt_latency_ms');
        if (stt) {
          buckets[idx].sttMs += Number(stt);
          buckets[idx].sttCount += 1;
        }
        const eos = findMetricByName(m.getMetricsList(), 'eos_latency_ms');
        if (eos) {
          buckets[idx].eosMs += Number(eos);
          buckets[idx].eosCount += 1;
        }
        const tts = findMetricByName(m.getMetricsList(), 'tts_latency_ms');
        if (tts) {
          buckets[idx].ttsMs += Number(tts);
          buckets[idx].ttsCount += 1;
        }
        const llm = findMetricByName(m.getMetricsList(), 'llm_latency_ms');
        if (llm) {
          buckets[idx].llmMs += Number(llm);
          buckets[idx].llmCount += 1;
        }
      }
    });
    return buckets.map(b => ({
      dateHour: formatLabel(b.date),
      total: b.total,
      sttLatency: b.sttCount > 0 ? Math.round(b.sttMs / b.sttCount) : 0,
      eosLatency: b.eosCount > 0 ? Math.round(b.eosMs / b.eosCount) : 0,
      ttsLatency: b.ttsCount > 0 ? Math.round(b.ttsMs / b.ttsCount) : 0,
      llmLatency: b.llmCount > 0 ? Math.round(b.llmMs / b.llmCount) : 0,
      label: `From: ${b.date.toISOString().split('.')[0].replace('T', ' ')}`,
    }));
  })();

  const sessionsAction = (
    <Toggletip align="bottom-left">
      <ToggletipButton label="Sessions actions" title="Sessions actions">
        <Information size={16} className="text-gray-600 dark:text-gray-300" />
      </ToggletipButton>
      <ToggletipContent>
        <p className="text-xs mb-2">
          Open the full sessions page for this assistant.
        </p>
        <div className="flex justify-end">
          <Button
            kind="primary"
            size="sm"
            onClick={() =>
              navigation.goToAssistantSessionList(props.assistant.getId())
            }
          >
            Go to sessions
          </Button>
        </div>
      </ToggletipContent>
    </Toggletip>
  );

  return (
    <div className="w-full min-h-full bg-gray-100 p-4 dark:bg-[#161616]">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Dashboard</p>
          <h2 className="text-2xl font-normal text-gray-900 dark:text-gray-100">
            Assistant activity
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Dropdown
            id="date-range"
            titleText=""
            hideLabel
            label="Date range"
            size="sm"
            items={DATE_RANGES}
            selectedItem={DATE_RANGES.find(r => r.id === selectedRange)}
            itemToString={(item: any) => item?.text || ''}
            onChange={({ selectedItem }) => {
              if (selectedItem) setSelectedRange(selectedItem.id);
            }}
            className="min-w-[160px]"
          />
          <Dropdown
            id="auto-refresh"
            titleText=""
            hideLabel
            label="Auto-refresh"
            size="sm"
            items={AUTO_REFRESH_OPTIONS}
            selectedItem={AUTO_REFRESH_OPTIONS.find(
              o => o.id === String(autoRefreshInterval || 0),
            )}
            itemToString={(item: any) => item?.text || ''}
            onChange={({ selectedItem }) => {
              if (selectedItem)
                setAutoRefreshInterval(
                  selectedItem.id === '0' ? null : Number(selectedItem.id),
                );
            }}
            className="min-w-[140px]"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          title="Sessions"
          label="Total sessions"
          value={totalSessions}
          caption={`${activeConversations.toLocaleString()} active, ${completedConversations.toLocaleString()} completed`}
          action={sessionsAction}
          isLoading={loading}
        />
        <KpiTile
          title="Messages"
          label="Total messages"
          value={totalMessages}
          caption={`${totalTokens.toLocaleString()} tokens used`}
          isLoading={loading}
        />
        <KpiTile
          title="Avg latency"
          label="Average response latency"
          value={Math.round(avgLatency)}
          unit="ms"
          caption={`STT ${Math.round(avgSttLatency).toLocaleString()} ms, LLM ${Math.round(avgLlmLatency).toLocaleString()} ms`}
          isLoading={loading}
        />
        <KpiTile
          title="Failure rate"
          label="Failed sessions"
          value={failureRate.toFixed(1)}
          unit="%"
          caption={`${failedConversations.toLocaleString()} failed of ${totalSessions.toLocaleString()} sessions`}
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardWidget title="Session details" isLoading={loading}>
          <WidgetHeroMetric
            label="Avg session duration"
            value={Math.round(avgSessionDuration)}
            unit="s"
            caption="Average duration from message activity"
          />
          <WidgetList
            rows={[
              {
                label: 'Active',
                value: activeConversations.toLocaleString(),
              },
              {
                label: 'Completed',
                value: completedConversations.toLocaleString(),
              },
              {
                label: 'Failed',
                value: failedConversations.toLocaleString(),
              },
            ]}
          />
        </DashboardWidget>

        <DashboardWidget title="Latency" size="large" isLoading={loading}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <InlineMetric
              label="Avg latency"
              value={Math.round(avgLatency)}
              unit="ms"
            />
            <InlineMetric
              label="STT"
              value={Math.round(avgSttLatency)}
              unit="ms"
            />
            <InlineMetric
              label="EOS"
              value={Math.round(avgEosLatency)}
              unit="ms"
            />
            <InlineMetric
              label="LLM"
              value={Math.round(avgLlmLatency)}
              unit="ms"
            />
          </div>
          <div className="h-[166px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeSessionsData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sttGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff832b" stopOpacity={0.28} />
                    <stop
                      offset="100%"
                      stopColor="#ff832b"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient id="eosGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1192e8" stopOpacity={0.28} />
                    <stop
                      offset="100%"
                      stopColor="#1192e8"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient id="ttsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--cds-interactive, #0f62fe)"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--cds-interactive, #0f62fe)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient id="llmGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#24a148" stopOpacity={0.28} />
                    <stop
                      offset="100%"
                      stopColor="#24a148"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="sttLatency"
                  stroke="#ff832b"
                  strokeWidth={1.5}
                  fill="url(#sttGradient)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="eosLatency"
                  stroke="#1192e8"
                  strokeWidth={1.5}
                  fill="url(#eosGradient)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="ttsLatency"
                  stroke="var(--cds-interactive, #0f62fe)"
                  strokeWidth={1.5}
                  fill="url(#ttsGradient)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="llmLatency"
                  stroke="#24a148"
                  strokeWidth={1.5}
                  fill="url(#llmGradient)"
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Tooltip
                  content={
                    (({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const labelMap: Record<string, string> = {
                        sttLatency: 'STT',
                        eosLatency: 'EOS',
                        ttsLatency: 'TTS',
                        llmLatency: 'LLM',
                      };
                      return (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg px-3 py-2 text-sm min-w-[140px]">
                          <p className="text-gray-400 text-xs mb-1.5">
                            {payload[0]?.payload?.label}
                          </p>
                          {payload.map((p: any) => (
                            <div
                              key={p.dataKey}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="w-2 h-2"
                                style={{ backgroundColor: p.stroke }}
                              />
                              <span className="text-gray-600 dark:text-gray-300 uppercase text-xs">
                                {labelMap[p.dataKey] || p.dataKey}
                              </span>
                              <span className="ml-auto font-semibold tabular-nums">
                                {p.value} ms
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }) as ContentType<ValueType, NameType>
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 px-4 pb-4 text-xs">
            <LegendItem color="#ff832b" label="STT" />
            <LegendItem color="#1192e8" label="EOS" />
            <LegendItem color="var(--cds-interactive, #0f62fe)" label="TTS" />
            <LegendItem color="#24a148" label="LLM" />
          </div>
        </DashboardWidget>

        <DashboardWidget title="Usage totals" isLoading={loading}>
          <WidgetHeroMetric
            label="Tokens"
            value={totalTokens}
            caption={`${totalMessages.toLocaleString()} messages processed`}
          />
          <WidgetList
            rows={[
              {
                label: 'STT duration',
                value: `${Math.round(totalSttDurationSec).toLocaleString()} s`,
              },
              {
                label: 'TTS duration',
                value: `${Math.round(totalTtsDurationSec).toLocaleString()} s`,
              },
              {
                label: 'Total duration',
                value: `${Math.round(totalDuration).toLocaleString()} s`,
              },
            ]}
          />
        </DashboardWidget>

        <DashboardWidget title="Sources" isLoading={loading}>
          <DonutContent
            data={sourceData}
            dataKey="count"
            nameKey="source"
            total={totalMessages}
          />
        </DashboardWidget>

        <DashboardWidget title="Languages" isLoading={loading}>
          <LanguageContent data={languageData} />
        </DashboardWidget>

        <DashboardWidget title="Reliability" isLoading={loading}>
          <WidgetHeroMetric
            label="Completed sessions"
            value={completedConversations}
            caption={`${failedConversations.toLocaleString()} failed sessions`}
          />
          <WidgetList
            rows={[
              {
                label: 'Completed',
                value: completedConversations.toLocaleString(),
              },
              {
                label: 'Active',
                value: activeConversations.toLocaleString(),
              },
              {
                label: 'Sessions tracked',
                value: totalSessions.toLocaleString(),
              },
            ]}
          />
        </DashboardWidget>

        <DashboardWidget
          title="Message activity"
          size="large"
          isLoading={loading}
          bodyClassName="pt-4"
        >
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            Messages over selected range
          </p>
          <div className="h-[206px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeSessionsData}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <YAxis
                  dataKey="total"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  width={36}
                />
                <XAxis
                  dataKey="dateHour"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  cursor={{
                    fill: 'var(--cds-interactive, #0f62fe)',
                    fillOpacity: 0.08,
                  }}
                  content={
                    (({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg px-3 py-2.5 text-sm min-w-[140px]">
                          <p className="text-gray-400 text-xs mb-1.5">
                            {payload[0]?.payload?.label}
                          </p>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2"
                              style={{
                                backgroundColor:
                                  'var(--cds-interactive, #0f62fe)',
                              }}
                            />
                            <span className="text-gray-600 dark:text-gray-300">
                              Messages
                            </span>
                            <span className="ml-auto font-semibold tabular-nums">
                              {payload[0]?.value}
                            </span>
                          </div>
                        </div>
                      );
                    }) as ContentType<ValueType, NameType>
                  }
                />
                <Bar
                  dataKey="total"
                  fill="var(--cds-interactive, #0f62fe)"
                  fillOpacity={0.9}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardWidget>
      </div>
    </div>
  );
};

const DashboardWidget: FC<{
  title: string;
  size?: 'small' | 'large';
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  isLoading?: boolean;
  children: ReactNode;
}> = ({
  title,
  size = 'small',
  action,
  className,
  bodyClassName,
  isLoading = false,
  children,
}) => (
  <Tile
    isLoading={isLoading}
    className={cn(
      '!rounded-none !p-0 !bg-white dark:!bg-[#262626] border border-gray-200 dark:border-gray-800 h-[310px]',
      size === 'large' && 'xl:col-span-2',
      className,
    )}
  >
    <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
    <div className={cn('h-[262px] p-6', bodyClassName)}>{children}</div>
  </Tile>
);

const KpiTile: FC<{
  title: string;
  label: string;
  value: number | string;
  unit?: string;
  caption?: string;
  action?: ReactNode;
  isLoading?: boolean;
}> = ({ title, label, value, unit, caption, action, isLoading = false }) => (
  <Tile
    isLoading={isLoading}
    className="!rounded-none !p-0 !bg-white dark:!bg-[#262626] border border-gray-200 dark:border-gray-800 h-[156px]"
  >
    <div className="flex h-10 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
      <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {action && <div className="ml-3 shrink-0">{action}</div>}
    </div>
    <div className="flex h-[116px] flex-col justify-between p-4">
      <div>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-light leading-none tabular-nums text-gray-900 dark:text-gray-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {unit}
            </span>
          )}
        </div>
      </div>
      {caption && (
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {caption}
        </p>
      )}
    </div>
  </Tile>
);

const WidgetHeroMetric: FC<{
  label: string;
  value: number | string;
  unit?: string;
  caption?: string;
}> = ({ label, value, unit, caption }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="text-4xl font-light leading-none tabular-nums text-gray-900 dark:text-gray-100">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {unit && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      )}
    </div>
    {caption && (
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{caption}</p>
    )}
  </div>
);

const InlineMetric: FC<{
  label: string;
  value: number | string;
  unit?: string;
}> = ({ label, value, unit }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <div className="mt-1 flex items-baseline gap-1">
      <span className="text-2xl font-light leading-none tabular-nums text-gray-900 dark:text-gray-100">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {unit && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{unit}</span>
      )}
    </div>
  </div>
);

const WidgetList: FC<{
  rows: Array<{ label: string; value: ReactNode }>;
}> = ({ rows }) => (
  <div className="mt-5 divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">
    {rows.map(row => (
      <div
        key={row.label}
        className="flex items-center justify-between gap-4 py-2.5"
      >
        <span className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-300">
          {row.label}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {row.value}
        </span>
      </div>
    ))}
  </div>
);

const LegendItem: FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className="h-0.5 w-3" style={{ backgroundColor: color }} />
    <span>{label}</span>
  </div>
);

// ─── Donut chart content ────────────────────────────────────────────────────

const DonutContent: FC<{
  data: any[];
  dataKey: string;
  nameKey: string;
  total: number;
}> = ({ data, dataKey, nameKey, total }) => {
  if (data.length === 0)
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No source data
      </div>
    );

  return (
    <>
      <div className="relative h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={58}
              innerRadius={36}
              dataKey={dataKey}
              nameKey={nameKey}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={
                (({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 shrink-0"
                          style={{ backgroundColor: item.color || '#6366f1' }}
                        />
                        <span className="capitalize">
                          {item.name || 'Unknown'}
                        </span>
                        <span className="ml-3 font-semibold">{item.value}</span>
                      </div>
                    </div>
                  );
                }) as ContentType<ValueType, NameType>
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">{total}</p>
            <p className="text-[10px] text-gray-400 uppercase">Total</p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {data.slice(0, 4).map((item, i) => (
          <div
            key={item[nameKey] || i}
            className="flex items-center gap-2 text-xs"
          >
            <div
              className="w-2.5 h-2.5 shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-gray-600 dark:text-gray-400 truncate flex-1 capitalize">
              {item[nameKey] || 'Unknown'}
            </span>
            <span className="font-semibold tabular-nums">
              {item.percentage}%
            </span>
            <span className="text-gray-400 tabular-nums">({item.count})</span>
          </div>
        ))}
      </div>
    </>
  );
};

const LanguageContent: FC<{
  data: Array<{ language: string; count: number; percentage: string }>;
}> = ({ data }) => {
  if (data.length === 0)
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No language data
      </div>
    );

  return (
    <div className="space-y-4">
      {data.slice(0, 5).map((item, i) => (
        <div key={item.language || i}>
          <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
            <span className="truncate capitalize text-gray-700 dark:text-gray-200">
              {item.language || 'Unknown'}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {item.percentage}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-800">
            <div
              className="h-2"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {item.count.toLocaleString()} messages
          </p>
        </div>
      ))}
    </div>
  );
};
