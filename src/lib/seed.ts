import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const INITIAL_TEMPLATES = [
  {
    name: '✂️ Barbearia Moderna',
    description: 'Focado em agendamento de horários. Ideal para barbeiros e salões que precisam de agenda organizada e atendimento rápido.',
    category: 'Beleza',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Bem-vindo à nossa barbearia! Agende seu corte agora.',
      aiPrompt: 'Você é um assistente de barbearia. Ajude os clientes a escolherem serviços e informe que eles podem agendar pelo botão de agenda.'
    }
  },
  {
    name: '🛍️ Boutique Fashion',
    description: 'Catálogo de produtos elegante com foco em imagens e descrição detalhada. Perfeito para lojas de roupas e acessórios.',
    category: 'Varejo',
    config: {
      storeMode: 'store',
      welcomeMessage: 'Confira nossa nova coleção de outono/inverno!',
      aiPrompt: 'Você é um consultor de moda. Ajude os clientes a encontrarem o look perfeito em nosso catálogo.'
    }
  },
  {
    name: '🍔 Delivery Express',
    description: 'Loja com atendimento por IA para tirar dúvidas sobre o cardápio e receber pedidos de forma rápida e automatizada.',
    category: 'Alimentação',
    config: {
      storeMode: 'store+ai',
      welcomeMessage: 'Bateu aquela fome? Peça agora e receba em casa!',
      aiPrompt: 'Você é o atendente de uma lanchonete. Tire dúvidas sobre os ingredientes e ajude o cliente a fechar o pedido.'
    }
  },
  {
    name: '💅 Studio de Estética',
    description: 'Agendamento de serviços especializados com descrições detalhadas e duração de cada procedimento.',
    category: 'Beleza',
    config: {
      storeMode: 'scheduling',
      welcomeMessage: 'Realce sua beleza no nosso studio. Escolha seu serviço abaixo.',
      aiPrompt: 'Você é uma recepcionista de studio de beleza. Seja muito educada e ajude com dúvidas sobre os procedimentos.'
    }
  }
];

export const seedTemplates = async () => {
  try {
    const templatesRef = collection(db, 'storeTemplates');
    const existing = await getDocs(templatesRef);
    
    if (existing.empty) {
      console.log('Seeding templates...');
      for (const tmpl of INITIAL_TEMPLATES) {
        await addDoc(templatesRef, {
          ...tmpl,
          createdAt: serverTimestamp()
        });
      }
      console.log('Templates seeded successfully!');
    } else {
      console.log('Templates already exist. Skipping seed.');
    }
  } catch (err) {
    console.error('Error seeding templates:', err);
  }
};
