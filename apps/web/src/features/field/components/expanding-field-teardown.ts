/** Snap the persistent lane portal back into the inline slot (no close animation). */
export function collapseExpandingFieldImmediate(
  host: HTMLDivElement | null,
  mount: HTMLDivElement | null,
  slot: HTMLDivElement | null,
  animations: {
    host?: Animation | null;
    content?: Animation | null;
  },
) {
  animations.host?.cancel();
  animations.content?.cancel();
  if (host) host.style.visibility = "hidden";
  if (mount && slot) {
    slot.appendChild(mount);
    mount.style.cssText = "";
    slot.style.height = "";
  }
}
