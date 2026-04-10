import React, { useEffect, useRef, useState } from 'react';

import discovery from '../discovery.json';
import { OpenBuroPickClient } from '../spec/OpenBuroPickClient';
import { OpenBuroService, OpenFileParams } from '../spec/types';

import { OpenBuroModal } from './OpenBuroModal';
import { OpenBuroContextValue } from './types';

const OpenBuroContext = React.createContext<OpenBuroContextValue | undefined>(
  undefined,
);
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
  const clientRef = useRef<OpenBuroPickClient | null>(null);

  if (clientRef.current === null) {
    clientRef.current = new OpenBuroPickClient({
      services: OPEN_BURO_SERVICES,
      getClientUrl: () => window.location.origin,
    });
  }

  const closeModals = ({ rejectPending }: { rejectPending: boolean }) => {
    setIsModalOpen(false);
    setIsServicePickerOpen(false);
    setAvailableServices([]);
    setIframeUrl(null);

    if (rejectPending) {
      clientRef.current?.cancelPending(
        new Error('OpenBuro picker closed before completion'),
      );
    }
  };

  const openServiceModal = (service: OpenBuroService) => {
    clientRef.current?.selectService(service, (nextIframeUrl) => {
      setIframeUrl(nextIframeUrl);
      setIsServicePickerOpen(false);
      setIsModalOpen(true);
    });
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const result = clientRef.current?.handleMessage(
        event,
        iframeRef.current?.contentWindow ?? null,
      );

      if (result === 'resolved' || result === 'rejected') {
        closeModals({ rejectPending: false });
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const openFile = (params?: OpenFileParams) => {
    return (
      clientRef.current?.openFile(params, {
        onRequireServiceSelection: (services) => {
          setAvailableServices(services);
          setIsServicePickerOpen(true);
        },
        onOpenIframe: (nextIframeUrl) => {
          setIframeUrl(nextIframeUrl);
          setIsServicePickerOpen(false);
          setIsModalOpen(true);
        },
      }) ?? Promise.reject(new Error('OpenBuro client not initialized'))
    );
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
