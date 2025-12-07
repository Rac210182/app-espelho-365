'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowRight, ArrowLeft, Mic, MicOff } from 'lucide-react';

const QUESTIONS = [
  {
    id: 1,
    question: "Qual é a sua maior perda que você não aceita?",
    placeholder: "Descreva a perda que mais te impacta..."
  },
  {
    id: 2,
    question: "Qual foi a primeira emoção que você sentiu ao perder algo importante?",
    placeholder: "Raiva, tristeza, medo, vergonha..."
  },
  {
    id: 3,
    question: "De 0 a 10: Se você não vencer, você não vale nada?",
    placeholder: "Responda com um número de 0 a 10 e explique..."
  },
  {
    id: 4,
    question: "Quem na sua infância te condicionou a ser o melhor?",
    placeholder: "Pais, professores, treinadores..."
  },
  {
    id: 5,
    question: "Qual é o seu padrão quando você entra em 'tilt' (perde o controle)?",
    placeholder: "Como você reage quando perde o controle..."
  },
  {
    id: 6,
    question: "Qual frase da sua infância ainda ecoa na sua mente?",
    placeholder: "Uma frase que marcou você..."
  },
  {
    id: 7,
    question: "Qual arquétipo você mais odeia nos outros?",
    placeholder: "Vítima, arrogante, manipulador..."
  },
  {
    id: 8,
    question: "O que você faria se ninguém soubesse?",
    placeholder: "Seja honesto consigo mesmo..."
  },
  {
    id: 9,
    question: "Qual é o seu medo ao ganhar/vencer?",
    placeholder: "Responsabilidade, expectativas, solidão..."
  },
  {
    id: 10,
    question: "Em uma palavra: o que você quer colapsar/transformar em você?",
    placeholder: "Uma única palavra..."
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.uid);

      // Verificar se já completou o onboarding
      const onboardingDoc = await getDoc(doc(db, 'onboarding', user.uid));
      if (onboardingDoc.exists()) {
        router.push('/dashboard');
        return;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion + 1]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Verificar se todas as perguntas foram respondidas
    const allAnswered = QUESTIONS.every((_, index) => {
      const answer = answers[index + 1];
      return answer && answer.trim().length > 0;
    });

    if (!allAnswered) {
      alert('Por favor, responda todas as perguntas antes de continuar.');
      return;
    }

    setSaving(true);

    try {
      // Salvar respostas no Firestore
      await setDoc(doc(db, 'onboarding', userId), {
        userId,
        question_1: answers[1],
        question_2: answers[2],
        question_3: answers[3],
        question_4: answers[4],
        question_5: answers[5],
        question_6: answers[6],
        question_7: answers[7],
        question_8: answers[8],
        question_9: answers[9],
        question_10: answers[10],
        completedAt: new Date(),
        createdAt: new Date()
      });

      // Redirecionar para o dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      alert('Erro ao salvar suas respostas. Tente novamente.');
      setSaving(false);
    }
  };

  const toggleRecording = () => {
    // Implementação futura: integração com Web Speech API
    setIsRecording(!isRecording);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const currentAnswer = answers[currentQuestion + 1] || '';
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;
  const canProceed = currentAnswer.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-[#D4AF37]">ESPELHO 365</h1>
          <p className="text-sm text-gray-400">Questionário de Autoconhecimento</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              Pergunta {currentQuestion + 1} de {QUESTIONS.length}
            </span>
            <span className="text-sm text-[#D4AF37] font-semibold">
              {Math.round(progress)}% completo
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-gray-800" />
        </div>

        {/* Question Card */}
        <Card className="bg-gray-900/50 border-[#D4AF37]/20 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-white leading-relaxed">
              {QUESTIONS[currentQuestion].question}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Seja honesto e profundo em sua resposta. Não há respostas certas ou erradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder={QUESTIONS[currentQuestion].placeholder}
                className="min-h-[200px] bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#D4AF37] resize-none"
              />
              <Button
                onClick={toggleRecording}
                variant="outline"
                size="icon"
                className={`absolute bottom-4 right-4 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 border-red-500' 
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                }`}
                title={isRecording ? 'Parar gravação' : 'Gravar resposta por voz'}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4 text-white" />
                ) : (
                  <Mic className="h-4 w-4 text-gray-300" />
                )}
              </Button>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Gravando... (funcionalidade em desenvolvimento)
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
            className="border-gray-700 hover:bg-gray-800 disabled:opacity-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {QUESTIONS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentQuestion
                    ? 'bg-[#D4AF37] w-8'
                    : answers[index + 1]
                    ? 'bg-[#D4AF37]/50'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed || saving}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Finalizar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold disabled:opacity-50"
            >
              Próxima
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Helper Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Suas respostas são privadas e serão usadas apenas para personalizar sua experiência no ESPELHO 365.
          </p>
        </div>
      </main>
    </div>
  );
}
