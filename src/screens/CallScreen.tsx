import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'motion/react';
import { CallsClient } from '../lib/cloudflareCalls';
import { useAuth } from '../lib/AuthContext';
import { soundManager } from '../lib/sounds';

interface CallScreenProps {
  chatId: string;
  isReceiving?: boolean;
  isVideo?: boolean;
  onEndCall: () => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({ chatId, isReceiving, isVideo, onEndCall }) => {
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<CallsClient | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [callDuration, setCallDuration] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Start appropriate sound
    if (isReceiving) {
      soundManager.playRingtone();
    } else {
      soundManager.playCalling();
    }
    
    const client = new CallsClient(
      chatId, 
      user.uid, 
      (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      },
      () => {
        // Connected!
        soundManager.stopAll(); // Stop calling/ringtone sound
        soundManager.playSent(); // Quick feedback chime
        setCallDuration(0);
        timerRef.current = setInterval(() => {
          setCallDuration(prev => (prev !== null ? prev + 1 : 0));
        }, 1000);
      }
    );
    clientRef.current = client;

    if (isReceiving) {
      client.answerCall(localVideoRef.current as HTMLVideoElement, isVideo);
    } else {
      client.startCall(localVideoRef.current as HTMLVideoElement, isVideo);
    }

    return () => {
      soundManager.stopAll(); // Ensure sounds stop on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      client.endCall();
    };
  }, [chatId, isReceiving, isVideo, user]);

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    clientRef.current?.endCall();
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-4 overflow-hidden"
    >
      <div className="absolute inset-0 w-full h-full">
        {/* Remote Video Background */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
      </div>

      <div className="z-10 text-center mb-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-widest text-shadow-sm">Chamada de {isVideoOff ? 'Voz' : 'Vídeo'} {isReceiving ? 'Recebida' : 'em Andamento'}</h2>
        {callDuration === null ? (
          <p className="text-indigo-400 font-bold mt-2 animate-pulse">Conectando via Servidores Edge...</p>
        ) : (
          <p className="text-emerald-400 font-bold mt-2 text-xl font-mono">{formatDuration(callDuration)}</p>
        )}
      </div>

      <div className={`relative z-10 w-full max-w-sm aspect-[3/4] bg-slate-900 overflow-hidden rounded-[3rem] shadow-2xl border-4 border-white/10 transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}>
        {/* Local Video Mini */}
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform scale-x-[-1]" 
        />
      </div>

      <div className="fixed bottom-12 left-0 right-0 z-10 flex items-center justify-center gap-6">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border ${isMuted ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/10 border-white/20 text-white'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button 
          onClick={handleEndCall}
          className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg active:scale-90"
        >
          <PhoneOff className="w-8 h-8" />
        </button>
        <button 
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border ${isVideoOff ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/10 border-white/20 text-white'}`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
      </div>
    </motion.div>
  );
};
