import { Endpoint, EndpointProviderModel } from '@rapidaai/react';
import { Playground } from '@/app/pages/endpoint/view/try-playground';

export function EndpointOverviewPage(props: {
  currentEndpoint: Endpoint;
  currentEndpointProviderModel: EndpointProviderModel;
}) {
  return (
    <Playground
      currentEndpoint={props.currentEndpoint}
      currentEndpointProviderModel={props.currentEndpointProviderModel}
    />
  );
}
