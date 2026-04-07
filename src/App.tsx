import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Crown, 
  TrendingUp, 
  TrendingDown, 
  LogOut, 
  User,
  LayoutDashboard,
  BarChart3,
  Star,
  Settings,
  Target,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  deleteDoc,
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  addDoc,
  serverTimestamp,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { Bet, PerformanceData, UserProfile } from './types';
import { BetCard } from './components/BetCard';
import { PerformanceChart } from './components/PerformanceChart';
import { VipSection } from './components/VipSection';
import { AuthForm } from './components/AuthForm';
import { AdminPanel } from './components/AdminPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { PersonalPerformance } from './components/PersonalPerformance';
import { generateDailyBets, checkBetResults } from './services/gemini';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'multi' | 'bingo' | 'vip' | 'admin' | 'settings' | 'my-stats'>('single');
  const isBettingTab = ['single', 'multi', 'bingo'].includes(activeTab);

  const [userBets, setUserBets] = useState<string[]>([]);
  const seedingRef = useRef(false);
  const autoGenRef = useRef(false);

  const showStatus = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 6000);
  };

  // Listen for Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const accessDoc = await getDoc(doc(db, 'system', 'access_control'));
          const accessData = accessDoc.exists() ? accessDoc.data() : { adminEmails: [], vipEmails: [] };
          
          const userEmail = firebaseUser.email?.toLowerCase() || '';
          const isOwner = userEmail === 'minecraftthedark@gmail.com';
          const isAdmin = isOwner || accessData.adminEmails.includes(userEmail);
          const isVip = isAdmin || accessData.vipEmails.includes(userEmail);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            const userEmail = firebaseUser.email?.toLowerCase() || '';
            const isOwner = userEmail === 'minecraftthedark@gmail.com';
            const isAdmin = isOwner || accessData.adminEmails.includes(userEmail);
            
            // Respect the isVip flag from the document if it's already true
            const isVip = isAdmin || accessData.vipEmails.includes(userEmail) || userData.isVip;
            
            if (userData.role !== (isAdmin ? 'admin' : 'user') || userData.isVip !== isVip) {
              const updatedProfile = { ...userData, role: isAdmin ? 'admin' as const : 'user' as const, isVip };
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
              setUser(updatedProfile);
            } else {
              setUser(userData);
            }
          } else {
            const userEmail = firebaseUser.email?.toLowerCase() || '';
            const isOwner = userEmail === 'minecraftthedark@gmail.com';
            const isAdmin = isOwner || accessData.adminEmails.includes(userEmail);
            const isVip = isAdmin || accessData.vipEmails.includes(userEmail);

            // Create initial profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: userEmail,
              isVip,
              role: isAdmin ? 'admin' : 'user',
              subscriptionStatus: 'none'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUser(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listen for pending users (Admin only)
  useEffect(() => {
    if (!user || user.role !== 'admin' || !authReady) return;
    
    const pendingQuery = query(collection(db, 'users'), where('subscriptionStatus', '==', 'pending'));
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setPendingUsers(users);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    
    return () => unsubscribePending();
  }, [user?.role, authReady]);

  // Sync Bets and Performance from Firestore
  useEffect(() => {
    if (!user || !authReady) return;

    // Listen to Bets - Simplified to avoid index errors on user's site
    const betsQuery = query(collection(db, 'bets'), orderBy('createdAt', 'desc'), limit(50));

    const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
      const allBets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
      const filtered = user.role === 'admin' || user.isVip
        ? allBets
        : allBets.filter(b => !b.isVip);
      setBets(filtered.slice(0, 20));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bets'));

    // Listen to Performance
    const perfQuery = query(collection(db, 'performance'), orderBy('date', 'asc'));
    const unsubscribePerf = onSnapshot(perfQuery, (snapshot) => {
      const fetchedPerf = snapshot.docs.map(doc => doc.data() as PerformanceData);
      setPerformanceData(fetchedPerf);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'performance'));

    return () => {
      unsubscribeBets();
      unsubscribePerf();
    };
  }, [user, authReady]);

  // Sync Taken Bets
  useEffect(() => {
    if (!user || !authReady) return;
    
    const unsubUserBets = onSnapshot(collection(db, 'users', user.uid, 'taken_bets'), (snapshot) => {
      setUserBets(snapshot.docs.map(doc => doc.id));
    });
    return () => unsubUserBets();
  }, [user, authReady]);

  // Seed initial realistic data if empty (Admin only or first run)
  useEffect(() => {
    const seedData = async () => {
      if (!user || user.role !== 'admin' || seedingRef.current) return;
      if (bets.length > 0) return;
      
      seedingRef.current = true;
      
      try {
        // Only generate initial bets via Gemini if empty, NO fake performance
        const initialBets = await generateDailyBets(user.isVip);
        for (const b of initialBets) {
          await setDoc(doc(db, 'bets', b.id), { ...b, createdAt: Timestamp.now() });
        }
      } catch (e) {
        console.error("Error seeding data:", e);
      }
    };
    
    if (authReady && user) seedData();
  }, [authReady, user, bets.length]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSubscribe = async () => {
    if (user) {
      try {
        const updatedProfile = { ...user, subscriptionStatus: 'pending' as const };
        await setDoc(doc(db, 'users', user.uid), updatedProfile);
        setUser(updatedProfile);
        showStatus("Solicitação enviada! Aguardando aprovação do pagamento.", "info");
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleApproveVip = async (uid: string) => {
    if (!user || user.role !== 'admin') return;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isVip: true,
        subscriptionStatus: 'active'
      });
      showStatus("Usuário aprovado com sucesso!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleAddManualBet = async (bet: Bet) => {
    try {
      await setDoc(doc(db, 'bets', bet.id), {
        ...bet,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bets');
    }
  };

  const handleForceAIGenerate = async () => {
    if (!user || user.role !== 'admin' || isGenerating) return;
    setIsGenerating(true);
    showStatus("Iniciando geração de apostas via IA...", "info");
    
    try {
      // Fetch all bets and filter in memory to avoid index issues and missing field issues
      const betsSnapshot = await getDocs(collection(db, 'bets'));
      const deletePromises = betsSnapshot.docs
        .filter(d => !d.data().isManual) // Clear anything that isn't explicitly manual
        .map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      const newBets = await generateDailyBets(true);
      if (newBets.length === 0) {
        showStatus("O Gemini atingiu o limite de requisições ou não encontrou jogos reais. Tente novamente em alguns minutos.", "error");
        return;
      }

      // Filter out duplicate bets (100% same matches and predictions)
      const uniqueBets: Bet[] = [];
      const seenBets = new Set<string>();

      for (const b of newBets) {
        const betFingerprint = b.matches
          .map(m => `${m.homeTeam}-${m.awayTeam}-${m.prediction}`)
          .sort()
          .join('|');
        
        if (!seenBets.has(betFingerprint)) {
          seenBets.add(betFingerprint);
          uniqueBets.push(b);
        }
      }

      for (const b of uniqueBets) {
        await setDoc(doc(db, 'bets', b.id), {
          ...b,
          isManual: false,
          createdAt: Timestamp.now()
        });
      }
      // Update last generation date
      await setDoc(doc(db, 'system', 'metadata'), {
        lastBetGeneration: new Date().toISOString().split('T')[0]
      }, { merge: true });
      showStatus("Grade de apostas atualizada com sucesso!", "success");
    } catch (error: any) {
      console.error("Error forcing AI generation:", error);
      const isQuota = error?.message?.includes('429') || error?.message?.includes('quota');
      showStatus(isQuota ? "Limite de uso do Gemini atingido. Aguarde um momento." : "Erro ao gerar apostas. Verifique o console.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Check for daily generation (00:01 logic)
  useEffect(() => {
    const checkDailyGeneration = async () => {
      if (!user || user.role !== 'admin' || !authReady || autoGenRef.current) return;
      
      autoGenRef.current = true;
      try {
        const metaDoc = await getDoc(doc(db, 'system', 'metadata'));
        const today = new Date().toISOString().split('T')[0];
        
        if (!metaDoc.exists() || metaDoc.data().lastBetGeneration !== today) {
          console.log("Daily generation triggered for:", today);
          await handleForceAIGenerate();
        }
      } catch (error) {
        console.error("Error checking daily generation:", error);
      }
    };
    
    if (authReady && user?.role === 'admin') {
      checkDailyGeneration();
    }
  }, [authReady, user?.role]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Zap className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
        <header className="p-6 flex justify-center border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="text-primary-foreground w-6 h-6 fill-primary-foreground" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter">XUBETS</h1>
          </div>
        </header>
        <main className="container mx-auto">
          <AuthForm onLogin={handleLogin} />
        </main>
      </div>
    );
  }

  const handleCheckResults = async () => {
    if (!user || user.role !== 'admin' || isGenerating) return;
    setIsGenerating(true);
    showStatus("Verificando resultados reais via IA...", "info");
    
    try {
      const pendingBets = bets.filter(b => b.result === 'pending');
      if (pendingBets.length === 0) {
        showStatus("Nenhuma aposta pendente para verificar.", "info");
        return;
      }

      const results = await checkBetResults(pendingBets);
      if (results.length === 0) {
        showStatus("O Gemini não encontrou resultados definitivos para os jogos pendentes ainda.", "info");
        return;
      }

      for (const res of results) {
        await handleUpdateBetResult(res.id, res.result);
      }
      showStatus(`${results.length} resultados atualizados com sucesso!`, "success");
    } catch (error: any) {
      console.error("Error checking results:", error);
      const isQuota = error?.message?.includes('429') || error?.message?.includes('quota');
      showStatus(isQuota ? "Limite de uso do Gemini atingido." : "Erro ao verificar resultados.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateBetResult = async (betId: string, result: 'win' | 'loss' | 'pending') => {
    if (!user || user.role !== 'admin') return;
    try {
      const bet = bets.find(b => b.id === betId);
      if (!bet || bet.result === result) return;

      // Update the bet result
      await setDoc(doc(db, 'bets', betId), { result }, { merge: true });
      
      // Handle performance tracking
      // 1. If we are setting a result (win/loss) from pending
      if (bet.result === 'pending' && result !== 'pending') {
        const units = result === 'win' ? (bet.odds - 1) : -1;
        await addDoc(collection(db, 'performance'), {
          date: new Date().toISOString().split('T')[0],
          units,
          type: bet.type,
          betId: bet.id // Link it to the bet
        });
      } 
      // 2. If we are clearing a result (setting to pending)
      else if (bet.result !== 'pending' && result === 'pending') {
        // Find and delete the performance entry for this bet
        const perfSnapshot = await getDocs(query(collection(db, 'performance'), where('betId', '==', bet.id)));
        const deletePromises = perfSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
      // 3. If we are changing from win to loss or vice versa
      else if (bet.result !== 'pending' && result !== 'pending') {
        // Update existing performance entry
        const perfSnapshot = await getDocs(query(collection(db, 'performance'), where('betId', '==', bet.id)));
        const units = result === 'win' ? (bet.odds - 1) : -1;
        
        if (perfSnapshot.empty) {
          // If for some reason it didn't exist, create it
          await addDoc(collection(db, 'performance'), {
            date: new Date().toISOString().split('T')[0],
            units,
            type: bet.type,
            betId: bet.id
          });
        } else {
          // Update all entries found (should be only one)
          const updatePromises = perfSnapshot.docs.map(d => setDoc(d.ref, { units }, { merge: true }));
          await Promise.all(updatePromises);
        }
      }
    } catch (error) {
      console.error("Error updating bet result:", error);
    }
  };

  const handleClearDatabase = async () => {
    if (!user || user.role !== 'admin') return;
    
    setIsGenerating(true);
    try {
      // Clear Bets
      const betsSnapshot = await getDocs(collection(db, 'bets'));
      let batch = writeBatch(db);
      let count = 0;
      
      for (const d of betsSnapshot.docs) {
        batch.delete(d.ref);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      
      // Clear Performance
      const perfSnapshot = await getDocs(collection(db, 'performance'));
      batch = writeBatch(db);
      count = 0;
      for (const d of perfSnapshot.docs) {
        batch.delete(d.ref);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      
      // Clear Metadata
      await deleteDoc(doc(db, 'system', 'metadata'));
      
      setBets([]);
      setPerformanceData([]);
      showStatus("Banco de dados limpo com sucesso!", "success");
    } catch (error) {
      console.error("Error clearing database:", error);
      showStatus("Erro ao limpar banco de dados.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearCurrentBets = async () => {
    if (!user || user.role !== 'admin' || isGenerating) return;
    
    setIsGenerating(true);
    showStatus("Limpando lista de apostas...", "info");
    try {
      const betsSnapshot = await getDocs(collection(db, 'bets'));
      const deletePromises = betsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
      setBets([]);
      showStatus("Lista de apostas limpa com sucesso!", "success");
    } catch (error) {
      console.error("Error clearing bets:", error);
      showStatus("Erro ao limpar apostas.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTakeBet = async (betId: string) => {
    if (!user) return;
    try {
      const betRef = doc(db, 'users', user.uid, 'taken_bets', betId);
      if (userBets.includes(betId)) {
        await deleteDoc(betRef);
      } else {
        await setDoc(betRef, { takenAt: serverTimestamp() });
      }
    } catch (error) {
      console.error("Error taking bet:", error);
    }
  };

  // ROI calculation
  const calculateROI = () => {
    const takenAndResolved = bets.filter(b => userBets.includes(b.id) && b.result && b.result !== 'pending');
    if (takenAndResolved.length === 0) return "0.0%";
    
    const totalProfit = takenAndResolved.reduce((acc, curr) => acc + (curr.result === 'win' ? curr.odds - 1 : -1), 0);
    const totalInvested = takenAndResolved.length;
    const roi = (totalProfit / totalInvested) * 100;
    return `${roi.toFixed(1)}%`;
  };

  const filteredBets = bets.filter(b => {
    if (activeTab === 'vip') return b.isVip;
    if (activeTab === 'admin') return true;
    if (['single', 'multi', 'bingo'].includes(activeTab)) {
      return b.type === activeTab;
    }
    return false;
  });
  const tabPerformance = performanceData.filter(p => p.type === (activeTab === 'vip' ? 'single' : activeTab));
  const totalUnits = performanceData.reduce((acc, curr) => acc + curr.units, 0);
  const myPerformance = bets
    .filter(b => userBets.includes(b.id) && b.result !== 'pending')
    .reduce((acc, b) => acc + (b.result === 'win' ? (b.odds - 1) : -1), 0);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Sidebar / Navigation Rail - Desktop Only */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 border-r border-border bg-card z-50 flex flex-col items-center py-8 gap-8">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/10">
          <Zap className="text-primary-foreground w-7 h-7 fill-primary-foreground" />
        </div>
        
        <nav className="flex flex-col gap-4 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`w-12 h-12 rounded-xl ${isBettingTab ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`} 
            onClick={() => setActiveTab('single')}
            title="Palpites"
          >
            <Target className="w-6 h-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`w-12 h-12 rounded-xl ${activeTab === 'my-stats' ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`}
            onClick={() => setActiveTab('my-stats')}
            title="Meu Desempenho"
          >
            <BarChart3 className="w-6 h-6" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className={`w-12 h-12 rounded-xl ${activeTab === 'vip' ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`}
            onClick={() => setActiveTab('vip')}
            title="VIP"
          >
            <Crown className="w-6 h-6" />
          </Button>

          {user.role === 'admin' && (
            <>
              <Separator className="bg-border/50 my-2" />
              <Button 
                variant="ghost" 
                size="icon" 
                className={`w-12 h-12 rounded-xl ${activeTab === 'admin' ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                onClick={() => setActiveTab('admin')}
                title="Admin"
              >
                <ShieldCheck className="w-6 h-6" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`w-12 h-12 rounded-xl ${activeTab === 'settings' ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                onClick={() => setActiveTab('settings')}
                title="Configurações"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </>
          )}
        </nav>

        <div className="flex flex-col gap-4 mt-auto mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-xl text-muted-foreground hover:bg-accent"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Bottom Navigation & Stats - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col">
        {/* Stats Bar Fixed at Bottom */}
        <div className="bg-card/95 backdrop-blur-md border-t border-border px-2 py-2 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
          <div className="flex flex-col">
            <span className="text-[7px] uppercase tracking-wider font-bold text-muted-foreground">Meus Lucros</span>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-black ${myPerformance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {myPerformance > 0 ? '+' : ''}{myPerformance.toFixed(1)}u
              </span>
              {myPerformance >= 0 ? <TrendingUp className="w-2.5 h-2.5 text-primary" /> : <TrendingDown className="w-2.5 h-2.5 text-destructive" />}
            </div>
          </div>
          
          <Separator orientation="vertical" className="h-5 bg-border/50" />
          
          <div className="flex flex-col">
            <span className="text-[7px] uppercase tracking-wider font-bold text-muted-foreground">Plataforma</span>
            <span className={`text-[10px] font-black ${totalUnits >= 0 ? 'text-primary/70' : 'text-destructive/70'}`}>
              {totalUnits > 0 ? '+' : ''}{totalUnits.toFixed(1)}u
            </span>
          </div>

          <Separator orientation="vertical" className="h-5 bg-border/50" />

          <div className="flex flex-col">
            <span className="text-[7px] uppercase tracking-wider font-bold text-muted-foreground">ROI</span>
            <span className="text-[10px] font-black text-foreground">{calculateROI()}</span>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="h-16 bg-card border-t border-border flex items-center justify-around px-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center gap-1 ${isBettingTab ? 'text-primary' : 'text-muted-foreground'}`} 
            onClick={() => setActiveTab('single')}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] font-bold">Palpites</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center gap-1 ${activeTab === 'my-stats' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('my-stats')}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-bold">Stats</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center gap-1 ${activeTab === 'vip' ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('vip')}
          >
            <Crown className="w-5 h-5" />
            <span className="text-[10px] font-bold">VIP</span>
          </Button>

          {user.role === 'admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center gap-1 ${activeTab === 'admin' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('admin')}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-bold">Admin</span>
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-1 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-bold">Sair</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-0 md:pl-20 min-h-screen pb-32 md:pb-0">
        {status && (
          <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3 max-w-md ${
            status.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' : 
            status.type === 'error' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 
            'bg-card border-border text-foreground'
          }`}>
            {status.type === 'success' ? <Trophy className="w-5 h-5" /> : 
             status.type === 'error' ? <ShieldCheck className="w-5 h-5" /> : 
             <Zap className="w-5 h-5" />}
            <p className="text-sm font-bold">{status.message}</p>
          </div>
        )}

        <header className="h-16 md:h-20 border-b border-border flex items-center justify-between px-3 md:px-8 sticky top-0 bg-background/80 backdrop-blur-md z-40">
          <div className="max-w-[70%] sm:max-w-none">
            <h2 className="text-lg md:text-xl font-bold tracking-tight truncate">Dashboard</h2>
            <p className="text-[8px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider truncate">Sua vantagem inteligente no jogo.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user.email}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                {user.isVip ? 'Membro VIP' : 'Membro Free'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        <div className="px-0 md:px-8 py-6 md:p-8 max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6 md:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 px-4 md:px-0">
              {isBettingTab ? (
                <TabsList className="bg-card border border-border p-1 h-12 w-full lg:w-auto overflow-x-auto justify-start lg:justify-center scrollbar-hide">
                  <TabsTrigger value="single" className="flex-1 lg:flex-none px-2 md:px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm">
                    <Target className="w-3.5 h-3.5 md:w-4 h-4" /> Individual
                  </TabsTrigger>
                  <TabsTrigger value="multi" className="flex-1 lg:flex-none px-2 md:px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm">
                    <Layers className="w-3.5 h-3.5 md:w-4 h-4" /> Múltipla
                  </TabsTrigger>
                  <TabsTrigger value="bingo" className="flex-1 lg:flex-none px-2 md:px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-1 md:gap-2 whitespace-nowrap text-xs md:text-sm">
                    <Trophy className="w-3.5 h-3.5 md:w-4 h-4" /> Bingo
                  </TabsTrigger>
                </TabsList>
              ) : (
                <div className="h-12 flex items-center">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">
                    {activeTab === 'my-stats' ? 'Meu Desempenho' : 
                     activeTab === 'vip' ? 'Área VIP' : 
                     activeTab === 'admin' ? 'Painel Admin' : 'Configurações'}
                  </h2>
                </div>
              )}

              {/* Stats Bar - Desktop Only (Hidden on Mobile as it's fixed at bottom) */}
              <div className="hidden lg:flex items-center justify-between lg:justify-end gap-4 md:gap-6 bg-card border border-border px-4 md:px-6 py-3 rounded-2xl overflow-x-auto">
                <div className="flex flex-col min-w-max">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Meus Lucros</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm md:text-base font-black ${myPerformance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {myPerformance > 0 ? '+' : ''}{myPerformance.toFixed(1)}u
                    </span>
                    {myPerformance >= 0 ? <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-primary" /> : <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-destructive" />}
                  </div>
                </div>
                
                <Separator orientation="vertical" className="h-8 bg-border/50" />
                
                <div className="flex flex-col min-w-max">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Plataforma</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm md:text-base font-black ${totalUnits >= 0 ? 'text-primary/70' : 'text-destructive/70'}`}>
                      {totalUnits > 0 ? '+' : ''}{totalUnits.toFixed(1)}u
                    </span>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-8 bg-border/50" />

                <div className="flex flex-col min-w-max">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground">ROI</span>
                  <span className="text-sm md:text-base font-black text-foreground">{calculateROI()}</span>
                </div>
              </div>
            </div>

            <TabsContent value="vip" className="mt-0">
              <VipSection 
                onSubscribe={handleSubscribe} 
                isVip={user.isVip} 
                subscriptionStatus={user.subscriptionStatus}
              />
            </TabsContent>

            <TabsContent value="my-stats" className="mt-0">
              <PersonalPerformance bets={bets} userBets={userBets} />
            </TabsContent>

            {user.role === 'admin' && (
              <TabsContent value="admin" className="mt-0">
                <AdminPanel 
                  onAddBet={handleAddManualBet} 
                  onForceGenerate={handleForceAIGenerate} 
                  onCheckResults={handleCheckResults}
                  onClearDatabase={handleClearDatabase}
                  onClearBets={handleClearCurrentBets}
                  onApproveVip={handleApproveVip}
                  pendingUsers={pendingUsers}
                  onShowStatus={showStatus}
                  isGenerating={isGenerating} 
                />
              </TabsContent>
            )}

            {user.role === 'admin' && (
              <TabsContent value="settings" className="mt-0">
                <SettingsPanel />
              </TabsContent>
            )}

            {['single', 'multi', 'bingo'].map((type) => (
              <TabsContent key={type} value={type} className="mt-0 space-y-8">
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-3 md:px-0">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight uppercase">Palpites do Dia</h3>
                      <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 text-[10px] md:text-xs">
                        {new Date().toLocaleDateString()}
                      </Badge>
                    </div>
                    
                    {loading ? (
                      <div className="grid gap-6">
                        {[1, 2].map(i => (
                          <Card key={i} className="bg-card border-border h-64 animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        <AnimatePresence mode="popLayout">
                          {filteredBets.map((bet, idx) => (
                            <motion.div
                              key={bet.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                            >
                              <BetCard 
                                bet={bet} 
                                isVipUser={user.isVip} 
                                isTaken={userBets.includes(bet.id)}
                                onTakeBet={() => handleTakeBet(bet.id)}
                                onUpdateResult={user.role === 'admin' ? (res) => handleUpdateBetResult(bet.id, res) : undefined}
                                onSubscribe={() => setActiveTab('vip')}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {filteredBets.length === 0 && (
                          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
                            <p className="text-muted-foreground">Nenhum palpite disponível para esta categoria hoje.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <Card className="bg-card border-border shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" /> Performance {type === 'single' ? 'Individual' : type === 'multi' ? 'Múltipla' : 'Bingo'}
                        </CardTitle>
                        <CardDescription>Lucro/Prejuízo acumulado em unidades</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <PerformanceChart 
                          data={tabPerformance} 
                          color={type === 'single' ? '#10b981' : type === 'multi' ? '#3b82f6' : '#eab308'} 
                          height={240}
                        />
                        <div className="mt-6 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Stake Padrão</span>
                            <span className="font-bold">{type === 'bingo' ? '0.1u' : '1.0u'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Últimos 7 dias</span>
                            <span className={`${tabPerformance.reduce((acc, curr) => acc + curr.units, 0) >= 0 ? 'text-primary' : 'text-destructive'} font-bold`}>
                              {tabPerformance.reduce((acc, curr) => acc + curr.units, 0) > 0 ? '+' : ''}
                              {tabPerformance.reduce((acc, curr) => acc + curr.units, 0).toFixed(1)}u
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-primary/10 to-transparent border-border">
                      <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest">Dica do Gemini</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground leading-relaxed">
                        A gestão de banca é fundamental. Para o mercado de {type}, recomendamos não exceder 2% da sua banca total por entrada.
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
