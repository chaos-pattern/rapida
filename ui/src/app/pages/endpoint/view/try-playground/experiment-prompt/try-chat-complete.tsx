import {
  ConnectionConfig,
  EndpointDefinition,
  Invoke,
  InvokeRequest,
  StringToAny,
} from '@rapidaai/react';
import { Endpoint, EndpointProviderModel } from '@rapidaai/react';
import { InvokeResponse } from '@rapidaai/react';
import { useRapidaStore } from '@/hooks';
import { useCredential } from '@/hooks/use-credential';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Variable } from '@rapidaai/react';

import {
  EndpointArgumentList,
  getUnsupportedEndpointVariables,
  InputFormData,
} from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/input-var-form';

import { OutputMessage } from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/output-message';
import { PlaygroundHeader } from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/playground-header';
import { connectionConfig } from '@/configs';

export function TryChatComplete(props: {
  currentEndpoint: Endpoint;
  endpointProviderModel: EndpointProviderModel;
}) {
  /**
   *
   */
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<Record<string, string>>({
    mode: 'onChange',
  });

  /**
   *
   */
  const [callerResponse, setCallerResponse] = useState<InvokeResponse | null>(
    null,
  );
  /**
   *
   */
  const [userId, token, projectId] = useCredential();

  /**
   *
   */
  const { loading, showLoader, hideLoader } = useRapidaStore();

  /**
   *
   */
  const [variables, setVariables] = useState<Variable[]>([]);
  const unsupportedVariables = useMemo(
    () => getUnsupportedEndpointVariables(variables),
    [variables],
  );
  const hasUnsupportedVariables = unsupportedVariables.length > 0;

  useEffect(() => {
    let endpointProviderModel = props.endpointProviderModel;
    if (endpointProviderModel.getChatcompleteprompt()) {
      let allVars = endpointProviderModel
        .getChatcompleteprompt()
        ?.getPromptvariablesList();
      if (allVars) setVariables(allVars);
    }
  }, [props.endpointProviderModel]);

  /**
   *
   * @param data
   */
  const onInvoke = async data => {
    if (hasUnsupportedVariables) {
      setCallerResponse(null);
      setError(
        'This endpoint contains variables that are not runnable in the playground.',
      );
      return;
    }

    showLoader();
    setError('');
    setCallerResponse(null);

    const formDataMap = await InputFormData(data);
    const request = new InvokeRequest();
    const endpoint = new EndpointDefinition();
    endpoint.setEndpointid(props.endpointProviderModel.getEndpointid());
    endpoint.setVersion(props.endpointProviderModel.getId());
    request.setEndpoint(endpoint);
    request.getMetadataMap().set('source', StringToAny('web-app'));
    request.getMetadataMap().set('experiemental', StringToAny('true'));
    formDataMap.forEach((value, key) => {
      request.getArgsMap().set(key, value);
    });
    Invoke(
      connectionConfig,
      request,
      ConnectionConfig.WithDebugger({
        authorization: token,
        userId: userId,
        projectId: projectId,
      }),
    )
      .then(at => {
        hideLoader();
        if (at?.getSuccess()) {
          setCallerResponse(at);
          return;
        }
        let er = at?.getError();
        if (er) {
          setError(er.getHumanmessage());
          return;
        }
        setError('Unable to execute the endpoint, please try again.');
      })
      .catch(error => {
        hideLoader();
        setError('Unable to execute the endpoint, please try again.');
      });
  };

  return (
    <form onSubmit={handleSubmit(onInvoke)} className="flex flex-col flex-1">
      <PlaygroundHeader
        isValid={isValid}
        loading={loading}
        disabled={hasUnsupportedVariables}
        variableCount={variables.length}
        unsupportedCount={unsupportedVariables.length}
      />
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(18rem,42%)] overflow-hidden">
          <div className="overflow-y-auto border-b border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Arguments
              </p>
            </div>
            <EndpointArgumentList
              variables={variables}
              getRegistration={variable =>
                register(variable.getName(), {
                  required: 'Please provide a valid input.',
                })
              }
              getErrorMessage={variable =>
                errors[variable.getName()]?.message?.toString()
              }
            />
          </div>
          <OutputMessage
            callerResponse={callerResponse}
            error={error}
            loading={loading}
            isValid={isValid}
            errors={errors}
          />
        </div>
      </div>
    </form>
  );
}
