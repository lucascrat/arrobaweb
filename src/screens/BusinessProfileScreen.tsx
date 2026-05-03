import React from 'react';
import { ArrowLeft, Search, MoreVertical, Mail, Phone, Verified, History, MapPin, Grid, ShoppingBag } from 'lucide-react';
import { Screen } from '../types';

interface BusinessProfileScreenProps {
  setScreen: (s: Screen) => void;
}

export const BusinessProfileScreen: React.FC<BusinessProfileScreenProps> = ({ setScreen }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24">
      <header className="fixed top-0 w-full z-50 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex justify-between items-center px-4 h-16 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-95">
            <ArrowLeft className="w-6 h-6 text-indigo-400" />
          </button>
          <span className="font-bold text-lg tracking-tight text-white">FashionStore</span>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-6 h-6 text-slate-400" />
          <MoreVertical className="w-6 h-6 text-slate-400" />
        </div>
      </header>

      <main className="mt-16 max-w-2xl mx-auto w-full">
        <section className="relative">
          <div className="h-48 md:h-64 w-full overflow-hidden">
            <img src="https://images.unsplash.com/photo-1541339907198-e08759df9a73?w=800&h=400&fit=crop" className="w-full h-full object-cover" alt="Store Cover" />
          </div>
          <div className="px-4 relative -mt-12 flex justify-between items-end">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-950 overflow-hidden bg-slate-900 shadow-lg">
                <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-4xl font-black">F</div>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <button className="p-3 rounded-full border-2 border-white/10 text-slate-400 hover:bg-white/5 active:scale-90 transition-all">
                <Mail className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full border-2 border-white/10 text-slate-400 hover:bg-white/5 active:scale-90 transition-all">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white">FashionStore</h1>
            <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Verified className="w-3 h-3 fill-current" /> Business
            </span>
          </div>
          <p className="text-sm font-bold text-indigo-400">@FashionStore</p>
          <p className="mt-3 text-sm text-slate-400 font-medium leading-relaxed">
            Curating the finest contemporary silhouettes for the modern individual. Ethical sourcing, premium fabrics, and timeless design. ✨
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-[11px] font-bold text-slate-500">
              <History className="w-4 h-4" />
              <span>Open until 9:00 PM</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-[11px] font-bold text-slate-500">
              <MapPin className="w-4 h-4" />
              <span>Milan, Italy</span>
            </div>
          </div>

          <button onClick={() => setScreen('catalog')} className="w-full mt-6 py-4 bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-primary-glow active:scale-[0.98] transition-transform">
            <Grid className="w-5 h-5" /> Ver Catálogo
          </button>
        </section>

        <section className="px-4 mt-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-white">Top Products</h2>
            <button className="text-indigo-400 text-xs font-bold uppercase tracking-wider">View All</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 row-span-2 relative rounded-3xl overflow-hidden aspect-square group shadow-sm transition-all border border-white/5">
              <img src="https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&h=600&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Product" />
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white font-bold text-sm">Summer Collection '24</p>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-square group shadow-sm transition-all border border-white/5 bg-white/5">
              <img src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Product" />
              <div className="absolute bottom-2 left-2 bg-indigo-500/90 text-white backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">$240.00</div>
            </div>
            <div className="relative rounded-3xl overflow-hidden aspect-square group shadow-sm transition-all border border-white/5 bg-white/5">
              <img src="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Product" />
              <div className="absolute bottom-2 left-2 bg-indigo-500/90 text-white backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black shadow-sm">$185.00</div>
            </div>
          </div>
        </section>

        <section className="px-4 mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <History className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white">Opening Hours</h3>
            </div>
            <ul className="space-y-2 text-xs font-bold text-slate-500">
              <li className="flex justify-between"><span>Mon - Fri</span><span className="text-white">9:00 - 21:00</span></li>
              <li className="flex justify-between"><span>Saturday</span><span className="text-white">10:00 - 18:00</span></li>
              <li className="flex justify-between text-red-400 italic"><span>Sunday</span><span>Closed</span></li>
            </ul>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white">Location</h3>
            </div>
            <div className="rounded-2xl overflow-hidden h-24 mb-3 grayscale brightness-50 opacity-60">
              <img src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=400&h=200&fit=crop" className="w-full h-full object-cover" alt="Map" />
            </div>
            <p className="text-xs font-bold text-slate-500">Via della Spiga, 26, 20121 Milano MI, Italy</p>
          </div>
        </section>
      </main>
    </div>
  );
};
