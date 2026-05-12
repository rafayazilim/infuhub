import React, { useCallback, useEffect, useMemo, useRef } from "react";

const COLORS = ["#08afd5", "#0b96b8", "#5ec9e0", "#b84d7a", "#e3447c", "#ff8eb3"];
const BUBBLE_COUNT = 80;
const MOUSE_INFLUENCE = 0.35;

interface Bubble {
  id: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
}

export const HeroBubbleBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>();

  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
      id: i,
      baseX: Math.random() * 100,
      baseY: Math.random() * 100,
      size: Math.random() * 6 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseRef.current = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    let start = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - start) * 0.001;
      const bubblesEl = containerRef.current?.querySelectorAll("[data-bubble]");
      const mouse = mouseRef.current;
      if (!bubblesEl || bubblesEl.length === 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      bubbles.forEach((b, i) => {
        const el = bubblesEl[i] as HTMLElement;
        if (!el) return;
        const dx = (mouse.x - 0.5) * 20 * MOUSE_INFLUENCE;
        const dy = (mouse.y - 0.5) * 20 * MOUSE_INFLUENCE;
        const driftX = Math.sin(elapsed * b.speed + b.phase) * 2;
        const driftY = Math.cos(elapsed * b.speed * 0.7 + b.phase * 1.3) * 2;
        const x = b.baseX + dx + driftX;
        const y = b.baseY + dy + driftY;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [bubbles]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden
    >
      {bubbles.map((b) => (
        <div
          key={b.id}
          data-bubble
          className="absolute rounded-full transition-transform duration-500 ease-out"
          style={{
            left: `${b.baseX}%`,
            top: `${b.baseY}%`,
            width: b.size,
            height: b.size,
            backgroundColor: b.color,
            opacity: 0.4 + Math.random() * 0.4,
            boxShadow: `0 0 ${b.size * 2}px ${b.color}40`,
          }}
        />
      ))}
    </div>
  );
};
