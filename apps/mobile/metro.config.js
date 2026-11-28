const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getSentryExpoConfig(projectRoot);
// Vitals Lab WebView host: .iife is browser JS — never parse as RN modules (.js runs `document` at load).
config.resolver.assetExts.push("html", "glb", "css", "iife");

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm nests packages under .pnpm; hierarchical lookup is required so Metro
// can resolve transitive deps like @babel/runtime and whatwg-fetch.
config.resolver.disableHierarchicalLookup = false;

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
