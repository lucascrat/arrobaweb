import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy Upload to R2 (to avoid CORS and browser blocks, renamed to avoid adblock)
app.post('/api/media/store', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      return res.status(500).json({ error: 'R2 credentials not configured.' });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const key = `uploads/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: file.mimetype,
      Body: file.buffer,
    });

    await s3.send(command);
    
    const publicUrl = `${process.env.VITE_R2_PUBLIC_DOMAIN}/${key}`;
    res.json({ publicUrl, key });
  } catch (error) {
    console.error('Error in proxy upload:', error);
    res.status(500).json({ error: 'Failed to upload file to storage' });
  }
});

app.post('/api/r2/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      return res.status(500).json({ error: 'R2 credentials not configured in environment.' });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const key = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.VITE_R2_PUBLIC_DOMAIN}/${key}`;

    res.json({ presignedUrl, publicUrl, key });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// AI Chat Route
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const { storeName, description, products, services } = context;

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return res.json({ reply: "Configuração de IA pendente no servidor." });
    }

    const systemPrompt = `Você é o Atendente IA da loja "${storeName}".
Descrição da loja: ${description || 'Uma loja premium no Arroba.'}

Produtos disponíveis:
${products?.map((p: any) => `- ${p.name}: R$ ${p.price}`).join('\n') || 'Nenhum produto cadastrado.'}

Serviços disponíveis:
${services?.map((s: any) => `- ${s.name}: R$ ${s.price} (${s.duration} min)`).join('\n') || 'Nenhum serviço cadastrado.'}

Instruções:
1. Seja simpático, profissional e use emojis.
2. Responda em português.
3. Se o cliente perguntar sobre algo que não temos, diga educadamente.
4. Se o cliente quiser agendar, informe que ele pode clicar em "Ver Serviços" e depois em "Agendar" no serviço desejado.
5. Mantenha as respostas curtas (máximo 3 parágrafos).`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `CONTEXTO DO SISTEMA: ${systemPrompt}\n\nPERGUNTA DO CLIENTE: ${message}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 400,
        }
      })
    });

    const data = await response.json() as any;
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua solicitação agora.";

    res.json({ reply });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ reply: "Houve um erro na comunicação com a IA." });
  }
});

// Vite Middleware
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupVite();
