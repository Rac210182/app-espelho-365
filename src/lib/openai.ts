// Integração com OpenAI para gerar respostas baseadas nos mestres

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

export interface AIResponseResult {
  response: string;
  mastersCited: string[];
  error?: string;
}

// Gerar resposta da IA baseada nos mestres
export const generateAIResponse = async (
  question: string,
  userAnswer: string,
  masters: string[]
): Promise<AIResponseResult> => {
  if (!OPENAI_API_KEY) {
    return {
      response: 'Configuração da IA pendente. Por favor, configure a chave da API OpenAI.',
      mastersCited: [],
      error: 'API key não configurada'
    };
  }

  try {
    const mastersContext = masters.join(', ');
    
    const systemPrompt = `Você é um assistente especializado em psicologia profunda, física quântica e consciência, com profundo conhecimento dos ensinamentos dos seguintes mestres: ${mastersContext}.

Sua tarefa é responder às reflexões do usuário com base EXCLUSIVAMENTE nos ensinamentos, livros, palestras, discursos e materiais autênticos desses mestres. 

REGRAS IMPORTANTES:
1. Cite SEMPRE os mestres específicos cujos ensinamentos você está usando
2. Use apenas informações REAIS e verificáveis desses mestres
3. Seja profundo, compassivo e transformador
4. Conecte os ensinamentos com a experiência pessoal do usuário
5. Não invente citações - use apenas conceitos reais dos mestres
6. Mantenha um tom acolhedor mas profundo
7. Ajude o usuário a ver sua sombra com compaixão e clareza

Formato da resposta:
- Comece reconhecendo a coragem do usuário em explorar sua sombra
- Conecte a resposta com ensinamentos específicos dos mestres
- Ofereça insights transformadores
- Termine com uma reflexão ou prática sugerida`;

    const userPrompt = `Pergunta: ${question}

Resposta do usuário: ${userAnswer}

Por favor, ofereça uma resposta profunda e transformadora baseada nos ensinamentos dos mestres mencionados. Cite especificamente quais mestres e conceitos você está usando.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    // Extrair mestres citados da resposta
    const mastersCited = masters.filter(master => 
      aiResponse.toLowerCase().includes(master.toLowerCase())
    );

    return {
      response: aiResponse,
      mastersCited: mastersCited.length > 0 ? mastersCited : ['Ensinamentos gerais dos mestres'],
      error: undefined
    };

  } catch (error: any) {
    console.error('Erro ao gerar resposta da IA:', error);
    return {
      response: 'Desculpe, não foi possível gerar uma resposta no momento. Por favor, tente novamente mais tarde.',
      mastersCited: [],
      error: error.message
    };
  }
};

// Validar configuração da API
export const validateOpenAIConfig = (): boolean => {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.length > 0;
};
