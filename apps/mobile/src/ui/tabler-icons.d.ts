// Tabler 3.49 exports per-icon runtime entry points, but ships declarations only
// for the root package. Keep direct imports typed without loading its full barrel
// into Metro's development bundle.
declare module "@tabler/icons-react-native/*" {
  import type { Icon } from "@tabler/icons-react-native";
  const icon: Icon;
  export default icon;
}
