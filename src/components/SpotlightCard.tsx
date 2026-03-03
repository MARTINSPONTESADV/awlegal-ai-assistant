import { useRef, useState, forwardRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SpotlightCard = forwardRef<HTMLDivElement, SpotlightCardProps>(
  ({ children, className, onClick }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMove = (e: MouseEvent) => {
      const el = typeof ref === "object" && ref?.current ? ref.current : internalRef.current;
      const rect = el?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        className={cn(
          "spotlight-card group relative rounded-xl border border-border bg-card p-6 transition-all duration-300",
          onClick && "cursor-pointer",
          className
        )}
        style={
          isHovered
            ? {
                background: `radial-gradient(400px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.04), hsl(var(--card)) 60%)`,
                borderImage: `radial-gradient(200px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.15), hsl(var(--border)) 60%) 1`,
              }
            : undefined
        }
      >
        {children}
      </div>
    );
  }
);

SpotlightCard.displayName = "SpotlightCard";