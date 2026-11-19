import { useEffect, useRef } from "react";

export type Mouth = "smile" | "neutral" | "frown";

const MOUTH: Record<Mouth, string> = {
  smile: "M30 58 Q48 74 66 58",
  neutral: "M32 64 H64",
  frown: "M30 70 Q48 56 66 70",
};

type SmileyProps = {
  mouth: Mouth;
  shy: boolean;
};

export function Smiley({ mouth, shy }: SmileyProps) {
  const faceRef = useRef<SVGSVGElement>(null);
  const leftRef = useRef<SVGGElement>(null);
  const rightRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let lastMove = 0;
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      const face = faceRef.current;
      if (!face) return;
      const rect = face.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height * 0.42);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(3.4, dist / 34);
      target.x = (dx / dist) * reach;
      target.y = (dy / dist) * reach;
      lastMove = performance.now();
    };

    const tick = () => {
      const idle = performance.now() - lastMove > 1400;
      const goalX = idle ? Math.sin(performance.now() / 680) * 2.1 : target.x;
      const goalY = idle ? Math.cos(performance.now() / 920) * 1.15 : target.y;
      current.x += (goalX - current.x) * 0.18;
      current.y += (goalY - current.y) * 0.18;
      const transform = `translate(${current.x.toFixed(2)} ${current.y.toFixed(2)})`;
      leftRef.current?.setAttribute("transform", transform);
      rightRef.current?.setAttribute("transform", transform);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg
      ref={faceRef}
      viewBox="0 0 96 96"
      className={shy ? "mascot is-shy" : "mascot"}
      aria-hidden="true"
    >
      <circle cx="48" cy="48" r="46" className="mascot-face" />
      <g ref={leftRef}>
        <circle cx="36" cy="42" r="5.5" className="mascot-eye" />
        <circle cx="37.6" cy="40.2" r="1.7" className="mascot-shine" />
      </g>
      <g ref={rightRef}>
        <circle cx="60" cy="42" r="5.5" className="mascot-eye" />
        <circle cx="61.6" cy="40.2" r="1.7" className="mascot-shine" />
      </g>
      <path d={MOUTH[mouth]} className="mascot-mouth" />
      <rect x="27" y="33" width="18" height="18" rx="9" className="mascot-lid" />
      <rect x="51" y="33" width="18" height="18" rx="9" className="mascot-lid" />
    </svg>
  );
}
