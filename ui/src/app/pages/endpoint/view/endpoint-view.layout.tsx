import { Endpoint, Tag } from '@rapidaai/react';
import { Helmet } from '@/app/components/helmet';
import { EndpointInstructionDialog } from '@/app/components/base/modal/endpoint-instruction-modal';
import { CreateTagDialog } from '@/app/components/base/modal/create-tag-modal';
import { UpdateDescriptionDialog } from '@/app/components/base/modal/update-description-modal';
import { EndpointTag } from '@/app/components/form/tag-input/endpoint-tags';
import { EndpointSideNav } from '@/app/pages/endpoint/view/endpoint-side-nav';
import { useEndpointPageStore, useRapidaStore } from '@/hooks';
import { useCredential } from '@/hooks/use-credential';
import {
  Checkmark,
  Copy,
  Edit,
  Information,
  SourceControl,
  Tag as TagIcon,
} from '@carbon/icons-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  HeaderGlobalAction,
  HeaderGlobalBar,
} from '@carbon/react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast/headless';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

const ENDPOINT_HEADER_ACTION_ICON_SIZE = 16;

export function EndpointViewLayout() {
  const [userId, token, projectId] = useCredential();
  const { showLoader, hideLoader } = useRapidaStore();
  const [navExpanded, setNavExpanded] = useState(true);
  const [endpointIdCopied, setEndpointIdCopied] = useState(false);
  const navigate = useNavigate();

  const {
    currentEndpoint,
    onChangeCurrentEndpoint,
    onChangeCurrentEndpointProviderModel,
    instructionVisible,
    onHideInstruction,
    currentEndpointProviderModel,
    editTagVisible,
    onHideEditTagVisible,
    onShowEditTagVisible,
    onCreateEndpointTag,
    onGetEndpoint,
    updateDetailVisible,
    onHideUpdateDetailVisible,
    onShowInstruction,
    onShowUpdateDetailVisible,
    onUpdateEndpointDetail,
  } = useEndpointPageStore();

  const { endpointId, endpointProviderId } = useParams();

  const onError = useCallback(
    (err: string) => {
      hideLoader();
      toast.error(err);
    },
    [endpointId, endpointProviderId],
  );

  const onSuccess = useCallback(
    (data: Endpoint) => {
      onChangeCurrentEndpoint(data);
      const endpointProviderModel = data.getEndpointprovidermodel();
      if (endpointProviderModel) {
        onChangeCurrentEndpointProviderModel(endpointProviderModel);
      }
      hideLoader();
    },
    [endpointId, endpointProviderId],
  );

  const onReload = useCallback(() => {
    if (endpointId) {
      showLoader('overlay');
      onGetEndpoint(
        endpointId,
        endpointProviderId ? endpointProviderId : null,
        projectId,
        token,
        userId,
        onError,
        onSuccess,
      );
    }
  }, [endpointId, endpointProviderId]);

  useEffect(() => {
    onReload();
  }, [endpointId, endpointProviderId]);

  const goToCreateVersion = () =>
    navigate(`/deployment/endpoint/${endpointId}/create-endpoint-version`);

  const copyEndpointId = () => {
    const id = currentEndpoint?.getId();
    if (!id) return;

    navigator.clipboard?.writeText(id);
    setEndpointIdCopied(true);
    window.setTimeout(() => setEndpointIdCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-1 overflow-hidden">
      <EndpointInstructionDialog
        modalOpen={instructionVisible}
        setModalOpen={onHideInstruction}
        currentEndpoint={currentEndpoint}
        currentEndpointProviderModel={currentEndpointProviderModel}
      />
      <UpdateDescriptionDialog
        title="Edit details"
        name={currentEndpoint?.getName()}
        modalOpen={updateDetailVisible}
        setModalOpen={onHideUpdateDetailVisible}
        description={currentEndpoint?.getDescription()}
        onUpdateDescription={(
          name: string,
          description: string,
          onError: (err: string) => void,
          onSuccess: () => void,
        ) => {
          let wId = currentEndpoint?.getId();
          if (!wId) {
            onError('Endpoint is undefined, please try again later.');
            return;
          }
          onUpdateEndpointDetail(
            wId,
            name,
            description,
            projectId,
            token,
            userId,
            onError,
            () => onSuccess(),
          );
        }}
      />
      <CreateTagDialog
        title="Edit tags"
        tags={currentEndpoint?.getEndpointtag()?.getTagList()}
        modalOpen={editTagVisible}
        allTags={EndpointTag}
        setModalOpen={onHideEditTagVisible}
        onCreateTag={(
          tags: string[],
          onError: (err: string) => void,
          onSuccess: (e: Tag) => void,
        ) => {
          let wId = currentEndpoint?.getId();
          if (!wId) {
            onError('Endpoint is undefined.');
            return;
          }
          onCreateEndpointTag(
            wId,
            tags,
            projectId,
            token,
            userId,
            onError,
            endpoint => {
              let tags = endpoint.getEndpointtag();
              if (tags) onSuccess(tags);
            },
          );
        }}
      />

      <Helmet title="Hosted endpoints" />

      <EndpointSideNav
        endpointId={endpointId}
        endpoint={currentEndpoint}
        expanded={navExpanded}
        onToggle={() => setNavExpanded(!navExpanded)}
      />

      <div className="flex flex-col flex-1 overflow-auto">
        {currentEndpoint && (
          <header className="flex h-12 shrink-0 items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="min-w-0 pl-4">
              <Breadcrumb noTrailingSlash>
                <BreadcrumbItem href="/deployment/endpoint">
                  Endpoints
                </BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>
                  <span className="block max-w-[42vw] truncate">
                    {currentEndpoint.getName()}
                  </span>
                </BreadcrumbItem>
              </Breadcrumb>
            </div>
            <HeaderGlobalBar aria-label="Endpoint header actions">
              <HeaderGlobalAction
                aria-label="Create new version"
                tooltipAlignment="end"
                onClick={goToCreateVersion}
              >
                <SourceControl size={ENDPOINT_HEADER_ACTION_ICON_SIZE} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="View instructions"
                tooltipAlignment="end"
                onClick={onShowInstruction}
              >
                <Information size={ENDPOINT_HEADER_ACTION_ICON_SIZE} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="Edit details"
                tooltipAlignment="end"
                onClick={() => onShowUpdateDetailVisible(currentEndpoint)}
              >
                <Edit size={ENDPOINT_HEADER_ACTION_ICON_SIZE} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label="Edit tags"
                tooltipAlignment="end"
                onClick={() => onShowEditTagVisible(currentEndpoint)}
              >
                <TagIcon size={ENDPOINT_HEADER_ACTION_ICON_SIZE} />
              </HeaderGlobalAction>
              <HeaderGlobalAction
                aria-label={endpointIdCopied ? 'Copied' : 'Copy endpoint ID'}
                tooltipAlignment="end"
                onClick={copyEndpointId}
              >
                {endpointIdCopied ? (
                  <Checkmark size={ENDPOINT_HEADER_ACTION_ICON_SIZE} />
                ) : (
                  <Copy size={ENDPOINT_HEADER_ACTION_ICON_SIZE} />
                )}
              </HeaderGlobalAction>
            </HeaderGlobalBar>
          </header>
        )}
        <div className="flex flex-col flex-1 min-h-0">
          <Outlet context={{ onReload }} />
        </div>
      </div>
    </div>
  );
}
