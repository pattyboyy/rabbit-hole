/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_CLAUDE_API_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 