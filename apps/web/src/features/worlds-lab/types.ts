import type { Activity } from "../design-lab/data";
import type { Runner } from "../spatial-lab/model";
import type { snapshot } from "./model";

export interface WorldProps {
  week: ReturnType<typeof snapshot>;
  reference: Runner;
  onCutoff: (cutoff: number) => void;
  onReference: (id: string) => void;
  onActivity: (activity: Activity) => void;
  onGroups: () => void;
  playing: boolean;
  onReplay: () => void;
}
