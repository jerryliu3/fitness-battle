import XCTest
final class FieldGestures: XCTestCase {
 func shot(_ app: XCUIApplication, _ name: String) { let image = XCTAttachment(screenshot: app.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image) }
 func test01CourseAndSharedOverlays() throws {
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.terminate(); app.launch()
  if app.buttons["Back to the app →"].waitForExistence(timeout:5) { app.buttons["Back to the app →"].tap() }
  if app.buttons["Compete"].waitForExistence(timeout:10) { app.buttons["Compete"].tap() }
  let entry = app.buttons["Switch to 4D course"].firstMatch; XCTAssertTrue(entry.waitForExistence(timeout:20)); entry.tap()
  app.buttons["Expand 4D course to full screen"].tap()
  XCTAssertTrue(app.buttons["Close full screen field"].waitForExistence(timeout:10))
  let start = app.textFields["Start address, city or longitude,latitude"]
  XCTAssertTrue(start.waitForExistence(timeout:10)); start.tap(); start.typeText("-74.014,40.7045")
  let finish = app.textFields["Destination address, city or longitude,latitude"]; finish.tap(); finish.typeText("-73.9626,40.8075\n")
  let request = app.buttons["Find course"]; XCTAssertTrue(request.waitForExistence(timeout:8)); request.tap()
  XCTAssertTrue(app.buttons["Following"].waitForExistence(timeout:35))
  XCTAssertTrue(app.buttons["Collapse live intervals"].exists)
  XCTAssertTrue(app.buttons["Collapse athlete panel"].exists)
  app.buttons["Collapse live intervals"].tap(); XCTAssertTrue(app.buttons["Expand live intervals"].exists)
  app.buttons["Collapse athlete panel"].tap(); XCTAssertTrue(app.buttons["Expand athlete panel"].exists)
  app.buttons["Expand live intervals"].tap(); app.buttons["Expand athlete panel"].tap()
  let peer = app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@", "Jump to ")).firstMatch
  XCTAssertTrue(peer.exists); peer.tap()
  shot(app,"native-4d-shared-overlays")
  print("COURSE_AX_START\n" + app.debugDescription + "\nCOURSE_AX_END")
 }
 func test02GesturesModesAndReplay() throws {
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.activate()
  XCTAssertTrue(app.buttons["Race overview"].waitForExistence(timeout:10))
  app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.50)).press(forDuration:0.05,thenDragTo:app.coordinate(withNormalizedOffset:CGVector(dx:0.72,dy:0.55)))
  XCTAssertTrue(app.buttons["Recenter"].waitForExistence(timeout:5)); app.buttons["Recenter"].tap()
  app.pinch(withScale:1.5,velocity:1)
  XCTAssertTrue(app.buttons["Recenter"].waitForExistence(timeout:5)); app.buttons["Recenter"].tap()
  for mode in ["2D", "3D"] {
   app.buttons["Switch to " + mode + " field"].firstMatch.tap()
   XCTAssertTrue(app.buttons["Race overview"].waitForNonExistence(timeout:8))
   XCTAssertTrue(app.buttons["Close full screen field"].exists)
   app.buttons["Switch to 4D course"].firstMatch.tap()
   XCTAssertTrue(app.buttons["Race overview"].waitForExistence(timeout:15))
  }
  app.buttons["Replay"].firstMatch.tap()
  XCTAssertTrue(app.buttons["Close competition replay"].waitForExistence(timeout:10))
  XCTAssertTrue(app.buttons["Race overview"].waitForExistence(timeout:20))
  let next = app.buttons["Next competition event"]
  XCTAssertTrue(next.waitForExistence(timeout:10))
  if next.isEnabled { next.tap(); app.buttons["Jump to competition start"].tap() }
  for mode in ["2D", "3D"] {
   app.buttons["Switch to " + mode + " field"].firstMatch.tap()
   XCTAssertTrue(app.buttons["Race overview"].waitForNonExistence(timeout:8))
   app.buttons["Switch to 4D course"].firstMatch.tap()
   XCTAssertTrue(app.buttons["Race overview"].waitForExistence(timeout:15))
  }
  app.buttons["Play replay"].tap(); XCTAssertTrue(app.buttons["Pause replay"].waitForExistence(timeout:5)); app.buttons["Pause replay"].tap()
  shot(app,"native-4d-replay")
  app.buttons["Close competition replay"].tap()
  XCTAssertTrue(app.buttons["Close full screen field"].waitForExistence(timeout:10))
  app.buttons["Close full screen field"].tap()
  XCTAssertTrue(app.buttons["Expand 4D course to full screen"].waitForExistence(timeout:10))
 }
}
