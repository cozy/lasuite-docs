declare global {
  interface Window {
    _cozyBridge: {
      updateDocs: (data: {
        docsId: string;
        content?: string;
        name?: name;
      }) => Promise<object>;
      search: (
        queryString: string,
      ) => Promise<{ title: string; url: string }[]>;
      setupBridge: (target: string) => Promise<void>;
      startHistorySyncing: () => Promise<void>;
    };
  }
}

export {};
