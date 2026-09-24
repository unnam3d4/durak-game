export function installGameSurfaceGuards(
  root: HTMLElement
): () => void {
  const onContextMenu = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!root.contains(target)) return;

    event.preventDefault();
  };

  document.addEventListener("contextmenu", onContextMenu);

  return () => {
    document.removeEventListener("contextmenu", onContextMenu);
  };
}
