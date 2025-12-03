'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import EvolutionBar from '@/components/custom/EvolutionBar';

interface UserData {
  currentDay: number;
  startDate: string;
  level: number;
  daysCompleted: number;
  daysSkipped: number;
  isPremium: boolean;
  trialEndsAt: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Get or create user data
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user data
        const newUserData: UserData = {
          currentDay: 1,
          startDate: new Date().toISOString(),
          level: 1,
          daysCompleted: 0,
          daysSkipped: 0,
          isPremium: false,
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };
        await setDoc(userDocRef, newUserData);
        setUserData(newUserData);
      } else {
        setUserData(userDoc.data() as UserData);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getLevelName = (level: number) => {
    const levels = ['Despertar Cru', 'Integração Real', 'Amplificação', 'Mestre'];
    return levels[level - 1] || 'Despertar Cru';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#D4AF37] text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Evolution Bar */}
      <EvolutionBar currentDay={userData?.currentDay || 1} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              ESPELHO 365
            </h1>
            <p className="text-white/60 text-sm">
              Nível {userData?.level}: {getLevelName(userData?.level || 1)}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-lg p-6">
            <div className="text-white/60 text-sm mb-1">Dias Olhando Espelho</div>
            <div className="text-3xl font-bold text-[#D4AF37]">
              {userData?.daysCompleted || 0}
            </div>
          </div>

          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-lg p-6">
            <div className="text-white/60 text-sm mb-1">Dias Colapsados</div>
            <div className="text-3xl font-bold text-white">
              {Math.floor((userData?.currentDay || 1) / 91)}
            </div>
          </div>

          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-lg p-6">
            <div className="text-white/60 text-sm mb-1">Dias Pulados</div>
            <div className="text-3xl font-bold text-white/40">
              {userData?.daysSkipped || 0}
            </div>
          </div>
        </div>

        {/* Cube Icon */}
        <div className="flex items-center justify-center py-12">
          <div className="relative">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              className="text-[#D4AF37]"
            >
              <path
                d="M60 10 L110 35 L110 85 L60 110 L10 85 L10 35 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M60 10 L60 60 M60 60 L110 85 M60 60 L10 85"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#D4AF37] text-2xl font-bold">
                {userData?.currentDay}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Modules (Coming Soon) */}
        <div className="text-center text-white/40 text-sm mt-12">
          Módulos semanais em breve...
        </div>
      </div>
    </div>
  );
}
