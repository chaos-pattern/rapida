import { Endpoint } from '@rapidaai/react';
import { Version } from '@/app/pages/endpoint/view/version-list';

export function EndpointVersionsPage(props: {
  currentEndpoint: Endpoint;
  onReload: () => void;
}) {
  return (
    <Version
      currentEndpoint={props.currentEndpoint}
      onReload={props.onReload}
    />
  );
}
