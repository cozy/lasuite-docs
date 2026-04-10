import { OpenFileParams, OpenFileResponse } from '../spec/types';

export type OpenBuroContextValue = {
  openFile: (params?: OpenFileParams) => Promise<OpenFileResponse>;
  isModalOpen: boolean;
};
