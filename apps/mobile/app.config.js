/** Keep the normal static export. The optional study preview runs only in the browser,
 * avoiding server evaluation of native account/storage modules during design review. */
module.exports = ({ config }) => {
  const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  if (process.env.EAS_BUILD === "true") {
    if (!mapboxAccessToken?.startsWith("pk.")) throw new Error("Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to a public Mapbox token before building.");
    if (!config.plugins?.some(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) === "@rnmapbox/maps")) throw new Error("The native Mapbox config plugin is required for this build.");
  }
  return ({
  ...config,
  extra: { ...config.extra, ...(mapboxAccessToken ? { mapboxAccessToken } : {}) },
  web: {
    ...config.web,
    output:
      process.env.OVERTAEK_STUDY_PREVIEW === "1"
        ? "single"
        : (config.web?.output ?? "static"),
  },
  });
};
