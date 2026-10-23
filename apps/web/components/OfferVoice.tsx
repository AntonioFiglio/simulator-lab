"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { api } from "./ui";
export default function OfferVoice({
  disabled,
  onText,
  onError,
  onBusy,
}: {
  disabled: boolean;
  onText: (text: string) => void;
  onError: (text: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [recording, setRecording] = useState(false),
    [working, setWorking] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  const release = () => {
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      release();
    };
  }, []);
  async function start() {
    onError("");
    setWorking(true);
    onBusy(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw Error(
          "Este navegador não oferece gravação. Você pode digitar a resposta.",
        );
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        audio.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = audio;
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const r = new MediaRecorder(audio, mime ? { mimeType: mime } : undefined);
      recorder.current = r;
      const chunks: Blob[] = [];
      let size = 0;
      r.ondataavailable = (e) => {
        chunks.push(e.data);
        size += e.data.size;
        if (size > 8 * 1024 * 1024 && r.state === "recording") r.stop();
      };
      r.onerror = () => {
        onError("Falha na gravação. Tente novamente ou digite.");
        if (r.state === "recording") r.stop();
      };
      r.onstop = async () => {
        release();
        if (!mounted.current) return;
        setRecording(false);
        setWorking(true);
        try {
          if (size > 8 * 1024 * 1024)
            throw Error("Áudio muito grande. Grave uma resposta mais curta.");
          const type = (r.mimeType || "audio/webm").split(";")[0];
          const ext =
            type === "audio/mp4"
              ? "mp4"
              : type === "audio/ogg"
                ? "ogg"
                : "webm";
          const form = new FormData();
          form.append("audio", new Blob(chunks, { type }), `resposta.${ext}`);
          const result = await api<{ text: string }>("offer/transcribe", form);
          if (mounted.current) onText(result.text);
        } catch (e) {
          if (mounted.current) onError((e as Error).message);
        } finally {
          if (mounted.current) {
            setWorking(false);
            onBusy(false);
          }
        }
      };
      r.start(1000);
      setRecording(true);
      setWorking(false);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch (e) {
      release();
      setWorking(false);
      onBusy(false);
      onError(
        (e as Error).name === "NotAllowedError"
          ? "Permissão do microfone negada. Libere o acesso ou digite sua resposta."
          : (e as Error).message,
      );
    }
  }
  return (
    <button
      type="button"
      className="secondary"
      disabled={working || (disabled && !recording)}
      onClick={() => (recording ? recorder.current?.stop() : void start())}
    >
      {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
      {recording
        ? "Parar e transcrever"
        : working
          ? "Transcrevendo…"
          : "Responder por voz"}
    </button>
  );
}
