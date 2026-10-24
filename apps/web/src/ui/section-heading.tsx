import { SectionHeader } from "./section";
/** Compatibility alias. New features use SectionHeader and subtitle. */
export function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <SectionHeader title={title} subtitle={detail} action={action}/>;
}
export { SectionHeader } from "./section";
