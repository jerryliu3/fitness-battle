/** React Native / Expo packages expect a Metro-style global in unit tests. */
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
