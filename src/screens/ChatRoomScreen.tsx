import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Send, CheckCheck, Zap, Loader2, Image as ImageIcon } from 'lucide-react';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { uploadToR2 } from '../lib/r2';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    // Load Chat Info
    const loadChatInfo = async () => {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        let info: any = { ...data, id: chatDoc.id };

        if (!data.isGroup) {
          const otherId = data.participants.find((id: string) => id !== user.uid);
          if (otherId) {
            const userSnap = await getDoc(doc(db, 'users', otherId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              info = {
                ...info,
                name: userData.displayName || userData.username,
                username: userData.username,
                avatar: userData.photoURL || `https://ui-avatars.com/api/?name=${userData.username}`
              };
            }
          }
        } else {
          info = {
            ...info,
            name: data.groupName,
            username: data.username,
            avatar: data.groupAvatar
          };
        }
        setChatInfo(info);
      }
    };

    loadChatInfo();

    // Load messages
    const msgsQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(msgsQuery, (snapshot) => {
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
      if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].senderId !== user?.uid) {
        soundManager.playClick(); // Notification for received message
      }
    });

    return () => unsub();
  }, [chatId, user]);

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
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !chatId || !user) return;

    setIsUploading(true);
    soundManager.playClick();
    
    try {
      const publicUrl = await uploadToR2(file);
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        image: publicUrl,
        type: 'image',
        createdAt: serverTimestamp(),
        status: 'sent',
        avatar: profile?.photoURL || user.photoURL
      });

      soundManager.playSent();
    } catch (error) {
      console.error("Upload error:", error);
      soundManager.playAlert();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-4 justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-90 transition-transform"><ArrowLeft /></button>
          <div className="relative">
            <img src={chatInfo?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'} className="w-10 h-10 rounded-full object-cover border-2 border-white/10 shadow-sm" alt="Avatar" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-cyan-500 rounded-full border-2 border-slate-900" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold leading-tight text-white">{chatInfo?.name || 'Carregando...'}</h2>
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase font-black text-cyan-400 tracking-widest">{chatInfo?.online ? 'online' : 'sincronizado'}</span>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wide">@{chatInfo?.username || '...'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-indigo-400 active:scale-90"><Phone className="w-5 h-5" /></button>
          <button className="p-2 text-indigo-400 active:scale-90"><Video className="w-5 h-5" /></button>
          <button className="p-2 text-slate-500"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 mt-16 pb-24 p-4 flex flex-col gap-6 overflow-y-auto no-scrollbar">
        <div className="flex justify-center my-4">
          <span className="bg-white/5 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/5">Hoje</span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.type === 'sent' ? 'flex-row-reverse self-end' : 'flex-row self-start'}`}>
            <div className="flex-shrink-0 mt-auto">
              <img src={msg.avatar} className="w-8 h-8 rounded-xl object-cover border-2 border-white/10 shadow-sm" alt="Avatar" />
            </div>
            <div className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}>
              <div className={`
                p-4 rounded-3xl space-y-2 backdrop-blur-md border border-white/10 shadow-lg
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
                    <div className="relative aspect-video bg-black/40 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
                      <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=500&h=300&fit=crop" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30" alt="Video thumb" />
                      <button className="relative z-10 w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white shadow-xl">
                        <Zap className="w-6 h-6 fill-current" />
                      </button>
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] font-black">{msg.duration}</div>
                    </div>
                    <p className="text-xs font-bold text-slate-400">{msg.fileName}</p>
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
            accept="image/*" 
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
