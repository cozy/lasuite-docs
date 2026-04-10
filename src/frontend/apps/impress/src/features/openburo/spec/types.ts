export type OpenFileParams = {
  allowedMimeType?: string | string[];
  multiple?: boolean;
  type?: string | string[];
};

export type OpenFileResult = {
  name: string;
  mimeType: string;
  size: number;
  sharingUrl?: string;
  downloadUrl?: string;
  payload?: unknown;
};

export type OpenFileDoneResponse = {
  status: 'done';
  id: string;
  results: OpenFileResult[];
};

export type OpenFileErrorResponse = {
  status: 'error';
  id: string;
  message: string;
};

export type OpenFileResponse = OpenFileDoneResponse | OpenFileErrorResponse;

export type OpenBuroCapability = {
  action: string;
  path: string;
  properties?: {
    mimeTypes?: string[];
  };
};

export type OpenBuroService = {
  id: string;
  name: string;
  url: string;
  display?: string;
  version?: string;
  capabilities: OpenBuroCapability[];
};
