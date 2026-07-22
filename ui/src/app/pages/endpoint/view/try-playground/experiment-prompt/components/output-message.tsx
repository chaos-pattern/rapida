import { Metric } from '@rapidaai/react';
import { InvokeResponse } from '@rapidaai/react';
import { MarkdownViewer } from '@/app/components/markdown-viewer';
import { Tab } from '@/app/components/tab';
import { ExecuteMessage } from '@/app/pages/endpoint/view/try-playground/experiment-prompt/components/execute-message';
import { cn } from '@/utils';
import { FC, useEffect, useState } from 'react';
import { CodeHighlighting } from '@/app/components/code-highlighting';

/**
 * OutputMessage Component
 *
 * This component displays the output of an executed program, handles the loading state,
 * and displays any errors encountered during execution. It supports rendering text,
 * images, and audio based on the content type received in the `CallerResponse`.
 *
 * Props:
 * - callerResponse: The response object returned from the execution API.
 * - error: A string representing any errors encountered during the execution.
 * - loading: A boolean indicating if the execution is still in progress.
 * - isValid: A boolean that indicates whether the input form is valid.
 * - errors: A list of errors related to the input form validation.
 */
export const OutputMessage: FC<{
  callerResponse: InvokeResponse | null;
  error: string;
  loading: boolean;
  isValid: boolean;
  errors: any;
}> = ({ callerResponse, error, isValid, errors, loading }) => {
  // State to manage the outputs extracted from the callerResponse
  const [outputs, setOutputs] = useState<
    | {
        content: string;
      }[]
    | null
  >(null);

  // State to manage the metrics received from the callerResponse
  const [endpointMetrics, setEndpointMetrics] = useState<Array<Metric>>([]);

  // useEffect to handle the processing of callerResponse
  useEffect(() => {
    if (callerResponse) {
      const metrics = callerResponse.getMetricsList();
      const responses = callerResponse.getDataList();

      if (responses && responses.length > 0) {
        setOutputs(responses.map(response => ({ content: response })));
      }

      if (metrics) setEndpointMetrics(metrics);
    } else {
      setOutputs(null);
      setEndpointMetrics([]);
    }
  }, [callerResponse]);

  return (
    <div className="flex min-h-0 flex-col bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Response
        </p>
      </div>
      <ExecuteMessage
        className="dark:border-gray-800  border-gray-200"
        apiError={error}
        loading={loading}
        metrics={endpointMetrics}
        formError={isValid ? undefined : errors}
      />
      <Tab
        active="output"
        className={cn('min-h-0 text-sm/6 bg-white dark:bg-gray-900')}
        tabs={[
          {
            label: 'output',
            element: (
              <div className="flex-1 bg-white dark:bg-gray-900">
                <div className="flex min-h-[16rem] flex-col items-start justify-start overflow-auto">
                  {outputs ? (
                    outputs.map((out, i) => {
                      return <MarkdownViewer text={out.content} key={i} />;
                    })
                  ) : (
                    <div className="w-full p-4 text-sm text-gray-500 dark:text-gray-400">
                      Output will appear after execution.
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            label: 'metadata',
            element: (
              <div className="flex-1 bg-white dark:bg-gray-900">
                {callerResponse ? (
                  <CodeHighlighting
                    className="max-w-full h-full"
                    code={JSON.stringify(callerResponse.getMeta(), null, 2)}
                  />
                ) : (
                  <div className="w-full p-4 text-sm text-gray-500 dark:text-gray-400">
                    Metadata will appear after execution.
                  </div>
                )}
              </div>
            ),
          },
          {
            label: 'metrics',
            element: (
              <div className="flex-1 bg-white dark:bg-gray-900">
                {callerResponse ? (
                  <CodeHighlighting
                    className="max-w-full h-full"
                    code={JSON.stringify(
                      callerResponse.getMetricsList().map(rc => rc.toObject()),
                      null,
                      2,
                    )}
                  />
                ) : (
                  <div className="w-full p-4 text-sm text-gray-500 dark:text-gray-400">
                    Metrics will appear after execution.
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
