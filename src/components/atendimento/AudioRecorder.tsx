import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  const stopEverything = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Waveform analyser
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = "audio/ogg; codecs=opus";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      drawWaveform();
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      stopEverything();
      setIsRecording(false);
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
        const hue = 250; // purple-ish
        ctx.fillStyle = `hsla(${hue}, 60%, 60%, 0.8)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const cancelRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch (e) {
      console.error("Erro ao cancelar gravação:", e);
    }
    stopEverything();
    setIsRecording(false);
    setElapsed(0);
  };

  const sendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      console.log("[AudioRecorder] Recorder inativo, resetando estado.");
      stopEverything();
      setIsRecording(false);
      setElapsed(0);
      return;
    }

    // Save chunks ref before cleanup nullifies it
    const savedChunks = chunksRef.current;

    recorder.onstop = async () => {
      const blob = new Blob(savedChunks, { type: "audio/ogg; codecs=opus" });
      console.log("[AudioRecorder] Blob criado:", blob.size, "bytes, tipo:", blob.type);
      if (blob.size === 0) {
        console.warn("[AudioRecorder] Blob vazio, envio cancelado.");
        return;
      }
      setSending(true);
      try {
        await onSend(blob, ".ogg");
      } catch (err) {
        console.error("[AudioRecorder] Erro ao enviar áudio:", err);
      } finally {
        setSending(false);
      }
    };

    // Stop recorder first (triggers onstop asynchronously)
    try {
      recorder.stop();
    } catch (e) {
      console.error("[AudioRecorder] Erro ao parar gravação:", e);
    }

    // Release hardware immediately (but don't clear chunksRef — savedChunks holds reference)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    setIsRecording(false);
    setElapsed(0);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

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
