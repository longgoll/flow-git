/// <reference types="vite/client" />

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

// Version được inject từ package.json qua vite.config.ts define
declare const APP_VERSION: string;

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
}
