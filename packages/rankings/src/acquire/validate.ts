import type { AcquisitionPreview } from "./preview";

/** Block ordinary staging/publication when extraction evidence is incomplete or inconsistent. */
export function assertPreviewAllowsApply(preview: AcquisitionPreview): void {
  if (preview.expectedTotal != null && !preview.complete) {
    throw new Error(
      `Coverage incomplete: accounted ${preview.extractedCount + preview.skippedYouth + preview.skippedUnparsed} vs expected ${preview.expectedTotal}.`,
    );
  }
  if (preview.duplicateExternalIds > 0) {
    throw new Error(`Duplicate external result identities: ${preview.duplicateExternalIds}.`);
  }
  if (preview.skippedUnparsed > 0) {
    throw new Error(`Unparsed rows remain: ${preview.skippedUnparsed}.`);
  }
  if (preview.extractedCount === 0) {
    throw new Error("No extracted finishers; import held.");
  }
}
