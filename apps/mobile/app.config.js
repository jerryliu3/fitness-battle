/** Keep the normal static export. The optional study preview runs only in the browser,
 * avoiding server evaluation of native account/storage modules during design review. */
module.exports = ({ config }) => ({
  ...config,
  web: {
    ...config.web,
    output:
      process.env.OVERTAEK_STUDY_PREVIEW === "1"
        ? "single"
        : (config.web?.output ?? "static"),
  },
});
