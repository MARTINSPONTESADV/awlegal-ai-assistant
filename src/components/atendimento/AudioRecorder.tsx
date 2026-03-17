import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, X } from "lucide-react";
import fixWebmDuration from "fix-webm-duration";

interface AudioRecorderProps {
  onSend: (blob: Blob, extension: string) => Promise<void>;
  disabled?: boolean;
  onRecordingChange?: (recording: boolean) => void;
}

export default function AudioRecorder({ onSend, disabled, onRecordingChange }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);

  // Refs only for UI concerns (waveform, timer, cancel) — NOT for audio data
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    // === STEP 0: Kill any leftover previous session ===
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;

    setSending(false);
    setElapsed(0);

    try {
      // Constraints mínimos — compatível com iOS Safari e todos os Android
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Detecção de MIME type com fallback para iOS (mp4/aac)
      const webmMime = "audio/webm;codecs=opus";
      const mp4Mime = "audio/mp4";
      const mimeType = MediaRecorder.isTypeSupported(webmMime) ? webmMime
        : MediaRecorder.isTypeSupported(mp4Mime) ? mp4Mime
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      console.log("[AudioRecorder] NEW session. mimeType:", recorder.mimeType);

      // ===== CLOSURE-SCOPED DATA — fully isolated per session =====
      const sessionChunks: Blob[] = [];
      const sessionStartTime = Date.now();
      const sessionStream = stream;
      const sessionId = Math.random().toString(36).slice(2, 8); // debug tag

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          sessionChunks.push(e.data);
          console.log(`[AudioRecorder][${sessionId}] chunk #${sessionChunks.length}, size: ${e.data.size}`);
        }
      };

      recorder.onstop = async () => {
        // If cancelled, discard everything and return immediately
        if (cancelledRef.current) {
          console.log(`[AudioRecorder][${sessionId}] CANCELLED — áudio descartado`);
          sessionStream.getTracks().forEach((t) => t.stop());
          setSending(false);
          cancelledRef.current = false;
          return;
        }
        // Snapshot the chunks array immediately — no external refs
        const finalChunks = [...sessionChunks];
        const rawBlob = new Blob(finalChunks, { type: recorder.mimeType || "audio/webm" });
        const duration = Date.now() - sessionStartTime;
        console.log(`[AudioRecorder][${sessionId}] onstop — chunks: ${finalChunks.length}, blob: ${rawBlob.size} bytes, duration: ${duration}ms`);

        if (rawBlob.size === 0) {
          console.error(`[AudioRecorder][${sessionId}] Blob vazio. Upload abortado.`);
          sessionStream.getTracks().forEach((t) => t.stop());
          setSending(false);
          return;
        }

        setSending(true);
        try {
          const isWebm = rawBlob.type.includes("webm");
          const ext = isWebm ? ".webm" : ".mp4";
          const finalBlob = isWebm
            ? await fixWebmDuration(rawBlob, duration, { logger: false })
            : rawBlob;
          console.log(`[AudioRecorder][${sessionId}] Final blob: ${finalBlob.size} bytes, ext: ${ext}`);
          await onSend(finalBlob, ext);
        } catch (err) {
          console.error(`[AudioRecorder][${sessionId}] Erro no upload:`, err);
        } finally {
          sessionStream.getTracks().forEach((t) => t.stop());
          setSending(false);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      onRecordingChange?.(true);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      drawWaveform();
    } catch (err: unknown) {
      console.error("[AudioRecorder] Erro getUserMedia:", err);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      setIsRecording(false);
      setSending(false);
      setElapsed(0);
    }
  };

  const drawWaveform = () => {
    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `hsla(250, 60%, 60%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const cancelRecording = () => {
    // Set flag BEFORE stopping — onstop handler will see this and discard
    cancelledRef.current = true;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }

    // Stop the recorder — onstop will check cancelledRef and skip send
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }

    // Also kill the stream tracks immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    setIsRecording(false);
    onRecordingChange?.(false);
    setSending(false);
    setElapsed(0);
  };

  const sendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsRecording(false);
      setSending(false);
      setElapsed(0);
      return;
    }

    // Ensure cancel flag is OFF for a legitimate send
    cancelledRef.current = false;

    // Stop UI timers immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    setIsRecording(false);
    onRecordingChange?.(false);
    setElapsed(0);

    // onstop handler is already bound via closure in startRecording
    try {
      recorder.stop();
    } catch (e) {
      console.error("[AudioRecorder] Erro ao parar:", e);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      setSending(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (isRecording) {
    return (
      <div className="flex items-center flex-1 bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MicOff className="h-4 w-4 text-destructive animate-pulse shrink-0" />
          <span className="text-xs font-medium text-destructive shrink-0">Gravando {formatTime(elapsed)}</span>
          <canvas ref={canvasRef} width={120} height={28} className="flex-1 max-w-[120px] rounded" />
        </div>
        <div className="flex items-center gap-4 ml-4 shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/20 gap-1.5" 
            onClick={cancelRecording}
          >
            <X className="h-4 w-4" />
            <span className="text-xs font-semibold">Cancelar</span>
          </Button>
          <Button 
            size="sm" 
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 gap-1.5" 
            onClick={sendRecording} 
            disabled={sending}
          >
            <Send className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Enviar</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={startRecording} disabled={disabled || sending}>
      <Mic className="h-5 w-5" />
    </Button>
  );
}
