import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type StoreMode = 'store' | 'store+ai' | 'scheduling';

export interface SeedTemplate {
  name: string;
  description: string;
  category: string;
  themeColor: string; // chave em THEME_PRESETS
  config: {
    storeMode: StoreMode;
    welcomeMessage: string;
    aiPrompt?: string;
  };
  sampleProducts?: Array<{ name: string; price: number; description?: string; image?: string; category?: string }>;
  sampleServices?: Array<{ name: string; price: number; duration: number; description?: string }>;
}

export const CATEGORY_OPTIONS = [
  'Beleza',
  'Alimentação',
  'Varejo',
  'Serviços',
  'Eletrônicos',
  'Saúde',
  'Educação',
  'Pet',
  'Fitness',
  'Geral',
];

// Tons de gradiente disponíveis para a vitrine pública
export const THEME_PRESETS: Record<string, { from: string; to: string; accent: string }> = {
  indigo:  { from: 'from-indigo-600',  to: 'to-fuchsia-600', accent: 'indigo' },
  fuchsia: { from: 'from-fuchsia-600', to: 'to-pink-500',    accent: 'fuchsia' },
  emerald: { from: 'from-emerald-500', to: 'to-teal-500',    accent: 'emerald' },
  amber:   { from: 'from-amber-500',   to: 'to-orange-500',  accent: 'amber' },
  cyan:    { from: 'from-cyan-500',    to: 'to-blue-500',    accent: 'cyan' },
  rose:    { from: 'from-rose-500',    to: 'to-red-500',     accent: 'rose' },
  violet:  { from: 'from-violet-500',  to: 'to-indigo-500',  accent: 'violet' },
  slate:   { from: 'from-slate-700',   to: 'to-slate-900',   accent: 'slate' },
};

const INITIAL_TEMPLATES: SeedTemplate[] = [
  {
    name: '✂️ Barbearia Elite',
    description: 'O modelo definitivo para barbearias. Inclui sistema de agendamento de horários, catálogo de serviços e IA treinada para converter curiosos em clientes agendados.',
    category: 'Beleza',
    themeColor: 'slate',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Bem-vindo à Barbearia Elite! Onde o estilo encontra a precisão. Agende seu horário abaixo.',
      aiPrompt: 'Você é o Barbeiro Chefe da Elite. Sua missão é ser carismático, explicar os estilos de corte disponíveis (Degradê, Social, Barba Terapia) e incentivar o agendamento pelo botão de agenda. Seja direto e profissional.'
    },
    sampleServices: [
      { name: 'Corte Degradê', price: 45, duration: 30, description: 'Corte moderno com transição suave.' },
      { name: 'Barba Terapia', price: 35, duration: 30, description: 'Toalha quente, hidratação e navalha.' },
      { name: 'Combo Cabelo + Barba', price: 70, duration: 60, description: 'Pacote completo de visagismo.' },
    ],
  },
  {
    name: '💅 Studio de Unhas',
    description: 'Para manicures e nail designers. Agendamento rápido, fotos do portfólio e IA para indicar a melhor técnica para cada cliente.',
    category: 'Beleza',
    themeColor: 'rose',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Suas unhas merecem uma obra de arte. Reserve um horário comigo.',
      aiPrompt: 'Você é uma nail designer simpática. Indique técnicas (gel, acrigel, encapsulada) com base nas necessidades da cliente e ajude no agendamento.'
    },
    sampleServices: [
      { name: 'Esmaltação em Gel', price: 60, duration: 60, description: 'Duração de até 3 semanas.' },
      { name: 'Alongamento Acrigel', price: 150, duration: 120, description: 'Estrutura premium com acabamento espelhado.' },
      { name: 'Spa dos Pés', price: 80, duration: 75, description: 'Esfoliação, hidratação e esmaltação.' },
    ],
  },
  {
    name: '👗 Boutique Fashion Pro',
    description: 'Loja de roupas completa. Focada em conversão de vendas com vitrine de produtos, gestão de estoque e checkout Pix integrado.',
    category: 'Varejo',
    themeColor: 'fuchsia',
    config: {
      storeMode: 'store',
      welcomeMessage: 'Tendências Globais, Estilo Local. Explore nossa Coleção Premium!',
      aiPrompt: 'Você é um Personal Stylist especializado em moda urbana e clássica. Ajude os clientes a combinarem peças do nosso catálogo e destaque a qualidade dos tecidos.'
    },
    sampleProducts: [
      { name: 'Camiseta Oversized Premium', price: 129.9, category: 'Roupas', description: 'Algodão peruano 100%.', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' },
      { name: 'Calça Cargo Tactical', price: 249.9, category: 'Roupas', description: 'Multi-bolsos, tecido ripstop.', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600' },
      { name: 'Tênis Chunky', price: 459.9, category: 'Calçados', description: 'Solado robusto e confortável.', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' },
    ],
  },
  {
    name: '🍔 Hamburgueria Artesanal',
    description: 'Cardápio digital com pedidos via chat por IA. Perfeito para hamburguerias, lanchonetes e dark kitchens.',
    category: 'Alimentação',
    themeColor: 'amber',
    config: {
      storeMode: 'store+ai',
      welcomeMessage: 'Os melhores burgers da cidade, do nosso fogão direto pra sua casa.',
      aiPrompt: 'Você é o atendente da hamburgueria. Explique os ingredientes, sugira combos e finalize o pedido coletando endereço e forma de pagamento (Pix).'
    },
    sampleProducts: [
      { name: 'Smash Duplo Cheddar', price: 32.9, category: 'Alimentos', description: 'Pão brioche, dois smashes, cheddar inglês.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600' },
      { name: 'Crispy Chicken', price: 28.9, category: 'Alimentos', description: 'Frango empanado, maionese defumada.', image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600' },
      { name: 'Batata Rústica', price: 18.9, category: 'Alimentos', description: 'Com casca, alecrim e flor de sal.', image: 'https://images.unsplash.com/photo-1518013431117-eb1465fa5752?w=600' },
    ],
  },
  {
    name: '🍣 Sushi Gourmet',
    description: 'Cardápio digital interativo com assistente de pedidos por IA. Reduza filas e automatize o atendimento pelo chat.',
    category: 'Alimentação',
    themeColor: 'rose',
    config: {
      storeMode: 'store+ai',
      welcomeMessage: 'Uma experiência gastronômica inesquecível. Faça seu pedido pelo chat ou escolha no cardápio.',
      aiPrompt: 'Você é o Maître do restaurante. Conhece cada ingrediente e harmonização. Sugira pratos baseados na fome do cliente e ajude-o a finalizar a compra via Pix.'
    },
    sampleProducts: [
      { name: 'Combo Sushi 20pç', price: 89.9, category: 'Alimentos', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600' },
      { name: 'Hot Roll Filadélfia', price: 39.9, category: 'Alimentos', image: 'https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=600' },
      { name: 'Temaki de Salmão', price: 34.9, category: 'Alimentos', image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600' },
    ],
  },
  {
    name: '🏋️ Personal & Fitness',
    description: 'Ideal para personal trainers e profissionais de bem-estar. Agenda de consultorias, planos de treino e pacotes.',
    category: 'Fitness',
    themeColor: 'emerald',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Transforme seu corpo, mude sua mente. Reserve sua aula experimental!',
      aiPrompt: 'Você é um treinador motivador. Explique os benefícios de cada plano de treino e ajude o aluno a escolher o melhor horário para a consultoria.'
    },
    sampleServices: [
      { name: 'Avaliação Física', price: 0, duration: 45, description: 'Sessão experimental gratuita.' },
      { name: 'Consultoria Mensal', price: 350, duration: 60, description: '4 sessões + plano alimentar.' },
      { name: 'Plano Trimestral', price: 900, duration: 60, description: '12 sessões com follow-up semanal.' },
    ],
  },
  {
    name: '📱 Tech Store Express',
    description: 'Venda de eletrônicos e acessórios com foco em especificações técnicas e suporte especializado por IA.',
    category: 'Eletrônicos',
    themeColor: 'cyan',
    config: {
      storeMode: 'store+ai',
      welcomeMessage: 'O futuro em suas mãos. Os melhores gadgets com garantia Arroba.',
      aiPrompt: 'Você é um especialista em tecnologia. Ajude os clientes a compararem specs de celulares, fones e acessórios. Destaque o custo-benefício.'
    },
    sampleProducts: [
      { name: 'Fone Bluetooth Pro', price: 299.9, category: 'Eletrônicos', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600' },
      { name: 'Smartwatch Sport', price: 599.9, category: 'Eletrônicos', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' },
      { name: 'Carregador Wireless 15W', price: 129.9, category: 'Eletrônicos', image: 'https://images.unsplash.com/photo-1580742441051-e537b32e9be8?w=600' },
    ],
  },
  {
    name: '🐶 Pet Shop & Banho',
    description: 'Cadastro de serviços de banho/tosa, agenda de veterinário e venda de produtos pet em uma vitrine só.',
    category: 'Pet',
    themeColor: 'amber',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Cuidado e carinho para seu melhor amigo. Agende um horário!',
      aiPrompt: 'Você é a recepcionista do pet shop. Explique pacotes de banho/tosa por porte do animal e ajude no agendamento.'
    },
    sampleServices: [
      { name: 'Banho Pequeno Porte', price: 50, duration: 60 },
      { name: 'Banho + Tosa Médio', price: 90, duration: 90 },
      { name: 'Consulta Veterinária', price: 150, duration: 30 },
    ],
  },
  {
    name: '🎓 Mentoria Online',
    description: 'Para coaches, professores particulares e mentores. Venda de pacotes, agenda de sessões e checkout Pix.',
    category: 'Educação',
    themeColor: 'violet',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Acelere sua jornada com mentoria 1:1. Reserve sua primeira call.',
      aiPrompt: 'Você é um assistente de mentor. Apresente os pacotes, tire dúvidas e direcione para o agendamento.'
    },
    sampleServices: [
      { name: 'Call Diagnóstico', price: 0, duration: 30, description: 'Sessão gratuita para entender objetivos.' },
      { name: 'Pacote 4 Sessões', price: 1200, duration: 60, description: 'Mentoria de um mês.' },
      { name: 'Pacote 12 Sessões', price: 3200, duration: 60, description: 'Trimestre completo com material.' },
    ],
  },
  {
    name: '🛍️ Loja Geral (Em Branco)',
    description: 'Comece do zero. Layout neutro pronto para qualquer tipo de produto ou serviço.',
    category: 'Geral',
    themeColor: 'indigo',
    config: {
      storeMode: 'store',
      welcomeMessage: 'Bem-vindo à nossa loja!',
      aiPrompt: 'Você é um atendente cordial. Ajude o cliente a encontrar o produto certo.'
    },
  },
];

export const INITIAL_TEMPLATES_COUNT = INITIAL_TEMPLATES.length;

/**
 * Garante que os modelos padrão existam no Firestore.
 * - Quando `force` é true, atualiza os documentos existentes (sobrescreve por nome)
 *   para refletir a versão mais recente do código (welcomeMessage, aiPrompt, theme, samples).
 */
export const seedTemplates = async (force = false) => {
  try {
    const templatesRef = collection(db, 'storeTemplates');
    const existing = await getDocs(templatesRef);

    if (!existing.empty && !force) return;

    for (const tmpl of INITIAL_TEMPLATES) {
      const q = query(templatesRef, where('name', '==', tmpl.name));
      const check = await getDocs(q);
      const payload = { ...tmpl, updatedAt: serverTimestamp() };

      if (check.empty) {
        await addDoc(templatesRef, { ...payload, createdAt: serverTimestamp() });
      } else if (force) {
        // sobrescreve documento existente com a versão mais recente
        const ref = doc(db, 'storeTemplates', check.docs[0].id);
        await setDoc(ref, { ...check.docs[0].data(), ...payload }, { merge: true });
      }
    }
  } catch (err) {
    console.error('Error seeding templates:', err);
  }
};
