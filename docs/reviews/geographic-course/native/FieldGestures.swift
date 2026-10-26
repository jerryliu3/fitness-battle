import XCTest
final class FieldGestures: XCTestCase {
 func shot(_ app: XCUIApplication, _ name: String) { let image = XCTAttachment(screenshot: app.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image) }
 func test01Course() throws {
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.terminate(); app.launch()
  if app.buttons["Compete"].waitForExistence(timeout:10) { app.buttons["Compete"].tap() }
  let entry = app.buttons["Race on a real course"]; XCTAssertTrue(entry.waitForExistence(timeout:20)); entry.tap()
  shot(app,"course-chooser")
  let start = app.textFields["Start address, city or longitude,latitude"]
  XCTAssertTrue(start.waitForExistence(timeout:10)); start.tap(); start.typeText("-74.014,40.7045")
  let finish = app.textFields["Destination address, city or longitude,latitude"]; finish.tap(); finish.typeText("-73.9626,40.8075\n")
  let request = app.buttons["Find course"]; XCTAssertTrue(request.waitForExistence(timeout:8)); request.tap()
  XCTAssertTrue(app.buttons["Following"].waitForExistence(timeout:35))
  shot(app,"native-city-loaded")
  print("COURSE_AX_START\n" + app.debugDescription + "\nCOURSE_AX_END")
 }
 func test02NativePanPinchAndSelection() throws {
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.activate()
  XCTAssertTrue(app.buttons["Whole route"].waitForExistence(timeout:10))
  func recenter() { if app.buttons["Recenter"].exists { app.buttons["Recenter"].tap() }; XCTAssertTrue(app.buttons["Following"].waitForExistence(timeout:5)) }
  func map() -> XCUIElement {
   return app.otherElements.allElementsBoundByIndex.first { element in
    let r=element.frame; return r.minY > 170 && r.minY < 210 && r.width > 430 && r.height > 450 && r.height < 680
   }!
  }
  for dimension in ["3d","2d"] {
   if dimension == "2d" && app.buttons["2D map"].exists { app.buttons["2D map"].tap() }
   for (index, end) in [CGVector(dx:0.75,dy:0.60),CGVector(dx:0.25,dy:0.43),CGVector(dx:0.55,dy:0.68)].enumerated() {
    recenter()
    app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.5)).press(forDuration:0.05,thenDragTo:app.coordinate(withNormalizedOffset:end))
    XCTAssertTrue(app.buttons["Recenter"].waitForExistence(timeout:5)); shot(app,dimension+"-drag-"+String(index))
   }
   recenter(); map().pinch(withScale:0.6,velocity:-1)
   XCTAssertTrue(app.buttons["Recenter"].waitForExistence(timeout:5)); shot(app,dimension+"-pinch-out")
   recenter(); map().pinch(withScale:1.6,velocity:1)
   XCTAssertTrue(app.buttons["Recenter"].waitForExistence(timeout:5)); shot(app,dimension+"-pinch-in")
   let peer=app.buttons.matching(NSPredicate(format:"label BEGINSWITH %@","Noah Brooks ·")).firstMatch
   peer.tap(); XCTAssertTrue(app.buttons["Following"].waitForExistence(timeout:5)); shot(app,dimension+"-selected-noah")
   peer.tap(); XCTAssertTrue(app.buttons["Following"].exists)
   app.buttons["Whole route"].tap(); XCTAssertTrue(app.buttons["Recenter"].waitForExistence(timeout:5)); shot(app,dimension+"-whole-route")
  }
 }

}
