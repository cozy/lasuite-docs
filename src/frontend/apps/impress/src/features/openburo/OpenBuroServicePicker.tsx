import { OpenBuroService } from './types';

type OpenBuroServicePickerProps = {
  availableServices: OpenBuroService[];
  onSelectService: (service: OpenBuroService) => void;
};

export const OpenBuroServicePicker = ({
  availableServices,
  onSelectService,
}: OpenBuroServicePickerProps) => {
  return (
    <div className="openburo-modal-picker">
      <h3 className="openburo-modal-picker-over-title">
        Select a service to complete this action
      </h3>
      <h2 className="openburo-modal-picker-title">
        Pick a file
      </h2>
      <div className="openburo-modal-picker-list">
        {availableServices.map((service) => (
          <button
            key={service.id}
            className="openburo-modal-picker-item"
            onClick={() => onSelectService(service)}
          >
            {service.name}
          </button>
        ))}
      </div>
    </div>
  );
};
