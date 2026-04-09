import React from 'react';

import { OpenBuroServicePicker } from './OpenBuroServicePicker';
import { OpenBuroService } from './types';

type OpenBuroModalProps = {
  isModalOpen: boolean;
  iframeUrl: string | null;
  isServicePickerOpen: boolean;
  availableServices: OpenBuroService[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  onSelectService: (service: OpenBuroService) => void;
};

export const OpenBuroModal = ({
  isModalOpen,
  iframeUrl,
  isServicePickerOpen,
  availableServices,
  iframeRef,
  onClose,
  onSelectService,
}: OpenBuroModalProps) => {
  const isOpen = (isModalOpen && iframeUrl) || isServicePickerOpen;

  return (
    <div
      className={`openburo-modal${isOpen ? ' openburo-modal-open' : ''}`}
      onClick={onClose}
    >
      <div
        className={`openburo-modal-container${
          isServicePickerOpen
            ? ' openburo-modal-picker-container'
            : iframeUrl
              ? ' openburo-modal-iframe-container'
              : ''
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {isServicePickerOpen && (
          <OpenBuroServicePicker
            availableServices={availableServices}
            onSelectService={onSelectService}
          />
        )}

        {isModalOpen && iframeUrl && (
          <iframe
            ref={iframeRef}
            key={`openburo-iframe:${iframeUrl}`}
            className="openburo-modal-iframe"
            src={iframeUrl}
          />
        )}
      </div>
    </div>
  );
};
