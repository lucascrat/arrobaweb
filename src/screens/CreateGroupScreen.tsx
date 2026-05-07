import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, ChevronRight, AtSign, Check, Loader2 } from 'lucide-react';
import { Screen } from '../types';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { soundManager } from '../lib/sounds';

interface CreateGroupScreenProps {
  setScreen: (s: Screen) => void;
}

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ setScreen }) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupUsername, setGroupUsername] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, photo_url')
          .neq('id', user.id)
          .limit(50);
        setUsers((data || []).map((u: any) => ({
          id: u.id,
          uid: u.id,
          username: u.username,
          displayName: u.display_name,
          photoURL: u.photo_url,
        })));
      } catch (error) {
        console.error('fetch users', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user?.id]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    soundManager.playClick();
    try {
      const { uploadToR2 } = await import('../lib/r2');
      const publicUrl = await uploadToR2(file);
      setGroupAvatar(publicUrl);
      soundManager.playChime();
    } catch (error) {
      console.error("Group avatar upload error:", error);
      soundManager.playAlert();
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
    soundManager.playClick();
  };

  const handleGroupNameChange = (name: string) => {
    setGroupName(name);
    // Auto-suggest username if it hasn't been manually tweaked significantly or is empty
    const slug = name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^-+|-+$/g, '');
    
    setGroupUsername(slug);
  };

  const handleUsernameChange = (val: string) => {
    // Only allow URL friendly characters
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setGroupUsername(clean);
  };

  const handleCreateGroup = async () => {
    if (!groupName || selectedUserIds.length === 0 || !user) return;

    setIsCreating(true);
    try {
      soundManager.playChime();
      const participants = [user.id, ...selectedUserIds];
      const { data, error } = await supabase
        .from('chats')
        .insert({
          participants,
          is_group: true,
          group_name: groupName,
          group_photo: groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`,
          created_by: user.id,
          last_message_text: 'Grupo criado',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        await supabase.from('messages').insert({
          chat_id: data.id,
          sender_id: user.id,
          text: `${user.displayName || 'Um administrador'} criou o grupo "${groupName}"`,
          type: 'system',
          status: 'sent',
        });
      }

      setScreen('chat-list');
    } catch (error) {
      console.error('create group', error);
      soundManager.playAlert();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-32 overflow-x-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-4 justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-95 transition-all"><X /></button>
          <h1 className="text-xl font-black tracking-tighter text-white">Novo Grupo</h1>
        </div>
      </header>

      <main className="pt-24 px-6 flex flex-col gap-10">
        <section className="w-full flex flex-col items-center gap-10">
          <div className="relative group">
            <div 
              onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
              className="w-24 h-24 rounded-[2rem] bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-glass cursor-pointer overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              ) : groupAvatar ? (
                <img src={groupAvatar} className="w-full h-full object-cover" alt="Group" />
              ) : (
                <Camera className="w-10 h-10 text-slate-500" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-indigo-500 text-white p-2.5 rounded-xl shadow-primary-glow border-2 border-slate-950"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
            />
          </div>

          <div className="w-full space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">Nome do Grupo</label>
              <div className="h-16 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center focus-within:border-indigo-500/30 transition-all shadow-glass">
                <input 
                  value={groupName}
                  onChange={(e) => handleGroupNameChange(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 w-full text-white font-bold placeholder-slate-600 outline-none" 
                  placeholder="Ex: Galera do Design" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-4">@username do Grupo</label>
              <div className="h-16 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 focus-within:border-indigo-500/30 transition-all shadow-glass">
                <AtSign className="w-5 h-5 text-indigo-500" />
                <input 
                  value={groupUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 w-full text-white font-black placeholder-slate-600 outline-none uppercase" 
                  placeholder="churrasco_fds" 
                />
              </div>
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-white/5" />

        <section className="w-full space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xl font-black text-white tracking-tight">Convidar amigos</h2>
            <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-indigo-500/30">
              {selectedUserIds.length} selecionados
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((contact) => (
                <label 
                  key={contact.id} 
                  className={`flex items-center justify-between p-4 glass-card border cursor-pointer transition-all active:scale-[0.98] ${selectedUserIds.includes(contact.uid) ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={contact.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.displayName || contact.username)}`} className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shadow-sm" alt={contact.displayName} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-white leading-none">{contact.displayName || contact.username}</h4>
                      <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">@{contact.username}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={selectedUserIds.includes(contact.uid)}
                      onChange={() => toggleUser(contact.uid)}
                      className="peer w-6 h-6 rounded-full border-white/10 bg-white/5 checked:bg-indigo-500 checked:border-indigo-500 transition-all cursor-pointer appearance-none" 
                    />
                    <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-all pointer-events-none" strokeWidth={4} />
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/60 backdrop-blur-3xl border-t border-white/5 z-50 flex justify-center shadow-2xl">
        <button 
          onClick={handleCreateGroup}
          disabled={isCreating || !groupName || selectedUserIds.length === 0}
          className={`w-full max-w-sm bg-indigo-500 text-white font-black py-5 rounded-3xl shadow-primary-glow flex items-center justify-center gap-3 active:scale-95 transition-all text-xs uppercase tracking-widest ${isCreating || !groupName || selectedUserIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCreating ? 'Sincronizando Grupo...' : 'Criar Grupo'} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
