import {
  buildCapabilityIframeUrl,
  createOpenBuroRequestId,
  getCapabilityForService,
  getServicesForAction,
  isValidOpenFileResponse,
} from './helpers';
import { OpenBuroService, OpenFileParams, OpenFileResponse } from './types';

type PendingPromise = {
  resolve: (value: OpenFileResponse) => void;
  reject: (reason?: unknown) => void;
};

type OpenFileCallbacks = {
  onRequireServiceSelection: (services: OpenBuroService[]) => void;
  onOpenService: (service: OpenBuroService, iframeUrl: string) => void;
};

type HandleMessageResult = 'ignored' | 'resolved' | 'rejected';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

export class OpenBuroPickClient {
  private readonly services: OpenBuroService[];
  private readonly action: string;
  private readonly getClientUrl: () => string;
  private openFileParams: OpenFileParams | undefined;
  private currentRequestId: string | null = null;
  private currentServiceOrigin: string | null = null;
  private pendingPromise: PendingPromise | null = null;

  constructor({
    services,
    getClientUrl,
    action = 'PICK',
  }: {
    services: OpenBuroService[];
    getClientUrl: () => string;
    action?: string;
  }) {
    this.services = services;
    this.getClientUrl = getClientUrl;
    this.action = action;
  }

  openFile(params: OpenFileParams | undefined, callbacks: OpenFileCallbacks) {
    if (this.pendingPromise !== null) {
      this.pendingPromise.reject(
        new Error('An openFile request is already in progress'),
      );
      this.pendingPromise = null;
    }

    this.openFileParams = params;
    this.currentRequestId = createOpenBuroRequestId();

    return new Promise<OpenFileResponse>((resolve, reject) => {
      this.pendingPromise = { resolve, reject };

      Promise.resolve(getServicesForAction(this.services, this.action))
        .then((matchingServices) => {
          if (!matchingServices.length) {
            this.pendingPromise = null;
            reject(new Error('No service available for PICK action'));
            return;
          }

          if (matchingServices.length === 1) {
            this.selectService(matchingServices[0], callbacks.onOpenService);
            return;
          }

          callbacks.onRequireServiceSelection(matchingServices);
        })
        .catch((error) => {
          this.pendingPromise = null;
          reject(error);
        });
    });
  }

  selectService(
    service: OpenBuroService,
    onOpenService: (service: OpenBuroService, iframeUrl: string) => void,
  ) {
    const capability = getCapabilityForService(service, this.action);
    if (!capability) {
      if (this.pendingPromise) {
        this.pendingPromise.reject(
          new Error('Selected service has no PICK capability'),
        );
        this.pendingPromise = null;
      }
      this.resetRequestState();
      return;
    }

    const requestId = this.currentRequestId || createOpenBuroRequestId();
    this.currentRequestId = requestId;

    const requestUrl = buildCapabilityIframeUrl({
      service,
      capability,
      params: this.openFileParams,
      requestId,
      clientUrl: this.getClientUrl(),
    });

    this.currentServiceOrigin =
      requestUrl.origin === 'null' ? null : requestUrl.origin;
    onOpenService(service, requestUrl.toString());
  }

  handleMessage(
    event: MessageEvent,
    iframeWindow: Window | null,
  ): HandleMessageResult {
    if (!this.pendingPromise) {
      return 'ignored';
    }

    if (!iframeWindow) {
      return 'ignored';
    }

    if (event.source !== iframeWindow) {
      return 'ignored';
    }
    
    console.debug('OpenBuroPickClient received message', event.data);

    if (!isRecord(event.data)) {
      return 'ignored';
    }

    if (event.data.id !== this.currentRequestId) {
      return 'ignored';
    }

    if (
      this.isStatusEvent(event.data, 'error') ||
      this.isStatusEvent(event.data, 'cancel') ||
      this.isStatusEvent(event.data, 'cancelled')
    ) {
      this.pendingPromise.reject(
        new Error(
          `OpenBuro picker returned with status: ${event.data.status}${
            typeof event.data.message === 'string'
              ? `, message: ${event.data.message}`
              : ''
          }`,
        ),
      );
      this.pendingPromise = null;
      this.resetRequestState();
      return 'rejected';
    }

    if (!isValidOpenFileResponse(event.data, this.currentRequestId)) {
      return 'ignored';
    }

    this.pendingPromise.resolve(event.data);
    this.pendingPromise = null;
    this.resetRequestState();
    return 'resolved';
  }

  cancelPending(reason: Error) {
    if (this.pendingPromise !== null) {
      this.pendingPromise.reject(reason);
      this.pendingPromise = null;
    }
    this.resetRequestState();
  }

  private resetRequestState() {
    this.openFileParams = undefined;
    this.currentRequestId = null;
    this.currentServiceOrigin = null;
  }

  private isStatusEvent(
    data: unknown,
    status: 'error' | 'cancel' | 'cancelled',
  ): data is { status: 'error' | 'cancel' | 'cancelled'; message?: unknown } {
    return (
      data !== null &&
      typeof data === 'object' &&
      'status' in data &&
      (data as { status?: unknown }).status === status
    );
  }
}
