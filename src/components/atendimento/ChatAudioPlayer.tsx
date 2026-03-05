interface ChatAudioPlayerProps {
  src: string;
  outgoing: boolean;
}

export default function ChatAudioPlayer({ src }: ChatAudioPlayerProps) {
  return (
    <audio controls preload="metadata" className="max-w-[240px] h-8">
      <source src={src} />
      Seu navegador não suporta áudio.
    </audio>
  );
}
