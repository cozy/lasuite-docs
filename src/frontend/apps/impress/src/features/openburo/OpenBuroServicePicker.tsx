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
      <h2 className="openburo-modal-picker-title">
        Select a service to continue this action
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
