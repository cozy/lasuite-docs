import CONSTS from './CONSTS.json';
import localDiscovery from './discovery.json';
import { OpenBuroService } from './spec/types';

const OPEN_BURO_DISCOVERY_URL = CONSTS.OPEN_BURO_DISCOVERY_URL;
const BANNED_SERVICES = ["twake-drive-filepicker"];

export const fetchOpenBuroDiscovery = async (): Promise<OpenBuroService[]> => {
  const response = await fetch(OPEN_BURO_DISCOVERY_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenBuro discovery: ${response.status} ${response.statusText}`,
    );
  }

  const rawJson = await response.text();
  const parsed = JSON.parse(rawJson);

  if (!Array.isArray(parsed)) {
    throw new Error('OpenBuro discovery payload is not an array');
  }

  const final = [
    ...(parsed as OpenBuroService[]),
    ...(localDiscovery as OpenBuroService[]),
  ];

  const filtered = final.filter((service) => !BANNED_SERVICES.includes(service.id));

  return filtered;
};
