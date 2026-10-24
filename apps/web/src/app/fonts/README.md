# Bundled fonts

These fonts are from the official [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl). Each family retains its upstream OFL license beside the font files. Upstream TTFs are losslessly compressed to WOFF2 using fontTools (no glyph subsetting). Upright variable fonts retain their available axes; static families include the weights already used by the app.

Product and design routes load these assets with `next/font/local`, retaining their CSS variable names. Builds and browsers do not contact Google Fonts. To update a family, replace its assets and license together from the upstream family directory and verify the production build.
