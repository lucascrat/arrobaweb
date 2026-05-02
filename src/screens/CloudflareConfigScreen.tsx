import React, { useState } from 'react';
import { ArrowLeft, Cloud, Shield, Key, Globe, Save, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';

interface CloudflareConfigScreenProps {
  setScreen: (s: Screen) => void;
}

export const CloudflareConfigScreen: React.FC<CloudflareConfigScreenProps> = ({ setScreen }) => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans pb-24">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl flex items-center px-6 justify-between border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('profile')} className="p-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 text-white">
            <Cloud className="w-5 h-5 text-orange-400" />
            <h1 className="text-xl font-black tracking-tighter">Configuração R2</h1>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 space-y-8">
        <section className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-6">
          <div className="flex gap-4">
            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-sm">Atenção Necessária</h3>
              <p className="text-[10px] text-orange-200/60 font-black uppercase tracking-widest mt-1 leading-relaxed">
                As credenciais do Cloudflare R2 são segredos de infraestrutura. Por segurança, elas devem ser configuradas nas variáveis de ambiente (environment variables) da plataforma.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Passo a Passo</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 shadow-glass">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-sm text-white">Crie um Bucket R2</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">No console da Cloudflare, crie um bucket para arquivos públicos.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 shadow-glass">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-sm text-white">Gere tokens de API S3</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Vá em R2 {'>'} Manage R2 API Tokens e gere credenciais de leitura/escrita.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 shadow-glass">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-sm text-white">Habilite o Domínio Público</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configure um domínio customizado ou R2.dev no dashboard do seu bucket.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Variáveis Necessárias</h2>
          </div>

          <div className="space-y-3">
             {[
               { id: 'VITE_R2_PUBLIC_DOMAIN', desc: 'A URL base dos seus arquivos' },
               { id: 'R2_ACCESS_KEY_ID', desc: 'O Access Key da sua API S3' },
               { id: 'R2_SECRET_ACCESS_KEY', desc: 'O Secret Key da sua API S3' },
               { id: 'R2_ENDPOINT', desc: 'S3 API Endpoint (ex: accountid.r2.cloudflarestorage.com)' },
               { id: 'R2_BUCKET_NAME', desc: 'O nome exato do seu Bucket' }
             ].map((item) => (
                <div key={item.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group">
                  <div>
                    <h5 className="text-[9px] font-black font-mono text-indigo-400 uppercase tracking-widest">{item.id}</h5>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">{item.desc}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 transition-colors" />
                </div>
             ))}
          </div>
        </section>

        <div className="p-8 border border-dashed border-white/10 rounded-[2.5rem] bg-indigo-500/5 text-center">
            <Info className="w-10 h-10 text-indigo-500/40 mx-auto mb-4" />
            <h3 className="font-black text-white text-sm">Configuração Pronta no Servidor</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-2 leading-relaxed uppercase tracking-widest">
              O backend já está preparado para usar estas variáveis. Assim que você as adicionar nas Configurações do Projeto, os uploads passarão a usar o Cloudflare R2 automaticamente.
            </p>
            <a 
              href="https://dash.cloudflare.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-indigo-400 font-extrabold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
            >
              Abrir Cloudflare Console <ExternalLink className="w-3 h-3" />
            </a>
        </div>
      </main>
    </div>
  );
};
