import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Send, CheckCheck, Zap, Loader2, Image as ImageIcon, Download, Mic, Square, Play, Pause } from 'lucide-react';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { uploadToR2 } from '../lib/r2';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { AlertCircle, X } from 'lucide-react';
import { CallScreen } from './CallScreen';

interface ChatRoomScreenProps {
  setScreen: (s: Screen) => void;
  chatId: string | null;
}

const VoiceMessage: React.FC<{ src: string; duration?: number }> = ({ src, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 min-w-[220px]">
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={onTimeUpdate} 
        onEnded={onEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        className="hidden" 
      />
      <button 
        onClick={togglePlayback}
        className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-400"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400">{formatTime(currentTime)}</span>
          <span className="text-[10px] font-bold text-indigo-400">{duration ? formatTime(duration) : 'Áudio'}</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center gap-0.5">
         {[...Array(4)].map((_, i) => (
           <motion.div 
             key={i}
             className="w-1 bg-indigo-400/40 rounded-full"
             animate={{ 
               height: isPlaying ? [4, 12, 6, 10][i] : 4 
             }}
             transition={{ 
               repeat: Infinity, 
               duration: 0.5, 
               delay: i * 0.1 
             }}
           />
         ))}
      </div>
    </div>
  );
};

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ setScreen, chatId }) => {
  const { user, profile } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{ isReceiving: boolean; isVideo?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingDurationRef = useRef<number>(0);
  const recordingStartTimeRef = useRef<number>(0);
  const isInitializingRecordingRef = useRef<boolean>(false);
  const chatInfoRef = useRef<any>(null);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (!chatId || !user) return;

    // Load Chat Info and Typing Status
    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (chatSnapshot) => {
      if (chatSnapshot.exists()) {
        const data = chatSnapshot.data();
        let info: any = { ...data, id: chatSnapshot.id };
        
        if (data.isGroup) {
          info = {
            ...info,
            name: data.groupName,
            username: data.username,
            avatar: data.groupAvatar
          };
        }
        setChatInfo(info);
        chatInfoRef.current = info;

        // Handle Typing Users
        if (data.typing) {
          const now = Date.now();
          const typingIds = Object.keys(data.typing).filter(uid => {
            if (uid === user.uid) return false;
            try {
              const ts = data.typing[uid]?.toMillis();
              return ts && (now - ts < 10000);
            } catch {
              return true; 
            }
          });
          setTypingUsers(typingIds);
        } else {
          setTypingUsers([]);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    // Load messages - Only start if chatInfo is available to avoid permission errors on non-existing chats
    let unsubMsgs = () => {};
    if (chatInfo) {
      const msgsQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
      );

      let isFirstLoadMsgs = true;

      unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
        const newMsgs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            type: data.senderId === user?.uid ? 'sent' : 'received',
            time: data.createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
          } as any;
        });
        setMessages(newMsgs);

        if (!isFirstLoadMsgs) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const addedMsg = change.doc.data();
              if (addedMsg.senderId !== user?.uid) {
                soundManager.playChime();
                
                const isMentioned = addedMsg.text?.includes(`@${profile?.username}`);
                
                if (profile?.notificationSettings?.pushEnabled !== false) {
                  let canNotify = false;
                  try {
                    canNotify = 'Notification' in window && Notification.permission === 'granted';
                  } catch(e) {}
                  if ((document.hidden || isMentioned) && canNotify) {
                      try {
                        const chatName = chatInfoRef.current?.name || chatInfoRef.current?.username || 'Nova Mensagem';
                        new Notification(isMentioned ? `MENCIONADO em ${chatName}` : chatName, {
                          body: addedMsg.text || 'Nova mensagem de voz ou arquivo',
                          icon: chatInfoRef.current?.avatar
                        });
                      } catch (e) {
                        console.warn('Notifications not supported in this environment', e);
                      }
                  }
                }
              }
            }
          });
        }
        isFirstLoadMsgs = false;
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
      });
    }

    // Listen for Incoming Calls
    const callRef = doc(db, 'calls', chatId);
    const unsubCall = onSnapshot(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.callerId && data.callerId !== user.uid && !data.endedAt) {
          // It's an incoming call!
          setActiveCall({ isReceiving: true, isVideo: data.isVideo });
        }
      }
    }, (error) => {
      // Ignore permission errors for non-existent call docs
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, `calls/${chatId}`);
      }
    });

    return () => {
      unsubChat();
      if (unsubMsgs) unsubMsgs();
      unsubCall();
    };
  }, [chatId, user, chatInfo ? true : false]); // Re-run when chatInfo exists

  const startCall = (isVideo: boolean) => {
    setActiveCall({ isReceiving: false, isVideo });
  };

  // Separate effect for other user in private chat
  useEffect(() => {
    if (!chatInfo || chatInfo.isGroup || !user) return;

    const otherId = chatInfo.participants?.find((id: string) => id !== user.uid);
    if (!otherId) return;

    const unsubOther = onSnapshot(doc(db, 'users', otherId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOtherUser({
          id: snap.id,
          ...data,
          name: data.displayName || data.username,
          avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.username}`
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${otherId}`);
    });

    return () => unsubOther();
  }, [chatInfo?.id, user?.uid]);

  // Typing status update logic
  const lastTypingUpdateRef = useRef<number>(0);
  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, 'chats', chatId);

    if (!inputText) {
      if (lastTypingUpdateRef.current > 0) {
        updateDoc(chatRef, {
          [`typing.${user.uid}`]: deleteField()
        }).catch(err => console.error("Error clearing typing state:", err));
        lastTypingUpdateRef.current = 0;
      }
      return;
    }

    const now = Date.now();
    if (now - lastTypingUpdateRef.current > 3000) { // Update every 3 seconds while typing
      updateDoc(chatRef, {
        [`typing.${user.uid}`]: serverTimestamp()
      }).catch(err => console.error("Error setting typing state:", err));
      lastTypingUpdateRef.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(chatRef, {
        [`typing.${user.uid}`]: deleteField()
      }).catch(err => {
        // If chat was deleted or permissions changed, ignore
        if (err.code !== 'permission-denied') console.error("Error clearing typing state:", err);
      });
      lastTypingUpdateRef.current = 0;
    }, 5000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [inputText, chatId, user]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatId || !user) return;
    
    const text = inputText;
    setInputText('');
    soundManager.playSent();

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp(),
        status: 'sent',
        avatar: profile?.photoURL || user.photoURL
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Trigger Push Notification for the recipient
      if (chatInfo && !chatInfo.isGroup) {
        const otherId = chatInfo.participants?.find((id: string) => id !== user.uid);
        if (otherId) {
          const { sendPushNotification } = await import('../lib/notifications');
          sendPushNotification(
            otherId, 
            profile?.username || 'Nova Mensagem', 
            text,
            { chatId }
          );
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setErrorMessage("Erro ao enviar mensagem. Tente novamente.");
      soundManager.playAlert();
      setInputText(text); // Restore text on fail
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId || !user) return;

    setIsUploading(true);
    soundManager.playClick();
    
    try {
      const publicUrl = await uploadToR2(file);
      
      const fileCategory = file.type.split('/')[0];
      const contentType = fileCategory === 'image' ? 'image' : (fileCategory === 'video' ? 'video' : 'file');
      
      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          senderId: user.uid,
          [contentType]: publicUrl,
          contentType,
          fileName: file.name,
          fileSize: file.size,
          createdAt: serverTimestamp(),
          status: 'sent',
          avatar: profile?.photoURL || user.photoURL
        });

        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: `Arquivo: ${file.name}`,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Trigger Push Notification
        if (chatInfo && !chatInfo.isGroup) {
          const otherId = chatInfo.participants?.find((id: string) => id !== user.uid);
          if (otherId) {
            const { sendPushNotification } = await import('../lib/notifications');
            sendPushNotification(
              otherId, 
              profile?.username || 'Nova Mensagem', 
              `Enviou um(a) ${contentType}`,
              { chatId }
            );
          }
        }

        soundManager.playSent();
      } catch (fsError) {
        console.error("Firestore error after file upload:", fsError);
        handleFirestoreError(fsError, OperationType.CREATE, `chats/${chatId}/messages`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setErrorMessage(error.message || "Falha no upload do arquivo. Verifique sua conexão.");
      soundManager.playAlert();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    if (isInitializingRecordingRef.current || isRecording) return;
    isInitializingRecordingRef.current = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStartTimeRef.current = Date.now();
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const now = Date.now();
        const finalDuration = (now - recordingStartTimeRef.current) / 1000;
        
        // Defensive check: if duration logic fails or is too short
        if (finalDuration < 0.2 && audioChunksRef.current.length === 0) {
          // Recording truly too short and no data
          stream.getTracks().forEach(track => track.stop());
          clearInterval(recordingTimerRef.current as NodeJS.Timeout);
          setRecordingDuration(0);
          recordingDurationRef.current = 0;
          setIsRecording(false);
          setErrorMessage("Gravação muito curta.");
          soundManager.playAlert();
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Ensure stream is stopped
        stream.getTracks().forEach(track => track.stop());
        
        clearInterval(recordingTimerRef.current as NodeJS.Timeout);
        setRecordingDuration(0);
        recordingDurationRef.current = 0;
        setIsRecording(false);
        setIsUploading(true);

        try {
          const publicUrl = await uploadToR2(audioFile);
          
          try {
            await addDoc(collection(db, 'chats', chatId!, 'messages'), {
              senderId: user.uid,
              audio: publicUrl,
              contentType: 'audio',
              fileName: audioFile.name,
              fileSize: audioFile.size,
              duration: Math.max(1, Math.round(finalDuration)),
              createdAt: serverTimestamp(),
              status: 'sent',
              avatar: profile?.photoURL || user.photoURL
            });

            await updateDoc(doc(db, 'chats', chatId!), {
              lastMessage: `🎤 Áudio`,
              lastMessageAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });

            // Trigger Push Notification
            if (chatInfo && !chatInfo.isGroup) {
              const otherId = chatInfo.participants?.find((id: string) => id !== user.uid);
              if (otherId) {
                const { sendPushNotification } = await import('../lib/notifications');
                sendPushNotification(
                  otherId, 
                  profile?.username || 'Nova Mensagem', 
                  `🎤 Mensagem de áudio`,
                  { chatId }
                );
              }
            }

            soundManager.playSent();
          } catch (fsError) {
            console.error("Firestore error after audio upload:", fsError);
            handleFirestoreError(fsError, OperationType.CREATE, `chats/${chatId}/messages`);
          }
        } catch (error) {
           console.error("Audio Upload error:", error);
           setErrorMessage("Erro ao enviar áudio. Verifique sua conexão.");
           // Do NOT call handleFirestoreError here as it's not a Firestore error
        } finally {
           setIsUploading(false);
        }
      };

      try {
        mediaRecorder.start(200);
      } catch (err: any) {
        mediaRecorder.start(); // Fallback for browsers that don't support timeslice like Safari
      }
      setIsRecording(true);
      recordingDurationRef.current = 0;
      soundManager.playClick();
      
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds++;
        recordingDurationRef.current = seconds;
        setRecordingDuration(seconds);
      }, 1000);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setErrorMessage("Permissão de microfone negada ou não suportada nesta versão.");
      soundManager.playAlert();
    } finally {
      isInitializingRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Disable the onstop handler so it doesn't upload
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      clearInterval(recordingTimerRef.current as NodeJS.Timeout);
      setIsRecording(false);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!chatId || !user) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    const msg = messages.find(m => m.id === messageId);
    const currentReactions = msg?.reactions || {};
    
    const newReactions = { ...currentReactions };
    if (newReactions[user.uid] === emoji) {
      delete newReactions[user.uid];
    } else {
      newReactions[user.uid] = emoji;
    }

    try {
      await updateDoc(msgRef, { reactions: newReactions });
      soundManager.playClick();
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
    setActiveReactionMessageId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-[100] bg-red-500/90 backdrop-blur-xl border border-red-500/50 p-4 rounded-2xl flex items-center justify-between shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-white" />
              <p className="text-xs font-bold text-white">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-4 justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-90 transition-transform"><ArrowLeft /></button>
          <div className="relative">
            <img 
              src={(chatInfo?.isGroup ? chatInfo?.avatar : otherUser?.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'} 
              className="w-10 h-10 rounded-full object-cover border-2 border-white/10 shadow-sm" 
              alt="Avatar" 
            />
            {!chatInfo?.isGroup && otherUser?.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold leading-tight text-white">
                {chatInfo?.isGroup ? chatInfo?.groupName : (otherUser?.name || '...')}
              </h2>
              {!chatInfo?.isGroup && otherUser?.online && (
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${typingUsers.length > 0 ? 'bg-indigo-400 animate-pulse' : 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.5)]'}`} title={typingUsers.length > 0 ? "Digitando..." : "Online"} />
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 tracking-wide">
                {chatInfo?.isGroup ? `Grupo • ${chatInfo?.participants?.length || 0} membros` : `@${otherUser?.username || '...'}`}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => startCall(false)} className="p-2 text-indigo-400 active:scale-90"><Phone className="w-5 h-5" /></button>
          <button onClick={() => startCall(true)} className="p-2 text-indigo-400 active:scale-90"><Video className="w-5 h-5" /></button>
          <button className="p-2 text-slate-500"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </header>

      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-16 left-0 right-0 z-40 overflow-hidden"
          >
            <div className="bg-indigo-500/10 backdrop-blur-md border-b border-indigo-500/20 py-1.5 px-4 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">
                {typingUsers.length === 1 ? 'Alguém está digitando...' : 'Várias pessoas digitando...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 mt-16 pb-24 p-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
        <div className="flex justify-center my-4">
          <span className="bg-white/5 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/5">Hoje</span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.type === 'sent' ? 'flex-row-reverse self-end' : 'flex-row self-start'}`}>
            <div className="flex-shrink-0 mt-auto">
              <img src={msg.avatar} className="w-8 h-8 rounded-xl object-cover border-2 border-white/10 shadow-sm" alt="Avatar" />
            </div>
            <div className={`flex flex-col relative ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}>
              {activeReactionMessageId === msg.id && (
                <div className={`absolute -top-10 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex gap-2 z-50 shadow-2xl animate-in fade-in zoom-in duration-200 ${msg.type === 'sent' ? 'right-0' : 'left-0'}`}>
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(msg.id, emoji);
                      }}
                      className="hover:scale-150 active:scale-90 transition-transform text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <div 
                onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                className={`
                p-4 rounded-3xl space-y-2 backdrop-blur-md border border-white/10 shadow-lg cursor-pointer transition-all active:scale-[0.98]
                ${msg.type === 'sent' ? 'bg-indigo-500/80 text-white rounded-tr-none' : 'bg-white/5 text-slate-100 rounded-tl-none' }
              `}>
                {msg.text && <p className="text-sm font-medium leading-relaxed">{msg.text}</p>}
                {msg.image && (
                  <div className="space-y-2">
                    <img src={msg.image} className="rounded-2xl w-full object-cover border border-white/10" alt="Shared" />
                    {msg.caption && <p className="text-xs font-bold leading-relaxed text-slate-300">{msg.caption}</p>}
                  </div>
                )}
                {msg.video && (
                  <div className="space-y-2">
                    <video 
                      src={msg.video} 
                      controls 
                      className="rounded-2xl w-full max-h-64 bg-black border border-white/10" 
                    />
                    {msg.fileName && <p className="text-[10px] font-bold text-slate-400 truncate">{msg.fileName}</p>}
                  </div>
                )}
                {msg.audio && (
                  <VoiceMessage src={msg.audio} duration={msg.duration} />
                )}
                {msg.file && (
                  <div className="flex items-center gap-3 p-2 bg-white/10 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-white">{msg.fileName || 'Arquivo'}</p>
                      <p className="text-[10px] font-medium text-slate-400">{msg.fileSize ? `${(msg.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Tamanho desconhecido'}</p>
                    </div>
                    <a 
                      href={msg.file} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/10 rounded-lg text-indigo-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                )}
                
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 flex-wrap pt-1">
                    {Array.from(new Set(Object.values(msg.reactions))).map((emoji: any) => {
                      const count = Object.values(msg.reactions).filter(e => e === emoji).length;
                      return (
                        <div key={emoji} className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10 text-[10px]">
                          <span>{emoji}</span>
                          {count > 1 && <span className="font-bold opacity-80">{count}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-bold ${msg.type === 'sent' ? 'mr-1' : 'ml-1'}`}>
                <span>{msg.time}</span>
                {msg.type === 'sent' && (
                  <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-indigo-400' : 'text-slate-600'}`} />
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 h-20 bg-slate-900/40 backdrop-blur-2xl border-t border-white/5 px-4 flex items-center gap-3 z-50 shadow-2xl">
        {!isRecording && <button className="text-slate-500 active:scale-95"><Smile className="w-6 h-6" /></button>}
        
        {isRecording ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex items-center justify-between bg-white/5 border border-red-500/30 rounded-full py-2 px-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-sm font-bold text-red-100">{formatDuration(recordingDuration)}</span>
            </div>
            <button 
              onClick={cancelRecording}
              className="text-slate-400 hover:text-red-400 transition-colors p-2"
            >
              Cancelar
            </button>
          </motion.div>
        ) : (
          <div className="flex-1 relative">
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isUploading}
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-5 text-sm font-medium text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/50 outline-none disabled:opacity-50" 
              placeholder={isUploading ? "Enviando arquivo..." : "Digite sua mensagem..."} 
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
          </div>
        )}

        {inputText.trim() || isRecording ? (
          <button 
            onClick={isRecording ? stopRecording : handleSend}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-primary-glow active:scale-90 transition-transform ${isRecording ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-indigo-500 text-white'}`}
          >
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Send className="w-5 h-5 fill-current" />}
          </button>
        ) : (
          <button 
            onClick={startRecording}
            className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-primary-glow active:scale-90 transition-transform"
          >
            <Mic className="w-5 h-5 fill-current" />
          </button>
        )}
      </footer>

      {activeCall && (
        <CallScreen 
          chatId={chatId} 
          isReceiving={activeCall.isReceiving} 
          isVideo={activeCall.isVideo}
          onEndCall={() => setActiveCall(null)} 
        />
      )}
    </div>
  );
};
