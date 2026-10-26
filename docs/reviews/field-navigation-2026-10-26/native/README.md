# Native field walkthrough

These XCTest cases drive the installed `com.overtaek.app` through actual native
input. Build/install this branch first using the release command in the parent
review. They expect the existing seeded local Alice account with Noah as a rival;
they do not seed or change account data, upload activities, or touch production
standings. Different rosters require changing the athlete labels in the test.

Generate an isolated UI-test project using the `xcodeproj` Ruby gem already used
by CocoaPods. For the Homebrew CocoaPods installation used in this review:

```sh
GEM_HOME="$(brew --prefix cocoapods)/libexec" /opt/homebrew/opt/ruby/bin/ruby \
  docs/reviews/field-navigation-2026-10-26/native/create-runner.rb /tmp/overtaek-field-ui
xcodebuild clean test \
  -project /tmp/overtaek-field-ui/FieldGestures.xcodeproj -scheme FieldGestures \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' \
  -derivedDataPath /tmp/overtaek-field-ui/build \
  -parallel-testing-enabled NO -collect-test-diagnostics never \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 180 \
  CODE_SIGNING_ALLOWED=NO
```

Each case captures native screenshots in its `.xcresult` bundle. This local
runner is independent of the product's generated/ignored iOS project. It does
not add a native package or a test target to the production app.

The cases run in numeric order: establish a close camera, exercise live selection,
then widen the camera to include the start. Start with a fresh app launch if
running an individual case out of order. If Xcode reuses an older runner after
editing the test source, uninstall only `com.overtaek.field-gestures.xctrunner`
from the test simulator and regenerate the temporary project.
