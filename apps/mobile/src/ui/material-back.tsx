import { IconButton } from "./icon-button";
export function MaterialBack({ onPress }: { onPress(): void }) { return <IconButton icon="back" label="Back to events" onPress={onPress} />; }
