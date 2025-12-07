'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { checkTrialStatus, checkOnboardingStatus, signOut, TRIAL_FEATURES } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Crown, Lock, CheckCircle2 } from 'lucide-react';

interface TrialStatus {
  isTrialActive: boolean;
  daysRemaining: number;
  isPremium: boolean;
  allowedFeatures: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Verificar se completou o onboarding
      const hasCompletedOnboarding = await checkOnboardingStatus(user.uid);
      if (!hasCompletedOnboarding) {
        router.push('/onboarding');
        return;
      }

      setUserEmail(user.email || '');
      const status = await checkTrialStatus(user.uid);
      setTrialStatus(status);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  const featuresList = [
    { id: 'sombra', name: 'Sombra', description: 'Trabalho com aspectos sombrios' },
    { id: 'espelho-livre', name: 'Espelho Livre', description: 'Reflexão livre e espontânea' },
    { id: 'fechamento', name: 'Fechamento', description: 'Encerramento e integração' },
    { id: 'todas-funcionalidades', name: 'Todas as Funcionalidades', description: 'Acesso completo ao sistema', premium: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">ESPELHO 365</h1>
            <p className="text-sm text-gray-400">{userEmail}</p>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-gray-700 hover:bg-gray-800"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Status Card */}
        <Card className="mb-8 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-[#D4AF37] flex items-center gap-2">
                  {trialStatus?.isPremium ? (
                    <>
                      <Crown className="h-6 w-6" />
                      Conta Premium
                    </>
                  ) : trialStatus?.isTrialActive ? (
                    <>
                      🎁 Período de Teste Ativo
                    </>
                  ) : (
                    <>
                      <Lock className="h-6 w-6" />
                      Período de Teste Expirado
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-300 mt-2">
                  {trialStatus?.isPremium
                    ? 'Você tem acesso completo a todas as funcionalidades'
                    : trialStatus?.isTrialActive
                    ? `Restam ${trialStatus.daysRemaining} dias do seu período de teste gratuito`
                    : 'Faça upgrade para continuar acessando o ESPELHO 365'}
                </CardDescription>
              </div>
              {!trialStatus?.isPremium && (
                <Button className="bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold">
                  <Crown className="mr-2 h-4 w-4" />
                  Fazer Upgrade
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuresList.map((feature) => {
            const hasAccess = trialStatus?.allowedFeatures.includes(feature.id) || false;
            const isLocked = !hasAccess && !trialStatus?.isPremium;

            return (
              <Card
                key={feature.id}
                className={`${
                  isLocked
                    ? 'bg-gray-900/30 border-gray-800 opacity-60'
                    : 'bg-gray-900/50 border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-white flex items-center gap-2">
                        {feature.name}
                        {feature.premium && (
                          <Badge className="bg-[#D4AF37] text-black">Premium</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-1">
                        {feature.description}
                      </CardDescription>
                    </div>
                    {isLocked ? (
                      <Lock className="h-5 w-5 text-gray-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-[#D4AF37]" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    disabled={isLocked}
                    onClick={() => !isLocked && router.push(`/dashboard/${feature.id}`)}
                    className={`w-full ${
                      isLocked
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold'
                    }`}
                  >
                    {isLocked ? 'Bloqueado' : 'Acessar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trial Info */}
        {trialStatus?.isTrialActive && !trialStatus?.isPremium && (
          <Card className="mt-8 bg-blue-500/10 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">ℹ️</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2">
                    Sobre o Período de Teste
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Durante os 7 dias de teste gratuito, você tem acesso às seguintes funcionalidades:
                  </p>
                  <ul className="space-y-1 text-sm text-gray-400">
                    {TRIAL_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                        {feature.charAt(0).toUpperCase() + feature.slice(1).replace('-', ' ')}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-400 mt-3">
                    Após o período de teste, faça upgrade para continuar acessando todas as funcionalidades.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
