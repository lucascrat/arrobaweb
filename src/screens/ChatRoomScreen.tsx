import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Send, Smile, Paperclip, Mic, Phone, Video, MoreVertical, Image as ImageIcon, Loader2, Square, X,
} from 'lucide-react';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2';

interface ChatRoomScreenProps {
  setScreen: (s: Screen) => void;
  chatId: string | null;
}

interface ChatRow {
  id: string;
  participants: string[];
  is_group: boolean;
  group_name: string | null;
  group_photo: string | null;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string | null;
  type: 'text' | 'image' | 'audio' | 'video' | 'system';
  media_url: string | null;
  reactions: Record<string, string[]> | null;
  status: 'sent' | 'delivered' | 'read';
  reply_to: string | null;
  created_at: string;
}

interface PartnerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
  online: boolean;
  last_seen: string | null;
}

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ setScreen, chatId }) => {
  const { user, profile } = useAuth();
  const [chat, setChat] = useState<ChatRow | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const cancelRecordRef = useRef(false);

  useEffect(() => {
    if (!chatId || !user) return;

    const load = async () => {
      const { data: chatData } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .maybeSingle();

      if (!chatData) return;
      setChat(chatData as ChatRow);

      if (!chatData.is_group) {
        const otherId = (chatData.participants as string[]).find((id: string) => id !== user.id);
        if (otherId) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, username, display_name, photo_url, online, last_seen')
            .eq('id', otherId)
            .maybeSingle();
          if (p) setPartner(p as PartnerProfile);
        }
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages((msgs as Message[]) || []);
    };

    load();

    const channel = supabase.channel(`chat:${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'arroba', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages(curr => [...curr, m]);
          if (m.sender_id !== user.id) {
            soundManager.playClick();
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'arroba', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages(curr => curr.map(x => x.id === m.id ? m : x));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const sendText = async () => {
    if (!user || !chatId || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        text,
        type: 'text',
        status: 'sent',
      });
      if (error) throw error;
      soundManager.playSent();
    } catch (err) {
      console.error(err);
      soundManager.playAlert();
    } finally {
      setSending(false);
    }
  };

  const sendMedia = async (file: File, type: 'image' | 'audio' | 'video') => {
    if (!user || !chatId) return;
    setUploading(true);
    try {
      const url = await uploadToR2(file);
      if (!url) throw new Error('Upload returned empty URL');
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        type,
        media_url: url,
        status: 'sent',
      });
      if (error) throw error;
      soundManager.playSent();
    } catch (err) {
      console.error(err);
      soundManager.playAlert();
    } finally {
      setUploading(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
    sendMedia(file, type);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Gravação de áudio ─────────────────────────────────────────────────────
  const pickAudioMime = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m;
    }
    return '';
  };

  const startRecording = async () => {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Seu navegador não permite acesso ao microfone.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickAudioMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      cancelRecordRef.current = false;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        // libera o microfone
        stream.getTracks().forEach(t => t.stop());
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        setRecording(false);
        setRecordSeconds(0);

        if (cancelRecordRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (chunks.length === 0) return;

        const blobType = mr.mimeType || mime || 'audio/webm';
        const ext = blobType.includes('mp4') ? 'm4a'
          : blobType.includes('ogg') ? 'ogg'
          : 'webm';
        const blob = new Blob(chunks, { type: blobType });
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: blobType });
        sendMedia(file, 'audio');
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds(s => {
          // limite de segurança: 5 minutos
          if (s >= 300) {
            mr.stop();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[chat] erro ao iniciar gravação:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    cancelRecordRef.current = false;
    mr.stop();
  };

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    cancelRecordRef.current = true;
    mr.stop();
  };

  // libera mic se desmontar a tela durante gravação
  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        cancelRecordRef.current = true;
        try { mr.stop(); } catch {}
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    };
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const headerName = chat?.is_group ? (chat.group_name || 'Grupo') : (partner?.display_name || partner?.username || 'Conversa');
  const headerAvatar = chat?.is_group
    ? (chat.group_photo || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`)
    : (partner?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner?.id || 'anon'}`);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 flex items-center px-4 gap-3 z-40">
        <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <img src={headerAvatar} className="w-10 h-10 rounded-full object-cover border border-white/10" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">{headerName}</p>
          {!chat?.is_group && partner && (
            <p className="text-[10px] text-emerald-400 font-bold">{partner.online ? 'online' : 'offline'}</p>
          )}
        </div>
        <button className="p-2 text-slate-400"><Phone className="w-5 h-5" /></button>
        <button className="p-2 text-slate-400"><Video className="w-5 h-5" /></button>
        <button className="p-2 text-slate-400"><MoreVertical className="w-5 h-5" /></button>
      </header>

      <main ref={scrollRef} className="flex-1 mt-16 mb-20 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-600">
            <p className="text-xs font-black uppercase tracking-widest">Comece a conversa</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === user?.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  mine
                    ? 'bg-indigo-500 text-white rounded-br-md'
                    : 'bg-white/5 text-slate-100 border border-white/10 rounded-bl-md'
                }`}>
                  {m.type === 'image' && (
                    m.media_url
                      ? <a href={m.media_url} target="_blank" rel="noreferrer">
                          <img
                            src={m.media_url}
                            className="w-full max-w-xs rounded-xl mb-1"
                            alt="imagem"
                            onError={(e) => {
                              const img = e.currentTarget;
                              console.error('[chat] image failed to load:', m.media_url);
                              img.style.display = 'none';
                              const fallback = document.createElement('p');
                              fallback.textContent = '⚠️ imagem não carregou';
                              fallback.className = 'text-xs italic opacity-70';
                              img.parentElement?.appendChild(fallback);
                            }}
                          />
                        </a>
                      : <p className="text-sm italic opacity-70">[imagem]</p>
                  )}
                  {m.type === 'video' && (
                    m.media_url
                      ? <video
                          src={m.media_url}
                          controls
                          className="w-full max-w-xs rounded-xl mb-1"
                          onError={() => console.error('[chat] video failed to load:', m.media_url)}
                        />
                      : <p className="text-sm italic opacity-70">[vídeo]</p>
                  )}
                  {m.type === 'audio' && (
                    m.media_url
                      ? <audio src={m.media_url} controls className="max-w-full" />
                      : <p className="text-sm italic opacity-70">[áudio]</p>
                  )}
                  {m.type === 'text' && m.text && (
                    <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                  )}
                  <p className={`text-[9px] font-bold mt-1 ${mine ? 'text-white/60' : 'text-slate-500'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 p-3 flex items-center gap-2 z-40">
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />

        {recording ? (
          <>
            <button
              onClick={cancelRecording}
              className="w-10 h-10 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white font-mono">{fmtTime(recordSeconds)}</span>
              <span className="text-xs text-slate-400 ml-2">Gravando...</span>
            </div>
            <button
              onClick={stopRecording}
              className="w-10 h-10 bg-red-500 text-white rounded-2xl flex items-center justify-center"
              title="Enviar áudio"
            >
              <Send className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400"
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
              placeholder="Mensagem..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white outline-none text-sm"
            />
            {input.trim() ? (
              <button onClick={sendText} disabled={sending}
                className="w-10 h-10 bg-indigo-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={uploading}
                className="w-10 h-10 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center active:scale-90 disabled:opacity-50"
                title="Gravar áudio"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </footer>
    </div>
  );
};
