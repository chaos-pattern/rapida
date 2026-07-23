import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from '@/app/components/helmet';
import { useCredential } from '@/hooks/use-credential';
import { useRapidaStore } from '@/hooks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast/headless';
import SingleAssistant from './single-assistant';
import { useAssistantPageStore } from '@/hooks/use-assistant-page-store';
import { Assistant } from '@rapidaai/react';
import { EmptyState } from '@/app/components/carbon/empty-state';
import { Pagination } from '@/app/components/carbon/pagination';
import {
  Add,
  Bot,
  PromptTemplate,
  Renew,
  ArrowRight,
} from '@carbon/icons-react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  DataTableSkeleton,
  Button,
  ClickableTile,
} from '@carbon/react';
import { PrimaryButton } from '@/app/components/carbon/button';
import { PageHeaderBlock } from '@/app/components/blocks/page-header-block';
import { PageTitleBlock } from '@/app/components/blocks/page-title-block';
import { Modal, ModalBody, ModalHeader } from '@/app/components/carbon/modal';

const CREATE_ASSISTANT_LABEL = 'Create new assistant';

const assistantColumnClassName: Record<string, string> = {
  name: 'min-w-56 whitespace-nowrap',
  id: 'min-w-64 whitespace-nowrap',
  provider: 'min-w-36 whitespace-nowrap',
  version: 'min-w-44 whitespace-nowrap',
  status: 'min-w-28 whitespace-nowrap',
  deployments: 'min-w-48 whitespace-nowrap',
  actions: 'w-28 min-w-28 whitespace-nowrap',
  tags: 'min-w-40 whitespace-nowrap',
  sessions: 'min-w-28 whitespace-nowrap',
  users: 'min-w-28 whitespace-nowrap',
  lastActivity: 'min-w-36 whitespace-nowrap',
  updated: 'min-w-36 whitespace-nowrap',
  owner: 'min-w-32 whitespace-nowrap',
};

const assistantColumns = [
  { name: 'Assistant', key: 'name' },
  { name: 'Assistant ID', key: 'id' },
  { name: 'Provider', key: 'provider' },
  { name: 'Version', key: 'version' },
  { name: 'Status', key: 'status' },
  { name: 'Deployments', key: 'deployments' },
  { name: 'Actions', key: 'actions' },
  { name: 'Tags', key: 'tags' },
  { name: 'Sessions', key: 'sessions' },
  { name: 'Users', key: 'users' },
  { name: 'Last activity', key: 'lastActivity' },
  { name: 'Updated', key: 'updated' },
  { name: 'Owner', key: 'owner' },
];

export function AssistantPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [userId, token, projectId] = useCredential();
  const assistantAction = useAssistantPageStore();
  const { loading, showLoader, hideLoader } = useRapidaStore();
  const [createAssistantModalOpen, setCreateAssistantModalOpen] =
    useState(false);

  useEffect(() => {
    if (searchParams) {
      const searchParamMap = Object.fromEntries(searchParams.entries());
      Object.entries(searchParamMap).forEach(([key, value]) =>
        assistantAction.addCriteria(key, value, '='),
      );
    }
  }, [searchParams]);

  const onError = useCallback((err: string) => {
    hideLoader();
    toast.error(err);
  }, []);

  const onSuccess = useCallback((data: Assistant[]) => {
    hideLoader();
  }, []);

  const getAssistants = useCallback((projectId, token, userId) => {
    showLoader();
    assistantAction.onGetAllAssistant(
      projectId,
      token,
      userId,
      onError,
      onSuccess,
    );
  }, []);

  useEffect(() => {
    getAssistants(projectId, token, userId);
  }, [
    projectId,
    assistantAction.page,
    assistantAction.pageSize,
    assistantAction.criteria,
  ]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Helmet title="Assistant" />
      <PageHeaderBlock>
        <div className="flex items-center gap-3">
          <PageTitleBlock>Assistants</PageTitleBlock>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {assistantAction.assistants.length}/{assistantAction.totalCount}
          </span>
        </div>
      </PageHeaderBlock>
      <TableToolbar>
        <TableToolbarContent>
          <TableToolbarSearch placeholder="Search assistants..." />
          <Button
            hasIconOnly
            renderIcon={Renew}
            iconDescription="Refresh"
            kind="ghost"
            onClick={() => getAssistants(projectId, token, userId)}
            tooltipPosition="bottom"
          />
          <PrimaryButton
            size="md"
            renderIcon={Add}
            onClick={() => setCreateAssistantModalOpen(true)}
          >
            {CREATE_ASSISTANT_LABEL}
          </PrimaryButton>
        </TableToolbarContent>
      </TableToolbar>

      {/* Content */}
      {loading ? (
        <div className="overflow-auto flex-1">
          <DataTableSkeleton
            headers={assistantColumns.map(col => ({
              key: col.key,
              header: col.name,
            }))}
            rowCount={Math.min(assistantAction.pageSize, 10)}
            columnCount={assistantColumns.length}
            showHeader={false}
            showToolbar={false}
            className="min-w-max"
          />
        </div>
      ) : assistantAction.assistants &&
        assistantAction.assistants.length > 0 ? (
        <div className="overflow-auto flex-1">
          <Table>
            <TableHead>
              <TableRow>
                {assistantColumns.map(col => (
                  <TableHeader
                    key={col.key}
                    className={assistantColumnClassName[col.key]}
                  >
                    {col.name}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {assistantAction.assistants.map(ast => (
                <SingleAssistant
                  key={`assistant_row_${ast.getId()}`}
                  assistant={ast}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : assistantAction.criteria.length > 0 ? (
        <div className="h-full flex justify-center items-center">
          <EmptyState
            icon={Bot}
            title="No assistants found"
            subtitle="No assistants match your current filters."
            action={CREATE_ASSISTANT_LABEL}
            actionIcon={Add}
            onAction={() => setCreateAssistantModalOpen(true)}
          />
        </div>
      ) : (
        <div className="h-full flex justify-center items-center">
          <EmptyState
            icon={Bot}
            title="No assistants"
            subtitle="Create assistants for each client, brand, or business unit from one controlled platform."
            action={CREATE_ASSISTANT_LABEL}
            actionIcon={Add}
            onAction={() => setCreateAssistantModalOpen(true)}
          />
        </div>
      )}

      {/* Pagination */}
      {assistantAction.assistants && assistantAction.assistants.length > 0 && (
        <Pagination
          className="shrink-0"
          totalItems={assistantAction.totalCount}
          page={assistantAction.page}
          pageSize={assistantAction.pageSize}
          pageSizes={[10, 20, 50]}
          onChange={({ page, pageSize }) => {
            if (pageSize !== assistantAction.pageSize) {
              assistantAction.setPageSize(pageSize);
            } else {
              assistantAction.setPage(page);
            }
          }}
        />
      )}

      <CreateAssistantDialog
        open={createAssistantModalOpen}
        onClose={() => setCreateAssistantModalOpen(false)}
        onSelect={path => {
          setCreateAssistantModalOpen(false);
          navigate(path);
        }}
      />
    </div>
  );
}

const createAssistantOptions = [
  {
    title: 'From Prompt',
    eyebrow: 'Prompting',
    description:
      'Create a voice assistant from instructions, model configuration, tools, and deployment settings.',
    icon: PromptTemplate,
    path: '/deployment/assistant/create-assistant',
  },
  {
    title: 'AgentKit',
    eyebrow: 'Agents',
    description:
      'Connect an AgentKit assistant and manage it alongside your voice deployments and integrations.',
    icon: Bot,
    path: '/deployment/assistant/connect-agentkit',
  },
  {
    title: 'Agentflow',
    eyebrow: 'Workflow',
    description:
      'Design a node-based assistant workflow with prompt, condition, tool, and state steps.',
    icon: PromptTemplate,
    path: '/deployment/assistant/create-agentflow',
  },
];

function CreateAssistantDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      containerClassName="!max-w-[960px]"
    >
      <ModalHeader
        label="Assistant"
        title="Create an assistant"
        onClose={onClose}
      />
      <ModalBody>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {createAssistantOptions.map(option => {
            const Icon = option.icon;
            return (
              <ClickableTile
                key={option.title}
                onClick={() => onSelect(option.path)}
                className="group !flex !min-h-[220px] !flex-col !rounded-none !border !border-gray-200 !bg-gray-50 !p-0 transition-colors hover:!border-primary dark:!border-gray-700 dark:!bg-gray-800 dark:hover:!border-primary"
              >
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-primary/10 text-primary dark:bg-primary/10">
                      <Icon size={24} />
                    </div>
                    <ArrowRight
                      size={20}
                      className="mt-1 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-primary dark:text-gray-500"
                    />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    {option.eyebrow}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                    {option.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-5 text-gray-600 dark:text-gray-300">
                    {option.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Select option
                    <ArrowRight size={14} />
                  </span>
                </div>
              </ClickableTile>
            );
          })}
        </div>
      </ModalBody>
    </Modal>
  );
}
