import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const INITIAL_TEMPLATES = [
  {
    name: '✂️ Barbearia Elite',
    description: 'O modelo definitivo para barbearias. Inclui sistema de agendamento de horários, catálogo de serviços e IA treinada para converter curiosos em clientes agendados.',
    category: 'Beleza',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Bem-vindo à Barbearia Elite! Onde o estilo encontra a precisão. Agende seu horário abaixo.',
      aiPrompt: 'Você é o Barbeiro Chefe da Elite. Sua missão é ser carismático, explicar os estilos de corte disponíveis (Degradê, Social, Barba Terapia) e incentivar o agendamento pelo botão de agenda. Seja direto e profissional.'
    }
  },
  {
    name: '👗 Boutique Fashion Pro',
    description: 'Loja de roupas completa. Focada em conversão de vendas com vitrine de produtos, gestão de estoque e checkout Pix integrado.',
    category: 'Varejo',
    config: {
      storeMode: 'store',
      welcomeMessage: 'Tendências Globais, Estilo Local. Explore nossa Coleção Premium!',
      aiPrompt: 'Você é um Personal Stylist especializado em moda urbana e clássica. Ajude os clientes a combinarem peças do nosso catálogo e destaque a qualidade dos tecidos.'
    }
  },
  {
    name: '🍣 Gastronomia Gourmet',
    description: 'Cardápio digital interativo com assistente de pedidos por IA. Reduza filas e automatize o atendimento pelo chat.',
    category: 'Alimentação',
    config: {
      storeMode: 'store+ai',
      welcomeMessage: 'Uma experiência gastronômica inesquecível. Faça seu pedido pelo chat ou escolha no cardápio.',
      aiPrompt: 'Você é o Maître do restaurante. Conhece cada ingrediente e harmonização. Sugira pratos baseados na fome do cliente e ajude-o a finalizar a compra via Pix.'
    }
  },
  {
    name: '🏋️ Personal & Fitness',
    description: 'Ideal para profissionais liberais. Agendamento de consultorias, venda de planos de treino e pacotes de aulas.',
    category: 'Serviços',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Transforme seu corpo, mude sua mente. Reserve sua aula experimental!',
      aiPrompt: 'Você é um treinador motivador. Explique os benefícios de cada plano de treino e ajude o aluno a escolher o melhor horário para a consultoria.'
    }
  },
  {
    name: '📱 Tech Store Express',
    description: 'Venda de eletrônicos e acessórios com foco em especificações técnicas e suporte especializado por IA.',
    category: 'Eletrônicos',
    config: {
      storeMode: 'store+ai',
      welcomeMessage: 'O futuro em suas mãos. Os melhores gadgets com garantia Arroba.',
      aiPrompt: 'Você é um especialista em tecnologia. Ajude os clientes a compararem specs de celulares, fones e acessórios. Destaque o custo-benefício.'
    }
  }
];

export const seedTemplates = async (force = false) => {
  try {
    const templatesRef = collection(db, 'storeTemplates');
    const existing = await getDocs(templatesRef);
    
    if (existing.empty || force) {
      console.log('Seeding templates...');
      // If force, clear old ones first (optional)
      for (const tmpl of INITIAL_TEMPLATES) {
        // Check if template with same name exists to avoid duplicates during force seed
        const q = query(templatesRef, where('name', '==', tmpl.name));
        const check = await getDocs(q);
        if (check.empty) {
          await addDoc(templatesRef, {
            ...tmpl,
            createdAt: serverTimestamp()
          });
        }
      }
      console.log('Templates seeded successfully!');
    }
  } catch (err) {
    console.error('Error seeding templates:', err);
  }
};
