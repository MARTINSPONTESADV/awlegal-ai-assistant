import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, X } from "lucide-react";
import fixWebmDuration from "fix-webm-duration";

interface AudioRecorderProps {
  onSend: (blob: Blob, extension: string) => Promise<void>;
  disabled?: boolean;
}

export default function AudioRecorder({ onSend, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sending, setSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    // Do NOT cleanup old refs — just overwrite them with new instances.
    // The previous onstop handler holds its own captured references.
    setSending(false);
    setElapsed(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = "audio/ogg; codecs=opus";
      const recorder = MediaRecorder.isTypeSupported(mimeType)
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      console.log("[AudioRecorder] mimeType:", recorder.mimeType);
      chunksRef.current = []; // Fresh array for this session
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      drawWaveform();
    } catch (err: unknown) {
      console.error("[AudioRecorder] Erro getUserMedia:", err);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
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

    // Stop UI timers immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    setIsRecording(false);
    setElapsed(0);

    // Capture the stream reference for THIS session so cleanup is isolated
    const sessionStream = streamRef.current;

    recorder.onstop = async () => {
      const chunks = [...chunksRef.current];
      const duration = Date.now() - startTimeRef.current;
      const rawBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      console.log("[AudioRecorder] Raw blob:", rawBlob.size, "bytes, duration:", duration, "ms, mimeType:", rawBlob.type);

      if (rawBlob.size === 0) {
        console.error("[AudioRecorder] Blob vazio. Upload abortado.");
        // Only stop mic tracks — don't nullify anything
        if (sessionStream) sessionStream.getTracks().forEach((t) => t.stop());
        setSending(false);
        return;
      }

      setSending(true);
      try {
        const fixedBlob = await fixWebmDuration(rawBlob, duration, { logger: false });
        console.log("[AudioRecorder] Fixed blob:", fixedBlob.size, "bytes, type:", fixedBlob.type);
        await onSend(fixedBlob, ".webm");
      } catch (err) {
        console.error("[AudioRecorder] Erro no upload:", err);
      } finally {
        // Only stop the mic tracks. Do NOT nullify refs or clear chunks.
        // Let startRecording overwrite them and GC handle the rest.
        if (sessionStream) sessionStream.getTracks().forEach((t) => t.stop());
        setSending(false);
      }
    };

    try {
      recorder.stop();
    } catch (e) {
      console.error("[AudioRecorder] Erro ao parar:", e);
      if (sessionStream) sessionStream.getTracks().forEach((t) => t.stop());
      setSending(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
        <MicOff className="h-4 w-4 text-destructive animate-pulse" />
        <span className="text-xs font-medium text-destructive">Gravando {formatTime(elapsed)}</span>
        <canvas ref={canvasRef} width={120} height={28} className="flex-1 max-w-[120px] rounded" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelRecording}>
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90" onClick={sendRecording} disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={startRecording} disabled={disabled || sending}>
      <Mic className="h-5 w-5" />
    </Button>
  );
}
