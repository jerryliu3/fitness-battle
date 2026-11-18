const { withAndroidManifest } = require("expo/config-plugins");

const PORTRAIT_FEATURE = "android.hardware.screen.portrait";

/** Portrait orientation in the activity does not require portrait-only hardware (tablets, desktop, XR). */
function withOptionalPortraitAndroid(config) {
  return withAndroidManifest(config, (config) => {
    const features = config.modResults.manifest["uses-feature"] ?? [];

    let found = false;
    for (const feature of features) {
      if (feature.$?.["android:name"] === PORTRAIT_FEATURE) {
        feature.$["android:required"] = "false";
        found = true;
      }
    }

    if (!found) {
      features.push({
        $: {
          "android:name": PORTRAIT_FEATURE,
          "android:required": "false",
        },
      });
    }

    config.modResults.manifest["uses-feature"] = features;
    return config;
  });
}

module.exports = withOptionalPortraitAndroid;