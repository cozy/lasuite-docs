import React, { useEffect, useRef, useState } from 'react';

import { OpenBuroModal } from './OpenBuroModal';
import discovery from './discovery.json';
import {
  buildCapabilityIframeUrl,
  createOpenBuroRequestId,
  getCapabilityForService,
  getServicesForAction,
  isValidOpenFileResponse,
} from './openBuroHelpers';
import {
  OpenBuroContextValue,
  OpenBuroService,
  OpenFileParams,
  OpenFileResponse,
} from './types';

const OpenBuroContext = React.createContext<OpenBuroContextValue | undefined>(
  undefined,
);
const OPEN_BURO_ACTION_PICK = 'PICK';
const OPEN_BURO_SERVICES = discovery as OpenBuroService[];

export const OpenBuroProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState<OpenBuroService[]>(
    [],
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const openFileParamsRef = useRef<OpenFileParams | undefined>(undefined);
  const currentRequestIdRef = useRef<string | null>(null);
  const currentServiceOriginRef = useRef<string | null>(null);
  const pendingPromiseRef = useRef<{
    resolve: (value: OpenFileResponse) => void;
    reject: (reason?: unknown) => void;
  } | null>(null);

  const closeModals = ({ rejectPending }: { rejectPending: boolean }) => {
    setIsModalOpen(false);
    setIsServicePickerOpen(false);
    setAvailableServices([]);
    setIframeUrl(null);
    currentRequestIdRef.current = null;
    currentServiceOriginRef.current = null;
    openFileParamsRef.current = undefined;

    if (rejectPending && pendingPromiseRef.current !== null) {
      pendingPromiseRef.current.reject(
        new Error('OpenBuro picker closed before completion'),
      );
      pendingPromiseRef.current = null;
    }
  };

  const openServiceModal = (service: OpenBuroService) => {
    const capability = getCapabilityForService(service, OPEN_BURO_ACTION_PICK);
    if (!capability) {
      if (pendingPromiseRef.current) {
        pendingPromiseRef.current.reject(
          new Error('Selected service has no PICK capability'),
        );
        pendingPromiseRef.current = null;
      }
      closeModals({ rejectPending: false });
      return;
    }

    const id = currentRequestIdRef.current || createOpenBuroRequestId();
    currentRequestIdRef.current = id;

    const requestUrl = buildCapabilityIframeUrl({
      service,
      capability,
      params: openFileParamsRef.current,
      requestId: id,
      clientUrl: window.location.origin,
    });
    currentServiceOriginRef.current =
      requestUrl.origin === 'null' ? null : requestUrl.origin;
    setIframeUrl(requestUrl.toString());
    setIsServicePickerOpen(false);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!pendingPromiseRef.current) {
        return;
      }

      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow && event.source !== iframeWindow) {
        return;
      }

      if (
        currentServiceOriginRef.current &&
        event.origin !== currentServiceOriginRef.current
      ) {
        return;
      }

      if(event.data.status === 'error' || event.data.status === 'cancel') {
        pendingPromiseRef.current.reject(
          new Error(
            `OpenBuro picker returned with status: ${event.data.status}${
              typeof event.data.message === 'string' ? `, message: ${event.data.message}` : ''
            }`,
          ),
        );
        pendingPromiseRef.current = null;
        closeModals({ rejectPending: false });
        return;
      }

      if (!isValidOpenFileResponse(event.data, currentRequestIdRef.current)) {
        pendingPromiseRef.current.reject(
          new Error('Invalid response from OpenBuro picker'),
        );
        pendingPromiseRef.current = null;
        closeModals({ rejectPending: false });
        return;
      }

      pendingPromiseRef.current.resolve(event.data);
      pendingPromiseRef.current = null;
      closeModals({ rejectPending: false });
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const openFile = (params?: OpenFileParams) => {
    if (pendingPromiseRef.current) {
      pendingPromiseRef.current.reject(
        new Error('An openFile request is already in progress'),
      );
      pendingPromiseRef.current = null;
    }

    openFileParamsRef.current = params;
    currentRequestIdRef.current = createOpenBuroRequestId();

    return new Promise<OpenFileResponse>((resolve, reject) => {
      pendingPromiseRef.current = { resolve, reject };

      Promise.resolve(
        getServicesForAction(OPEN_BURO_SERVICES, OPEN_BURO_ACTION_PICK),
      )
        .then((services) => {
          if (!services.length) {
            pendingPromiseRef.current = null;
            reject(new Error('No service available for PICK action'));
            return;
          }

          if (services.length === 1) {
            openServiceModal(services[0]);
            return;
          }

          setAvailableServices(services);
          setIsServicePickerOpen(true);
        })
        .catch((error) => {
          pendingPromiseRef.current = null;
          reject(error);
        });
    });
  };

  return (
    <OpenBuroContext.Provider value={{ openFile, isModalOpen }}>
      <OpenBuroModal
        isModalOpen={isModalOpen}
        iframeUrl={iframeUrl}
        isServicePickerOpen={isServicePickerOpen}
        availableServices={availableServices}
        iframeRef={iframeRef}
        onClose={() => closeModals({ rejectPending: true })}
        onSelectService={openServiceModal}
      />

      {children}
    </OpenBuroContext.Provider>
  );
};

export const useOpenBuro = () => {
  const context = React.useContext(OpenBuroContext);
  if (context === undefined) {
    throw new Error('useOpenBuro must be used within an OpenBuroProvider');
  }
  return context;
};
