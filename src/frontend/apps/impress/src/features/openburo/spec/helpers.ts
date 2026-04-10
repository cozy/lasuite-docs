import {
  OpenBuroCapability,
  OpenBuroService,
  OpenFileParams,
  OpenFileResponse,
} from './types';

const normalizeParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

export const createOpenBuroRequestId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getServicesForAction = (
  services: OpenBuroService[],
  action: string,
) => {
  return services.filter((service) =>
    service.capabilities.some((capability) => capability.action === action),
  );
};

export const getCapabilityForService = (
  service: OpenBuroService,
  action: string,
): OpenBuroCapability | null => {
  return (
    service.capabilities.find((capability) => capability.action === action) ??
    null
  );
};

export const buildCapabilityIframeUrl = ({
  service,
  capability,
  params,
  requestId,
  clientUrl,
}: {
  service: OpenBuroService;
  capability: OpenBuroCapability;
  params?: OpenFileParams;
  requestId: string;
  clientUrl: string;
}) => {
  const url = new URL(`${capability.path}`);

  url.searchParams.set('clientUrl', clientUrl);
  url.searchParams.set('id', requestId);
  url.searchParams.set('multiple', String(params?.multiple ?? false));

  const allowedMimeType = normalizeParam(params?.allowedMimeType);
  if (allowedMimeType) {
    url.searchParams.set('allowedMimeType', allowedMimeType);
  }

  const type = normalizeParam(params?.type);
  if (type) {
    url.searchParams.set('type', type);
  }

  return url;
};

export const isValidOpenFileResponse = (
  data: unknown,
  requestId: string | null,
): data is OpenFileResponse => {
  if (!requestId || !isRecord(data)) {
    return false;
  }

  if (data.id !== requestId || typeof data.status !== 'string') {
    return false;
  }

  if (data.status === 'done') {
    return Array.isArray(data.results);
  }

  if (data.status === 'error') {
    return typeof data.message === 'string';
  }

  return false;
};
