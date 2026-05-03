import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Send, CheckCheck, Zap, Loader2, Image as ImageIcon, Download } from 'lucide-react';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { uploadToR2 } from '../lib/r2';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { AlertCircle, X } from 'lucide-react';

interface ChatRoomScreenProps {
  setScreen: (s: Screen) => void;
  chatId: string | null;
}

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ setScreen, chatId }) => {
  const { user, profile } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    });

    // Load messages
    const msgsQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
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
      if (newMsgs.length > 0) {
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg.senderId !== user?.uid) {
          soundManager.playClick();
          const isMentioned = lastMsg.text?.includes(`@${profile?.username}`);
          if (document.hidden || isMentioned) {
             if (Notification.permission === 'granted') {
               new Notification(isMentioned ? `MENCIONADO: ${chatInfo?.name}` : chatInfo?.name, {
                 body: lastMsg.text,
                 icon: chatInfo?.avatar
               });
             }
          }
        }
      }
    });

    return () => {
      unsubChat();
      unsubMsgs();
    };
  }, [chatId, user]);

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
    });

    return () => unsubOther();
  }, [chatInfo?.id, user?.uid]);

  // Typing status update logic
  useEffect(() => {
    if (!chatId || !user || !inputText) {
      if (chatId && user && typingTimeoutRef.current) {
        // Clear immediately if input is empty
        const chatRef = doc(db, 'chats', chatId);
        updateDoc(chatRef, {
          [`typing.${user.uid}`]: deleteField()
        }).catch(err => console.error("Error clearing typing state:", err));
      }
      return;
    }

    const chatRef = doc(db, 'chats', chatId);
    updateDoc(chatRef, {
      [`typing.${user.uid}`]: serverTimestamp()
    }).catch(err => console.error("Error setting typing state:", err));

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(chatRef, {
        [`typing.${user.uid}`]: deleteField()
      }).catch(err => console.error("Error clearing typing state:", err));
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

      soundManager.playSent();
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage("Falha no upload do arquivo. Verifique sua conexão.");
      soundManager.playAlert();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
          <button className="p-2 text-indigo-400 active:scale-90"><Phone className="w-5 h-5" /></button>
          <button className="p-2 text-indigo-400 active:scale-90"><Video className="w-5 h-5" /></button>
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
        <button className="text-slate-500 active:scale-95"><Smile className="w-6 h-6" /></button>
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
        <button 
          onClick={handleSend}
          className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-primary-glow active:scale-90 transition-transform"
        >
          <Send className="w-5 h-5 fill-current" />
        </button>
      </footer>
    </div>
  );
};
