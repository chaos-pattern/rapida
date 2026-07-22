import { Endpoint } from '@rapidaai/react';
import { EndpointTraces } from '@/app/pages/endpoint/view/traces';

export function EndpointLogsPage(props: { currentEndpoint: Endpoint }) {
  return <EndpointTraces currentEndpoint={props.currentEndpoint} />;
}
