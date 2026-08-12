/** Pick one rendered A2UI component without changing ordinary page interaction. */
let highlighted: { element: HTMLElement; outline: string; outlineOffset: string } | null = null;

export function pickRenderedComponent(container: HTMLElement): Promise<string | null> {
  return new Promise((resolve) => {
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";

    const finish = (componentId: string | null) => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.cursor = previousCursor;
      resolve(componentId);
    };

    const onClick = (event: MouseEvent) => {
      const path = event.composedPath();
      if (!path.includes(container)) return;
      const target = path.find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && Boolean(node.getAttribute("data-component-id")),
      );
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      if (highlighted) {
        highlighted.element.style.outline = highlighted.outline;
        highlighted.element.style.outlineOffset = highlighted.outlineOffset;
      }
      highlighted = {
        element: target,
        outline: target.style.outline,
        outlineOffset: target.style.outlineOffset,
      };
      target.style.outline = "2px solid var(--a2ui-color-primary)";
      target.style.outlineOffset = "3px";
      finish(target.getAttribute("data-component-id"));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      finish(null);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  });
}
