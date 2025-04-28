/// <reference types="vite/client" />

interface ImportMetaEnv {
    REACT_APP_BACKEND_URL: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  