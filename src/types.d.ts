declare global {
  interface Window {
    electronAPI: {
      checkUpdate: () => Promise<any>;
      downloadGame: (url: string) => Promise<void>;
      launchGame: () => void;
      checkGameStatus: () => Promise<GameStatus>;
    };
  }
}

export interface GameStatus {
  isInstalled: boolean;
  isUpdated: boolean;
  currentVersion: string | null;
} 