import { EndpointDetailTabContent } from '@/app/pages/endpoint/view/pages';
import { useEndpointPageStore } from '@/hooks';
import { useOutletContext, useParams } from 'react-router-dom';

type EndpointViewOutletContext = {
  onReload: () => void;
};

export function ViewEndpointPage() {
  const { currentEndpoint, currentEndpointProviderModel } =
    useEndpointPageStore();

  const { tab = 'overview' } = useParams();
  const { onReload } = useOutletContext<EndpointViewOutletContext>();

  return (
    <EndpointDetailTabContent
      activeTab={tab}
      currentEndpoint={currentEndpoint}
      currentEndpointProviderModel={currentEndpointProviderModel}
      onReload={onReload}
    />
  );
}
