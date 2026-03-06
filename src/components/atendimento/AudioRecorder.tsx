import { useState, useRef, useEffect, useCallback } from "react";
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

  // Refs that survive across renders but are NOT used to accumulate chunks
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // This ref holds the LOCAL chunks array for the CURRENT recording session.
  // It is reassigned to a brand-new array on every startRecording call,
  // and the onstop closure captures it by reference so there is zero
  // chance of stale-state corruption.
  const sessionChunksRef = useRef<Blob[]>([]);
  const sessionStartRef = useRef<number>(0);

  useEffect(() => {
    return () => { releaseHardware(); };
  }, []);

  /** Release mic, timers, animation — but does NOT touch sessionChunksRef */
  const releaseHardware = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
  }, []);

  const startRecording = async () => {
    // 1. Hard-stop any previous recorder that may still be alive
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    releaseHardware();

    // 2. Create a BRAND-NEW local chunks array for THIS session.
    //    The onstop closure below captures `localChunks` by reference,
    //    so it is completely isolated from future recordings.
    const localChunks: Blob[] = [];
    sessionChunksRef.current = localChunks;

    // 3. Reset UI
    setIsRecording(false);
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

      // Analyser for waveform visualisation
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Prefer OGG Opus; fall back to browser default (WebM in Chrome)
      const mimeType = "audio/ogg; codecs=opus";
      const recorder = MediaRecorder.isTypeSupported(mimeType)
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      console.log("[AudioRecorder] New session — mimeType:", recorder.mimeType);

      // ── ondataavailable: push into LOCAL array, not React state ──
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          localChunks.push(e.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;

      const startTime = Date.now();
      sessionStartRef.current = startTime;

      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      drawWaveform();
    } catch (err: unknown) {
      console.error("[AudioRecorder] Erro getUserMedia:", err);
      releaseHardware();
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
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    releaseHardware();
    sessionChunksRef.current = [];
    setIsRecording(false);
    setSending(false);
    setElapsed(0);
  };

  const sendRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      releaseHardware();
      sessionChunksRef.current = [];
      setIsRecording(false);
      setSending(false);
      setElapsed(0);
      return;
    }

    // Capture the session's local chunks reference BEFORE stopping
    const chunksForThisSession = sessionChunksRef.current;
    const duration = Date.now() - sessionStartRef.current;
    const recorderMime = recorder.mimeType;

    // Stop UI immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
    setIsRecording(false);
    setElapsed(0);

    // ── onstop: reads from the captured LOCAL chunks array ──
    recorder.onstop = async () => {
      console.log("[AudioRecorder] onstop — chunks:", chunksForThisSession.length, "duration:", duration, "ms");

      // Release hardware immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      analyserRef.current = null;

      if (chunksForThisSession.length === 0) {
        console.error("[AudioRecorder] Nenhum chunk gravado. Upload abortado.");
        setSending(false);
        return;
      }

      const rawBlob = new Blob(chunksForThisSession, { type: recorderMime || "audio/webm" });
      console.log("[AudioRecorder] Raw blob:", rawBlob.size, "bytes, type:", rawBlob.type);

      if (rawBlob.size === 0) {
        console.error("[AudioRecorder] Blob vazio. Upload abortado.");
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
        setSending(false);
      }
    };

    try {
      recorder.stop();
    } catch (e) {
      console.error("[AudioRecorder] Erro ao parar:", e);
      releaseHardware();
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
