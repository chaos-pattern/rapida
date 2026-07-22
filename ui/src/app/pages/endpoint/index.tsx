import { lazyLoad } from '@/utils/loadable';
import { PageLoading } from '@/app/components/carbon/loading';

export const DeploymentEndpointPage = lazyLoad(
  () => import('./listing'),
  module => module.EndpointPage,
  {
    fallback: <PageLoading className="h-full" />,
  },
);

export const DeploymentViewEndpointPage = lazyLoad(
  () => import('./view'),
  module => module.ViewEndpointPage,
  {
    fallback: <PageLoading className="h-full" />,
  },
);

export const DeploymentCreateEndpointPage = lazyLoad(
  () => import('./actions/create-endpoint'),
  module => module.CreateEndpointPage,
  {
    fallback: <PageLoading className="h-full" />,
  },
);

export const DeploymentConfigureEndpointPage = lazyLoad(
  () => import('./actions/configure-endpoint'),
  module => module.ConfigureEndpointPage,
  {
    fallback: <PageLoading className="h-full" />,
  },
);

export const DeploymentCreateVersionEndpointPage = lazyLoad(
  () => import('./actions/create-endpoint-version'),
  module => module.CreateNewVersionEndpointPage,
  {
    fallback: <PageLoading className="h-full" />,
  },
);
