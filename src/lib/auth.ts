import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserData {
  email: string;
  createdAt: any;
  trialStartDate: any;
  trialEndDate: any;
  isPremium: boolean;
  allowedFeatures: string[];
}

// Funcionalidades disponíveis no trial
export const TRIAL_FEATURES = ['sombra', 'espelho-livre', 'fechamento'];
export const PREMIUM_FEATURES = ['sombra', 'espelho-livre', 'fechamento', 'todas-funcionalidades'];

// Login com e-mail e senha
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Registro com e-mail e senha
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Criar documento do usuário com trial de 7 dias
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      createdAt: serverTimestamp(),
      trialStartDate: serverTimestamp(),
      trialEndDate: trialEndDate,
      isPremium: false,
      allowedFeatures: TRIAL_FEATURES
    });
    
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Login com Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Verificar se é novo usuário
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Criar documento do usuário com trial de 7 dias
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: serverTimestamp(),
        trialStartDate: serverTimestamp(),
        trialEndDate: trialEndDate,
        isPremium: false,
        allowedFeatures: TRIAL_FEATURES
      });
    }
    
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Logout
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Verificar se usuário completou o onboarding
export const checkOnboardingStatus = async (userId: string): Promise<boolean> => {
  try {
    const onboardingDoc = await getDoc(doc(db, 'onboarding', userId));
    return onboardingDoc.exists();
  } catch (error) {
    console.error('Erro ao verificar status do onboarding:', error);
    return false;
  }
};

// Verificar status do trial
export const checkTrialStatus = async (userId: string): Promise<{
  isTrialActive: boolean;
  daysRemaining: number;
  isPremium: boolean;
  allowedFeatures: string[];
}> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return {
        isTrialActive: false,
        daysRemaining: 0,
        isPremium: false,
        allowedFeatures: []
      };
    }
    
    const userData = userDoc.data() as UserData;
    const now = new Date();
    const trialEnd = userData.trialEndDate?.toDate();
    
    if (userData.isPremium) {
      return {
        isTrialActive: false,
        daysRemaining: 0,
        isPremium: true,
        allowedFeatures: PREMIUM_FEATURES
      };
    }
    
    if (trialEnd && now < trialEnd) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isTrialActive: true,
        daysRemaining,
        isPremium: false,
        allowedFeatures: TRIAL_FEATURES
      };
    }
    
    return {
      isTrialActive: false,
      daysRemaining: 0,
      isPremium: false,
      allowedFeatures: []
    };
  } catch (error) {
    console.error('Erro ao verificar status do trial:', error);
    return {
      isTrialActive: false,
      daysRemaining: 0,
      isPremium: false,
      allowedFeatures: []
    };
  }
};

// Verificar se usuário tem acesso a uma funcionalidade
export const hasFeatureAccess = (allowedFeatures: string[], feature: string): boolean => {
  return allowedFeatures.includes(feature) || allowedFeatures.includes('todas-funcionalidades');
};
