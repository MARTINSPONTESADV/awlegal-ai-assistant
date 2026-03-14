import { cn } from "@/lib/utils";
import { FileText, Download, ExternalLink, Play, Pause, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ChatMediaRendererProps {
  conteudo: string;
  tipo_midia: string | null;
  media_url?: string | null;
  outgoing: boolean;
}

// ── Helpers para detectar tipo de mídia ──
function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)/i.test(url) || url.includes("/image");
}

function isAudioUrl(url: string): boolean {
  return /\.(mp3|ogg|wav|webm|m4a|aac|opus)/i.test(url) || url.includes("/audio") || url.includes("mensagens_audio");
}

function isDocumentUrl(url: string): boolean {
  return /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)/i.test(url);
}

function getFileExtension(url: string): string {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);/);
    if (match) {
      const mime = match[1].toLowerCase();
      if (mime.includes("pdf")) return "PDF";
      if (mime.includes("sheet") || mime.includes("excel")) return "XLSX";
      if (mime.includes("document") || mime.includes("word") || mime.includes("msword")) return "DOCX";
      if (mime.includes("zip")) return "ZIP";
      return mime.split("/")[1]?.toUpperCase() || "FILE";
    }
  }
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toUpperCase() : "FILE";
}

function getFileName(url: string): string {
  if (url.startsWith("data:")) {
    return `documento.${getFileExtension(url).toLowerCase()}`;
  }
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop() || "documento";
    return decodeURIComponent(name);
  } catch {
    return "Documento Anexado";
  }
}

// ── Detecta o tipo real da mídia ──
function resolveMediaType(tipo_midia: string | null, conteudo: string): "audio" | "image" | "document" | "text" {
  const tipo = (tipo_midia || "").toLowerCase();

  if (tipo === "audio" || tipo === "ptt") return "audio";
  if (tipo === "imagem" || tipo === "image" || tipo === "imageMessage") return "image";
  if (tipo === "document" || tipo === "documento" || tipo === "documentMessage") return "document";

  // Fallback: detecção por URL ou data URI
  if (conteudo) {
    if (conteudo.startsWith("data:")) {
      if (conteudo.startsWith("data:audio")) return "audio";
      if (conteudo.startsWith("data:image")) return "image";
      if (conteudo.startsWith("data:application")) return "document";
    }
    if (conteudo.startsWith("http://") || conteudo.startsWith("https://")) {
      if (isAudioUrl(conteudo)) return "audio";
      if (isImageUrl(conteudo)) return "image";
      if (isDocumentUrl(conteudo)) return "document";
    }
  }

  return "text";
}

// ══════════════════════════════════════════
// COMPONENTE: Imagem Premium
// ══════════════════════════════════════════
function ImageMessage({ src, outgoing }: { src: string; outgoing: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded) setError(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loaded]);

  // Fix for pure Base64 rendering (Problem 1)
  const imageSrc = src.startsWith("data:image") || src.startsWith("http") || src.startsWith("blob:") 
    ? src 
    : `data:image/jpeg;base64,${src}`;

  if (error) {
    return (
      <a href={imageSrc} target="_blank" rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
          outgoing ? "bg-violet-500/20 hover:bg-violet-500/30" : "bg-white/[0.06] hover:bg-white/[0.1]"
        )}
      >
        <ImageIcon className="h-5 w-5 shrink-0 opacity-60" />
        <span className="text-sm underline underline-offset-2">Abrir imagem</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-40" />
      </a>
    );
  }

  return (
    <div className="relative group">
      {!loaded && (
        <div className={cn(
          "w-[240px] h-[160px] rounded-lg animate-pulse",
          outgoing ? "bg-violet-500/20" : "bg-white/[0.08]"
        )} />
      )}
      <img
        src={imageSrc}
        alt="Imagem"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onClick={() => window.open(imageSrc, "_blank")}
        className={cn(
          "rounded-lg max-w-[300px] max-h-[280px] object-cover cursor-pointer transition-all hover:brightness-110 hover:shadow-lg",
          !loaded && "hidden"
        )}
      />
      {loaded && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={imageSrc} target="_blank" rel="noopener noreferrer"
            className="h-7 w-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-white" />
          </a>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// COMPONENTE: Áudio Premium (waveform-style)
// ══════════════════════════════════════════
function AudioMessage({ src, outgoing }: { src: string; outgoing: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); } else { audio.play(); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[220px] max-w-[300px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all",
          outgoing
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-violet-500/20 hover:bg-violet-500/30 text-violet-400"
        )}
      >
        {isPlaying
          ? <Pause className="h-4 w-4" />
          : <Play className="h-4 w-4 ml-0.5" />
        }
      </button>

      {/* Progress + Time */}
      <div className="flex-1 min-w-0">
        {/* Progress Bar */}
        <div
          className={cn(
            "h-1.5 rounded-full cursor-pointer relative overflow-hidden",
            outgoing ? "bg-white/15" : "bg-white/[0.08]"
          )}
          onClick={seek}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all",
              outgoing ? "bg-white/60" : "bg-violet-400/70"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time */}
        <div className="flex justify-between mt-1">
          <span className={cn("text-[10px] font-mono", outgoing ? "text-violet-200/50" : "text-muted-foreground/50")}>
            {formatTime(currentTime)}
          </span>
          <span className={cn("text-[10px] font-mono", outgoing ? "text-violet-200/50" : "text-muted-foreground/50")}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// COMPONENTE: Documento/Arquivo Premium
// ══════════════════════════════════════════
function DocumentMessage({ src, outgoing }: { src: string; outgoing: boolean }) {
  const ext = getFileExtension(src);
  const name = getFileName(src);
  
  const documentSrc = src.startsWith("data:application") || src.startsWith("http") || src.startsWith("blob:") 
    ? src 
    : `data:application/pdf;base64,${src}`;

  const extColorMap: Record<string, string> = {
    PDF: "text-red-400",
    DOC: "text-blue-400",
    DOCX: "text-blue-400",
    XLS: "text-emerald-400",
    XLSX: "text-emerald-400",
    TXT: "text-gray-400",
    CSV: "text-emerald-400",
    ZIP: "text-amber-400",
    RAR: "text-amber-400",
  };

  return (
    <div className="flex flex-col gap-2 min-w-[220px] max-w-[320px]">
      {ext === "PDF" && (
        <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-black/20 relative">
          <embed 
            src={documentSrc} 
            type="application/pdf" 
            className="w-full h-[140px] pointer-events-none opacity-80"
          />
          <div className="absolute inset-0 bg-transparent flex items-center justify-center">
            {/* Click blocking layer for the embed, clicking the embed itself directly inside chat restricts navigation */}
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
               <ExternalLink className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      )}
      <a
        href={documentSrc}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
          outgoing
            ? "bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/10"
            : "bg-black/10 hover:bg-black/20 border border-white/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
          outgoing ? "bg-violet-500/20" : "bg-white/[0.06]"
        )}>
          <FileText className={cn("h-5 w-5", extColorMap[ext] || "text-foreground")} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-semibold truncate",
            outgoing ? "text-white" : "text-foreground"
          )}>
            {name}
          </p>
          <p className={cn(
            "text-[10px] uppercase tracking-wider font-bold mt-0.5",
            outgoing ? "text-violet-200/50" : "text-muted-foreground/50"
          )}>
            {ext} • Baixar Documento
          </p>
        </div>

        {/* Download icon */}
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all bg-white/[0.05] group-hover:bg-white/[0.15]",
          outgoing ? "text-white" : "text-foreground"
        )}>
          <Download className="h-4 w-4 shrink-0 transition-opacity" />
        </div>
      </a>
    </div>
  );
}

// ══════════════════════════════════════════
// EXPORT: ChatMediaRenderer
// ══════════════════════════════════════════
export default function ChatMediaRenderer({ conteudo, tipo_midia, media_url, outgoing }: ChatMediaRendererProps) {
  const rawContent = (conteudo || "").trim();
  const mediaType = resolveMediaType(tipo_midia, rawContent);

  // Determina a URL da mídia: prioriza conteudo se for URL, senão usa media_url
  const isUrl = (s: string) => s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:");
  const mediaSrc = isUrl(rawContent) ? rawContent : (media_url && isUrl(media_url) ? media_url : rawContent);

  switch (mediaType) {
    case "audio":
      return <AudioMessage src={mediaSrc} outgoing={outgoing} />;
    case "image":
      return <ImageMessage src={mediaSrc} outgoing={outgoing} />;
    case "document":
      return <DocumentMessage src={mediaSrc} outgoing={outgoing} />;
    case "text":
    default:
      // Se o conteúdo é uma URL mas não detectamos o tipo, mostra como link clicável
      if (isUrl(rawContent)) {
        return (
          <a href={rawContent} target="_blank" rel="noopener noreferrer"
            className="text-sm underline underline-offset-2 break-all hover:opacity-80 transition-opacity"
          >
            {rawContent}
          </a>
        );
      }
      return <p className="whitespace-pre-wrap leading-relaxed">{rawContent}</p>;
  }
}
