'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { hasFeatureAccess, checkTrialStatus } from '@/lib/auth';
import {
  initializeSombraProgress,
  getSombraProgress,
  canAnswerToday,
  getNextQuestion,
  saveSombraResponse,
  getSombraHistory,
  MASTERS,
  calculateCurrentPhase,
  getQuestionsPerWeek,
  type SombraProgress,
  type SombraResponse
} from '@/lib/sombra';
import { generateAIResponse, validateOpenAIConfig } from '@/lib/openai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Send, Clock, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';

export default function SombraPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [progress, setProgress] = useState<SombraProgress | null>(null);
  const [canAnswer, setCanAnswer] = useState(false);
  const [questionsAvailable, setQuestionsAvailable] = useState(0);
  const [questionsAnsweredThisWeek, setQuestionsAnsweredThisWeek] = useState(0);
  const [questionsPerWeek, setQuestionsPerWeek] = useState(1);
  const [nextQuestionDate, setNextQuestionDate] = useState<Date | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [mastersCited, setMastersCited] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<SombraResponse[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Verificar acesso ao módulo
      const trialStatus = await checkTrialStatus(user.uid);
      const access = hasFeatureAccess(trialStatus.allowedFeatures, 'sombra');
      
      if (!access) {
        router.push('/dashboard');
        return;
      }

      setHasAccess(true);
      setUserId(user.uid);

      // Inicializar progresso se necessário
      await initializeSombraProgress(user.uid);

      // Carregar dados
      await loadSombraData(user.uid);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadSombraData = async (uid: string) => {
    const progressData = await getSombraProgress(uid);
    setProgress(progressData);

    if (progressData) {
      const currentPhase = calculateCurrentPhase(progressData.startDate);
      const qPerWeek = getQuestionsPerWeek(currentPhase);
      setQuestionsPerWeek(qPerWeek);

      const answerStatus = await canAnswerToday(uid);
      setCanAnswer(answerStatus.canAnswer);
      setQuestionsAvailable(answerStatus.questionsAvailableToday);
      setQuestionsAnsweredThisWeek(answerStatus.questionsAnsweredThisWeek);
      setNextQuestionDate(answerStatus.nextQuestionDate);

      if (answerStatus.canAnswer) {
        const question = await getNextQuestion(uid);
        setCurrentQuestion(question);
      }

      // Carregar histórico
      const historyData = await getSombraHistory(uid, 5);
      setHistory(historyData);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentQuestion || !userId) return;

    setIsSubmitting(true);

    try {
      // Gerar resposta da IA
      const aiResult = await generateAIResponse(currentQuestion, userAnswer, MASTERS);
      
      setAiResponse(aiResult.response);
      setMastersCited(aiResult.mastersCited);

      // Salvar no banco
      await saveSombraResponse(
        userId,
        currentQuestion,
        userAnswer,
        aiResult.response,
        aiResult.mastersCited
      );

      // Recarregar dados
      await loadSombraData(userId);
      
      // Limpar formulário
      setUserAnswer('');
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      alert('Erro ao processar sua resposta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#D4AF37]">Módulo Sombra</h1>
              <p className="text-sm text-gray-400">Jornada de autoconhecimento profundo</p>
            </div>
          </div>
          <Button
            onClick={() => setShowHistory(!showHistory)}
            variant="outline"
            className="border-gray-700 hover:bg-gray-800"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {showHistory ? 'Ocultar' : 'Ver'} Histórico
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Card */}
        <Card className="mb-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Seu Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Perguntas Respondidas</p>
                <p className="text-2xl font-bold text-white">{progress?.questionsAnsweredCount || 0}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Esta Semana</p>
                <p className="text-2xl font-bold text-white">
                  {questionsAnsweredThisWeek}/{questionsPerWeek}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Fase Atual</p>
                <Badge className="bg-purple-500 text-white">
                  {questionsPerWeek} {questionsPerWeek === 1 ? 'pergunta' : 'perguntas'}/semana
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        {canAnswer && currentQuestion && !aiResponse ? (
          <Card className="mb-8 bg-gray-900/50 border-[#D4AF37]/20">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Pergunta de Hoje</CardTitle>
              <CardDescription className="text-gray-400">
                Responda com honestidade e profundidade. Não há respostas certas ou erradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 rounded-lg p-6 border border-[#D4AF37]/30">
                <p className="text-xl text-white font-medium">{currentQuestion}</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Sua Resposta</label>
                <Textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Escreva sua resposta aqui... Seja honesto consigo mesmo."
                  className="min-h-[200px] bg-black/50 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <Button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || isSubmitting}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold h-12"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Enviar Resposta
                  </>
                )}
              </Button>

              {!validateOpenAIConfig() && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-sm text-orange-300">
                    ⚠️ Configure a chave da API OpenAI nas variáveis de ambiente para receber respostas da IA.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : aiResponse ? (
          <Card className="mb-8 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-400" />
                Reflexão dos Mestres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-black/30 rounded-lg p-6">
                <p className="text-white leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
              </div>

              {mastersCited.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Mestres Citados:</p>
                  <div className="flex flex-wrap gap-2">
                    {mastersCited.map((master, index) => (
                      <Badge key={index} className="bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {master}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  setAiResponse('');
                  setMastersCited([]);
                  loadSombraData(userId);
                }}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Concluir
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 bg-gray-900/50 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2">
                    {questionsAnsweredThisWeek >= questionsPerWeek
                      ? 'Você completou suas perguntas desta semana'
                      : 'Você já respondeu sua pergunta de hoje'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {nextQuestionDate
                      ? `Próxima pergunta disponível em: ${formatDate(nextQuestionDate)}`
                      : 'Continue sua jornada amanhã.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Histórico de Reflexões</h2>
            {history.map((item) => (
              <Card key={item.id} className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white">{item.questionText}</CardTitle>
                  <CardDescription className="text-gray-400">
                    Semana {item.weekNumber} • {item.createdAt.toDate().toLocaleDateString('pt-BR')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Sua Resposta:</p>
                    <p className="text-white">{item.userAnswer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Reflexão dos Mestres:</p>
                    <p className="text-gray-300 text-sm">{item.aiResponse}</p>
                  </div>
                  {item.mastersCited.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.mastersCited.map((master, index) => (
                        <Badge key={index} className="bg-purple-500/20 text-purple-300 text-xs">
                          {master}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
