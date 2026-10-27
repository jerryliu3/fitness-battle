import ExpoModulesCore
import UIKit

public class AnchoredChoiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AnchoredChoice")
    View(AnchoredChoiceView.self) {
      Events("onSelect")
      Prop("options") { (view: AnchoredChoiceView, options: [[String: String]]) in
        view.options = options
        view.updateMenu()
      }
      Prop("value") { (view: AnchoredChoiceView, value: String) in
        view.value = value
        view.updateMenu()
      }
      Prop("label") { (view: AnchoredChoiceView, label: String) in
        view.label = label
        view.updateMenu()
      }
    }
  }
}

final class AnchoredChoiceView: ExpoView {
  let onSelect = EventDispatcher()
  let button = UIButton(type: .system)
  var options: [[String: String]] = []
  var value = ""
  var label = ""

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    button.showsMenuAsPrimaryAction = true
    addSubview(button)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
  }

  func updateMenu() {
    let selected = options.first { $0["value"] == value }?["label"] ?? "Choose"
    button.accessibilityLabel = "\(label): \(selected)"
    button.menu = UIMenu(title: label, children: options.compactMap { option -> UIAction? in
      guard let key = option["value"], let title = option["label"] else { return nil }
      return UIAction(title: title, state: key == value ? .on : .off) { [weak self] _ in
        self?.onSelect(["value": key])
      }
    })
  }
}
