/// <reference types="vite/client" />

// Minimal Node-process ambient. The consumer's bundler (Vite) replaces
// `process.env.NODE_ENV` at build time. This declaration only exists so
// TypeScript stops complaining when typechecking the package in isolation.
declare const process: {
    env: {
        NODE_ENV?: string;
        [key: string]: string | undefined;
    };
};
