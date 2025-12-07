import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// Lista dos 30 mestres
export const MASTERS = [
  'Amit Goswami',
  'Fred Alan Wolf',
  'John Hagelin',
  'William Tiller',
  'David Albert',
  'Stuart Hameroff',
  'Jeffrey Satinover',
  'Candace Pert',
  'Joe Dispenza',
  'Daniel Monti',
  'Elisabeth Kübler-Ross',
  'Ramtha (via JZ Knight)',
  'Fritjof Capra',
  'Carl Gustav Jung',
  'Hélio Couto',
  'Roger Penrose',
  'Henry Stapp',
  'David Bohm',
  'John Wheeler',
  'Werner Heisenberg',
  'Erwin Schrödinger',
  'Paul Davies',
  'Brian Josephson',
  'Dean Radin',
  'Lynne McTaggart',
  'Nassim Haramein',
  'Menas Kafatos',
  'Paul Levy',
  'Stuart Kauffman',
  'Jon Kabat-Zinn'
];

// Banco de perguntas do módulo Sombra
export const SOMBRA_QUESTIONS = [
  'Qual é a sua maior perda não aceita?',
  'Qual foi a primeira emoção que você sentiu ao perder algo importante?',
  'De 0 a 10, o quanto você acredita que precisa vencer para se sentir valioso?',
  'Quem na sua infância te condicionou a ser o melhor?',
  'Qual padrão você percebe em momentos de estresse?',
  'Qual frase da infância ainda ecoa na sua mente?',
  'Qual arquétipo você odeia nos outros?',
  'O que você faria se ninguém soubesse?',
  'Qual é o seu medo ao ganhar?',
  'Em uma palavra, o que você gostaria de mudar?',
  'Qual parte de você mesmo você mais rejeita?',
  'Que emoção você evita sentir a todo custo?',
  'Qual é a mentira que você conta para si mesmo?',
  'O que você julga nos outros que também existe em você?',
  'Qual é o seu maior medo sobre ser visto como realmente é?',
  'Que aspecto seu você esconde até de pessoas próximas?',
  'Qual comportamento seu te envergonha profundamente?',
  'O que você faria diferente se não tivesse medo do julgamento?',
  'Qual é a dor que você carrega em silêncio?',
  'Que parte da sua história você gostaria de reescrever?'
];

export interface SombraProgress {
  userId: string;
  startDate: Timestamp;
  lastQuestionDate: Timestamp | null;
  questionsAnsweredCount: number;
  currentPhase: 'phase1' | 'phase2' | 'phase3' | 'phase4'; // 1 pergunta/semana, 2, 3, 4
}

export interface SombraResponse {
  id: string;
  userId: string;
  questionText: string;
  userAnswer: string;
  aiResponse: string;
  mastersCited: string[];
  createdAt: Timestamp;
  weekNumber: number;
}

// Inicializar progresso do usuário no módulo Sombra
export const initializeSombraProgress = async (userId: string): Promise<void> => {
  const progressRef = doc(db, 'sombra_progress', userId);
  const progressDoc = await getDoc(progressRef);
  
  if (!progressDoc.exists()) {
    await setDoc(progressRef, {
      userId,
      startDate: Timestamp.now(),
      lastQuestionDate: null,
      questionsAnsweredCount: 0,
      currentPhase: 'phase1'
    });
  }
};

// Obter progresso do usuário
export const getSombraProgress = async (userId: string): Promise<SombraProgress | null> => {
  const progressRef = doc(db, 'sombra_progress', userId);
  const progressDoc = await getDoc(progressRef);
  
  if (!progressDoc.exists()) {
    return null;
  }
  
  return progressDoc.data() as SombraProgress;
};

// Calcular fase atual baseado no tempo desde o início
export const calculateCurrentPhase = (startDate: Timestamp): 'phase1' | 'phase2' | 'phase3' | 'phase4' => {
  const now = new Date();
  const start = startDate.toDate();
  const monthsElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsElapsed < 3) return 'phase1'; // 1 pergunta por semana
  if (monthsElapsed < 6) return 'phase2'; // 2 perguntas por semana
  if (monthsElapsed < 9) return 'phase3'; // 3 perguntas por semana
  return 'phase4'; // 4 perguntas por semana
};

// Obter número de perguntas por semana baseado na fase
export const getQuestionsPerWeek = (phase: 'phase1' | 'phase2' | 'phase3' | 'phase4'): number => {
  const questionsMap = {
    phase1: 1,
    phase2: 2,
    phase3: 3,
    phase4: 4
  };
  return questionsMap[phase];
};

// Verificar se usuário pode responder pergunta hoje
export const canAnswerToday = async (userId: string): Promise<{
  canAnswer: boolean;
  questionsAvailableToday: number;
  questionsAnsweredThisWeek: number;
  questionsPerWeek: number;
  nextQuestionDate: Date | null;
}> => {
  const progress = await getSombraProgress(userId);
  
  if (!progress) {
    return {
      canAnswer: false,
      questionsAvailableToday: 0,
      questionsAnsweredThisWeek: 0,
      questionsPerWeek: 0,
      nextQuestionDate: null
    };
  }
  
  const currentPhase = calculateCurrentPhase(progress.startDate);
  const questionsPerWeek = getQuestionsPerWeek(currentPhase);
  
  // Obter respostas desta semana
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
  startOfWeek.setHours(0, 0, 0, 0);
  
  const responsesRef = collection(db, 'sombra_responses');
  const weekQuery = query(
    responsesRef,
    where('userId', '==', userId),
    where('createdAt', '>=', Timestamp.fromDate(startOfWeek)),
    orderBy('createdAt', 'desc')
  );
  
  const weekResponses = await getDocs(weekQuery);
  const questionsAnsweredThisWeek = weekResponses.size;
  
  // Verificar se já respondeu hoje
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayQuery = query(
    responsesRef,
    where('userId', '==', userId),
    where('createdAt', '>=', Timestamp.fromDate(today)),
    limit(1)
  );
  
  const todayResponses = await getDocs(todayQuery);
  const answeredToday = todayResponses.size > 0;
  
  const canAnswer = !answeredToday && questionsAnsweredThisWeek < questionsPerWeek;
  const questionsAvailableToday = canAnswer ? 1 : 0;
  
  // Calcular próxima data disponível
  let nextQuestionDate: Date | null = null;
  if (!canAnswer) {
    if (answeredToday) {
      // Próximo dia
      nextQuestionDate = new Date(today);
      nextQuestionDate.setDate(nextQuestionDate.getDate() + 1);
    } else if (questionsAnsweredThisWeek >= questionsPerWeek) {
      // Próxima semana
      const nextWeek = new Date(startOfWeek);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextQuestionDate = nextWeek;
    }
  }
  
  return {
    canAnswer,
    questionsAvailableToday,
    questionsAnsweredThisWeek,
    questionsPerWeek,
    nextQuestionDate
  };
};

// Obter próxima pergunta para o usuário
export const getNextQuestion = async (userId: string): Promise<string | null> => {
  const progress = await getSombraProgress(userId);
  
  if (!progress) {
    return null;
  }
  
  // Obter perguntas já respondidas
  const responsesRef = collection(db, 'sombra_responses');
  const answeredQuery = query(
    responsesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const answeredDocs = await getDocs(answeredQuery);
  const answeredQuestions = answeredDocs.docs.map(doc => doc.data().questionText);
  
  // Encontrar primeira pergunta não respondida
  const nextQuestion = SOMBRA_QUESTIONS.find(q => !answeredQuestions.includes(q));
  
  return nextQuestion || SOMBRA_QUESTIONS[0]; // Se respondeu todas, recomeça
};

// Salvar resposta do usuário
export const saveSombraResponse = async (
  userId: string,
  questionText: string,
  userAnswer: string,
  aiResponse: string,
  mastersCited: string[]
): Promise<void> => {
  const responsesRef = collection(db, 'sombra_responses');
  const progress = await getSombraProgress(userId);
  
  if (!progress) {
    throw new Error('Progresso do usuário não encontrado');
  }
  
  // Calcular número da semana
  const startDate = progress.startDate.toDate();
  const now = new Date();
  const weekNumber = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
  
  // Salvar resposta
  await setDoc(doc(responsesRef), {
    userId,
    questionText,
    userAnswer,
    aiResponse,
    mastersCited,
    createdAt: Timestamp.now(),
    weekNumber
  });
  
  // Atualizar progresso
  const progressRef = doc(db, 'sombra_progress', userId);
  const currentPhase = calculateCurrentPhase(progress.startDate);
  
  await setDoc(progressRef, {
    ...progress,
    lastQuestionDate: Timestamp.now(),
    questionsAnsweredCount: progress.questionsAnsweredCount + 1,
    currentPhase
  }, { merge: true });
};

// Obter histórico de respostas do usuário
export const getSombraHistory = async (userId: string, limitCount: number = 10): Promise<SombraResponse[]> => {
  const responsesRef = collection(db, 'sombra_responses');
  const historyQuery = query(
    responsesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const historyDocs = await getDocs(historyQuery);
  
  return historyDocs.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SombraResponse));
};
