import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatAvatarProps {
  fotoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { box: "h-8 w-8", icon: "h-3.5 w-3.5" },
  md: { box: "h-10 w-10", icon: "h-4 w-4" },
  lg: { box: "h-14 w-14", icon: "h-6 w-6" },
};

export function ChatAvatar({ fotoUrl, size = "md", className }: ChatAvatarProps) {
  const { box, icon } = SIZE_MAP[size];
  const [errored, setErrored] = useState(false);

  // Reset error quando a URL mudar (novo lead selecionado, ou refresh da foto)
  useEffect(() => {
    setErrored(false);
  }, [fotoUrl]);

  const showImage = fotoUrl && !errored;

  return (
    <div
      className={cn(
        box,
        "rounded-full bg-violet-500/15 ring-1 ring-violet-400/20 flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {showImage ? (
        <img
          src={fotoUrl!}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <Phone className={cn(icon, "text-violet-400")} />
      )}
    </div>
  );
}
