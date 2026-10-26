import XCTest
final class FieldGestures: XCTestCase {
 func shot(_ app: XCUIApplication, _ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
 func field(_ app: XCUIApplication, _ dimension: String) -> XCUIElement { app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", dimension + " field,")).firstMatch }
 func drag(_ app: XCUIApplication, _ a: CGVector, _ b: CGVector) { app.coordinate(withNormalizedOffset:a).press(forDuration:0.05, thenDragTo:app.coordinate(withNormalizedOffset:b)) }
 func changed(_ element: XCUIElement, _ before: String) { XCTAssertTrue(NSPredicate(format:"label != %@",before).evaluate(with:element) || XCTWaiter.wait(for:[XCTNSPredicateExpectation(predicate:NSPredicate(format:"label != %@",before),object:element)],timeout:3) == .completed) }
 func settle(_ scene: XCUIElement) {
  var last = scene.label; var at = Date()
  let predicate = NSPredicate { _,_ in let now = scene.label; if now != last { last = now; at = Date(); return false }; return Date().timeIntervalSince(at) > 0.4 }
  XCTAssertEqual(XCTWaiter.wait(for:[XCTNSPredicateExpectation(predicate:predicate,object:scene)],timeout:15),.completed)
 }
 func test01PanPinchAndSelection() throws {
  print("WALKTHROUGH_VERSION_20261026_FINAL")
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.activate()
  let compete = app.buttons["Compete"]; if compete.waitForExistence(timeout:8) { compete.tap() }
  let expand = app.buttons["Expand 2D map to full screen"].firstMatch
  if expand.waitForExistence(timeout:8) { expand.tap() }
  if app.buttons["Switch to 2D map"].exists { app.buttons["Switch to 2D map"].tap() }
  let initialMap = field(app,"2D"); XCTAssertTrue(initialMap.waitForExistence(timeout:5))
  for _ in 0..<12 { let zoom = app.buttons["Zoom in"]; if zoom.isEnabled { zoom.tap(); settle(initialMap) } }
  app.buttons["Recenter on your athlete"].tap(); settle(initialMap)
  for dimension in ["2D","3D"] {
   if dimension == "3D" { app.buttons["Switch to 3D field"].tap() }
   let scene = field(app,dimension); XCTAssertTrue(scene.waitForExistence(timeout:5)); shot(app,dimension+"-before")
   for (i,delta) in [(0,CGVector(dx:0.7,dy:0.6)),(1,CGVector(dx:0.35,dy:0.45)),(2,CGVector(dx:0.65,dy:0.65))] {
    let before = scene.label
    drag(app,CGVector(dx:0.5,dy:0.52),delta); changed(scene,before)
    print("\(dimension)_DRAG_\(i): \(before) -> \(scene.label)")
   }
   shot(app,dimension+"-after-drags")
   let before = scene.label; scene.pinch(withScale:0.65,velocity:-1); changed(scene,before)
   print("\(dimension)_PINCH_OUT: \(before) -> \(scene.label)"); shot(app,dimension+"-pinch-out")
   let zoomed = scene.label; scene.pinch(withScale:1.5,velocity:1); changed(scene,zoomed)
   print("\(dimension)_PINCH_IN: \(zoomed) -> \(scene.label)"); shot(app,dimension+"-pinch-in")
   app.buttons["Focus Noah Brooks, place 2"].tap(); settle(scene); shot(app,dimension+"-selected-noah")
   app.buttons["Recenter on your athlete"].tap(); settle(scene); shot(app,dimension+"-your-solid-trail")
  }
 }
 func test03HorizontalPortraitAndStartTrail() throws {
  print("WALKTHROUGH_VERSION_20261026_FINAL")
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.activate()
  if app.buttons["Compete"].exists && app.buttons["Compete"].isHittable { app.buttons["Compete"].tap() }
  let expand = app.buttons["Expand 2D map to full screen"].firstMatch
  if expand.exists && expand.isHittable { expand.tap() }
  if app.buttons["Switch to 3D field"].exists { app.buttons["Switch to 3D field"].tap() }
  for dimension in ["3D", "2D"] {
   if dimension == "2D" { app.buttons["Switch to 2D map"].tap() }
   let scene = field(app, dimension); XCTAssertTrue(scene.waitForExistence(timeout:5))
   app.buttons["Recenter on your athlete"].tap(); settle(scene)
   let athlete = app.buttons["Focus Alice Park"]
   XCTAssertTrue(athlete.exists)
   if dimension == "2D" {
    for _ in 0..<12 { let zoom = app.buttons["Zoom in"]; if zoom.isEnabled { zoom.tap(); settle(scene) } }
   }
   app.buttons["Recenter on your athlete"].tap(); settle(scene)
   let oldX = athlete.frame.midX
   drag(app, CGVector(dx:0.5,dy:0.5), CGVector(dx:0.7,dy:0.5))
   print("\(dimension)_HORIZONTAL: \(oldX) -> \(athlete.frame.midX)")
   XCTAssertGreaterThan(abs(athlete.frame.midX-oldX),20)
   drag(app, CGVector(dx:0.5,dy:0.5), CGVector(dx:0.3,dy:0.5))
   let before = scene.label
   let point = athlete.coordinate(withNormalizedOffset: CGVector(dx:0.5,dy:0.5))
   point.press(forDuration:0.05,thenDragTo:point.withOffset(CGVector(dx:35,dy:70)))
   changed(scene,before); print("\(dimension)_PORTRAIT_DRAG: \(before) -> \(scene.label)")
   shot(app,dimension+"-after-portrait-drag")
   // Include distance zero while retaining the selected athlete in the view.
   for _ in 0..<8 { scene.pinch(withScale:0.65,velocity:-2) }
   app.buttons["Recenter on your athlete"].tap(); settle(scene)
   print("\(dimension)_START_WINDOW: \(scene.label)")
   let low = Double(scene.label.components(separatedBy:", ")[1].components(separatedBy:" to ")[0])!
   XCTAssertLessThanOrEqual(low,0)
   shot(app,dimension+"-whole-solid-trail")
  }
 }

 func test02LiveIntervalsAndDecorativeHeader() throws {
  print("WALKTHROUGH_VERSION_20261026_FINAL")
  let app = XCUIApplication(bundleIdentifier: "com.overtaek.app"); app.activate()
  if app.buttons["Compete"].exists && app.buttons["Compete"].isHittable { app.buttons["Compete"].tap() }
  let expand = app.buttons["Expand 2D map to full screen"].firstMatch
  if expand.exists && expand.isHittable { expand.tap() }
  if app.buttons["Switch to 3D field"].exists { app.buttons["Switch to 3D field"].tap() }
  for dimension in ["3D","2D"] {
   if dimension == "2D" { app.buttons["Switch to 2D map"].tap() }
   let scene = field(app,dimension); XCTAssertTrue(scene.exists)
   let before = scene.label
   drag(app,CGVector(dx:0.5,dy:0.09),CGVector(dx:0.6,dy:0.4)); changed(scene,before)
   print("\(dimension)_HEADER_DRAG: \(before) -> \(scene.label)")
   let from = scene.label
   app.buttons["Jump to Noah Brooks"].tap()
   let mid = scene.label; settle(scene)
   XCTAssertNotEqual(from,scene.label)
   print("\(dimension)_LIVE_FLIGHT: \(from) -> \(mid) -> \(scene.label)")
   app.buttons["Jump to Alice Park"].tap(); settle(scene)
   shot(app,dimension+"-live-selection-solid-trail")
  }
 }

}
