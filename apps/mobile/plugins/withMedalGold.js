const fs = require("node:fs/promises");
const path = require("node:path");
const { AndroidConfig, IOSConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const gold = require("../../../packages/shared/src/brand-gold.json");

function color(colorSpace, [red, green, blue]) {
  return {
    "color-space": colorSpace,
    components: { red: String(red), green: String(green), blue: String(blue), alpha: "1" },
  };
}

module.exports = function withMedalGold(config) {
  config = withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    activity.$["android:colorMode"] = "wideColorGamut";
    return config;
  });

  return withDangerousMod(config, ["ios", async (config) => {
    const { projectRoot, platformProjectRoot } = config.modRequest;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const directory = path.join(platformProjectRoot, projectName, "Images.xcassets", `${gold.iosColorName}.colorset`);
    const srgb = gold.srgb.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
    const contents = {
      colors: [
        { idiom: "universal", color: color("srgb", srgb) },
        { idiom: "universal", "display-gamut": "display-P3", color: color("display-p3", gold.displayP3) },
      ],
      info: { author: "xcode", version: 1 },
    };

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "Contents.json"), JSON.stringify(contents, null, 2) + "\n");
    return config;
  }]);
};
