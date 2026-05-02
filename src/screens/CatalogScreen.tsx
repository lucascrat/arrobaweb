import React from 'react';
import { ArrowLeft, Search, ShoppingCart, ShoppingBag, Plus, Star } from 'lucide-react';
import { Screen } from '../types';

interface CatalogScreenProps {
  setScreen: (s: Screen) => void;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ setScreen }) => {
  const products = [
    { id: 1, name: 'Silk Lavender Midi', price: 299.90, brand: '@FashionStore Premium', tag: 'New', image: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=400&h=600&fit=crop' },
    { id: 2, name: 'Structured Tote', price: 450.00, brand: '@FashionStore Luxe', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=600&fit=crop' },
    { id: 3, name: 'Urban Violet Sneakers', price: 189.90, originalPrice: 240.00, brand: '@FashionStore Active', tag: '-20%', image: 'https://images.unsplash.com/photo-1541339907198-e08759df9a73?w=400&h=600&fit=crop' },
    { id: 4, name: 'Orbit Gold Pendant', price: 120.00, brand: '@FashionStore Ornaments', image: 'https://images.unsplash.com/photo-1535633302703-107691ef4528?w=400&h=600&fit=crop' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-4 h-16 shadow-sm">
        <button onClick={() => setScreen('business-profile')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors active:scale-90">
          <ArrowLeft className="w-6 h-6 text-slate-500" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-extrabold text-primary tracking-tighter">Arroba</h1>
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Catalog</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50"><Search className="w-5 h-5 text-slate-500" /></button>
          <button className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 active:scale-90">
            <ShoppingCart className="w-5 h-5 text-slate-500" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[9px] font-black flex items-center justify-center rounded-full">2</span>
          </button>
        </div>
      </header>

      <main className="pt-16 pb-24">
        <section className="p-4">
          <div className="relative w-full h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-primary-container to-primary p-6 flex flex-col justify-center shadow-lg group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12 transition-transform group-hover:scale-110">
              <ShoppingBag className="w-40 h-40 text-black fill-current" />
            </div>
            <h2 className="text-2xl font-black text-white z-10 leading-none mb-1">Ofertas da Semana</h2>
            <p className="text-white/80 font-bold text-xs uppercase tracking-widest z-10">em @FashionStore</p>
          </div>
        </section>

        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar mb-6">
          {['All Styles', "Summer '24", 'Accessories', 'Premium'].map((filter, i) => (
            <button key={filter} className={`
              px-6 py-2.5 rounded-full font-bold text-xs whitespace-nowrap transition-all
              ${i === 0 ? 'bg-primary text-white shadow-primary-glow scale-105' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}
            `}>
              {filter}
            </button>
          ))}
        </div>

        <section className="px-4">
          <div className="grid grid-cols-2 gap-4">
            {products.map((prod) => (
              <div key={prod.id} className="group flex flex-col">
                <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden mb-3 shadow-neumorphic-lift bg-white cursor-pointer active:scale-95 transition-all">
                  <img src={prod.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={prod.name} />
                  {prod.tag && (
                    <div className={`
                      absolute top-3 right-3 px-3 py-1 rounded-xl shadow-lg backdrop-blur-md
                      ${prod.tag.includes('%') ? 'bg-error text-white' : 'bg-white/90 text-primary'}
                    `}>
                      <span className="text-[10px] font-black uppercase tracking-wider">{prod.tag}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="px-2">
                  <h3 className="font-bold text-sm truncate text-on-surface leading-tight">{prod.name}</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-wide mb-2">{prod.brand}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className={`font-black text-lg ${prod.originalPrice ? 'text-error' : 'text-on-surface'}`}>
                        R$ {prod.price.toFixed(2).replace('.', ',')}
                      </span>
                      {prod.originalPrice && (
                        <span className="text-[10px] text-slate-400 line-through font-bold">R$ {prod.originalPrice.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                    <button className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-primary-glow active:scale-90 transition-transform">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 right-4 z-40">
        <button className="flex items-center gap-2 bg-primary text-white px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-transform shadow-primary-glow">
          <ShoppingBag className="w-4 h-4" /> Finalizar Compra
        </button>
      </div>
    </div>
  );
};
