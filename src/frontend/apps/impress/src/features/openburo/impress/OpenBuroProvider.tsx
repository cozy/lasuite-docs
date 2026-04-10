import {
  VariantType,
  useToastProvider,
} from '@gouvfr-lasuite/cunningham-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import discovery from '../discovery.json';
import { OpenBuroPickClient } from '../spec/OpenBuroPickClient';
import {
  OpenBuroService,
  OpenFileParams,
  OpenFileResult,
} from '../spec/types';

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
  const { toast } = useToastProvider();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState<OpenBuroService[]>(
    [],
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const popupCloseWatcherRef = useRef<number | null>(null);
  const clientRef = useRef<OpenBuroPickClient | null>(null);

  if (clientRef.current === null) {
    clientRef.current = new OpenBuroPickClient({
      services: OPEN_BURO_SERVICES,
      getClientUrl: () => window.location.origin,
    });
  }

  const closeModals = ({ rejectPending }: { rejectPending: boolean }) => {
    if (popupCloseWatcherRef.current !== null) {
      window.clearInterval(popupCloseWatcherRef.current);
      popupCloseWatcherRef.current = null;
    }

    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.close();
    }
    popupWindowRef.current = null;
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

  const showImportErrorToast = () => {
    toast(
      t('The document "{{documentName}}" import has failed', {
        documentName: '',
      }),
      VariantType.ERROR,
    );
  };

  const openServiceUi = (service: OpenBuroService, nextIframeUrl: string) => {
    if (service.display?.toLowerCase() === 'popup') {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }

      const openedWindow = window.open(
        nextIframeUrl,
        'openburo-picker',
        'popup=yes,width=1000,height=800',
      );

      if (!openedWindow) {
        clientRef.current?.cancelPending(
          new Error('OpenBuro popup was blocked'),
        );
        showImportErrorToast();
        return;
      }

      popupWindowRef.current = openedWindow;
      popupCloseWatcherRef.current = window.setInterval(() => {
        if (!popupWindowRef.current) {
          if (popupCloseWatcherRef.current !== null) {
            window.clearInterval(popupCloseWatcherRef.current);
            popupCloseWatcherRef.current = null;
          }
          return;
        }

        if (popupWindowRef.current.closed) {
          closeModals({ rejectPending: true });
        }
      }, 300);
      setIframeUrl(null);
      setIsServicePickerOpen(false);
      setIsModalOpen(false);
      return;
    }

    popupWindowRef.current = null;
    setIframeUrl(nextIframeUrl);
    setIsServicePickerOpen(false);
    setIsModalOpen(true);
  };

  const openServiceModal = (service: OpenBuroService) => {
    clientRef.current?.selectService(
      service,
      (selectedService, nextIframeUrl) => {
        openServiceUi(selectedService, nextIframeUrl);
      },
    );
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const result = clientRef.current?.handleMessage(
        event,
        popupWindowRef.current ?? iframeRef.current?.contentWindow ?? null,
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

  const isOpenBuroCancellation = (error: unknown) => {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes('OpenBuro picker closed before completion') ||
      error.message.includes('status: cancel')
    );
  };

  const blobToBase64 = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  };

  const normalizePayloadToBase64 = (payload: string) => {
    if (!payload.startsWith('data:')) {
      return payload;
    }

    const separatorIndex = payload.indexOf(',');
    if (separatorIndex === -1) {
      throw new Error('Invalid payload data URL format');
    }

    return payload.slice(separatorIndex + 1);
  };

  const withDownloadedPayload = async (result: OpenFileResult) => {
    if (typeof result.payload === 'string' && result.payload.length > 0) {
      return {
        ...result,
        payload: normalizePayloadToBase64(result.payload),
      };
    }

    if (!result.downloadUrl) {
      return result;
    }

    const downloadedResponse = await fetch(result.downloadUrl);
    if (!downloadedResponse.ok) {
      throw new Error(
        `Failed to download OpenBuro file from URL: ${downloadedResponse.status}`,
      );
    }

    const blob = await downloadedResponse.blob();
    const payload = await blobToBase64(blob);

    return {
      ...result,
      payload,
      mimeType: blob.type || result.mimeType || 'application/octet-stream',
      size: blob.size || result.size,
    };
  };

  const openFile = async (params?: OpenFileParams) => {
    try {
      const openFilePromise = clientRef.current?.openFile(params, {
        onRequireServiceSelection: (services) => {
          setAvailableServices(services);
          setIsServicePickerOpen(true);
        },
        onOpenService: (service, nextIframeUrl) => {
          openServiceUi(service, nextIframeUrl);
        },
      });
      if (!openFilePromise) {
        throw new Error('OpenBuro client not initialized');
      }

      const response = await openFilePromise;

      if (response.status === 'error') {
        showImportErrorToast();
        return response;
      }

      const results = await Promise.all(
        response.results.map(withDownloadedPayload),
      );

      return {
        ...response,
        results,
      };
    } catch (error) {
      if (!isOpenBuroCancellation(error)) {
        showImportErrorToast();
      }
      throw error;
    }
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
