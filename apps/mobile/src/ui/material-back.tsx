import { IconButton } from "./icon-button";
export function MaterialBack({ onPress, label = "Back to events" }: { onPress(): void; label?: string }) { return <IconButton icon="back" label={label} onPress={onPress} />; }
