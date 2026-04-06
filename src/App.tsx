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
  Settings
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
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { Bet, PerformanceData, UserProfile } from './types';
import { BetCard } from './components/BetCard';
import { PerformanceChart } from './components/PerformanceChart';
import { VipSection } from './components/VipSection';
import { AuthForm } from './components/AuthForm';
import { AdminPanel } from './components/AdminPanel';
import { generateDailyBets } from './services/gemini';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'multi' | 'bingo' | 'vip' | 'admin'>('single');

  const seedingRef = useRef(false);

  // Listen for Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const isOwner = firebaseUser.email?.toLowerCase() === 'minecraftthedark@gmail.com';
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            // Ensure owner always has admin role even if document was created as 'user'
            if (isOwner && userData.role !== 'admin') {
              const updatedProfile = { ...userData, role: 'admin' as const, isVip: true };
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
              setUser(updatedProfile);
            } else {
              setUser(userData);
            }
          } else {
            // Create initial profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              isVip: isOwner, // Owner is VIP by default
              role: isOwner ? 'admin' : 'user'
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

  // Sync Bets and Performance from Firestore
  useEffect(() => {
    if (!user || !authReady) return;

    // Listen to Bets
    const betsQuery = query(collection(db, 'bets'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribeBets = onSnapshot(betsQuery, (snapshot) => {
      const fetchedBets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
      setBets(fetchedBets);
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

  // Seed initial realistic data if empty (Admin only or first run)
  useEffect(() => {
    const seedData = async () => {
      if (!user || user.role !== 'admin' || seedingRef.current) return;
      if (bets.length > 0 || performanceData.length > 0) return;
      
      seedingRef.current = true;
      console.log("Seeding realistic performance data...");
      const initialPerf: PerformanceData[] = [
        { date: '2026-03-30', units: 1.2, type: 'single' },
        { date: '2026-03-31', units: -1.0, type: 'single' },
        { date: '2026-04-01', units: 0.8, type: 'single' },
        { date: '2026-04-02', units: -1.0, type: 'single' },
        { date: '2026-04-03', units: 1.5, type: 'single' },
        { date: '2026-04-04', units: -0.5, type: 'single' },
        { date: '2026-04-05', units: 1.1, type: 'single' },
        { date: '2026-04-06', units: -1.0, type: 'single' },
        { date: '2026-04-01', units: 2.1, type: 'multi' },
        { date: '2026-04-02', units: -1.0, type: 'multi' },
        { date: '2026-04-03', units: -1.0, type: 'multi' },
        { date: '2026-04-04', units: 2.5, type: 'multi' },
        { date: '2026-04-05', units: -1.0, type: 'multi' },
        { date: '2026-04-01', units: -0.1, type: 'bingo' },
        { date: '2026-04-02', units: -0.1, type: 'bingo' },
        { date: '2026-04-03', units: 1.2, type: 'bingo' },
        { date: '2026-04-04', units: -0.1, type: 'bingo' },
        { date: '2026-04-05', units: -0.1, type: 'bingo' },
      ];

      try {
        for (const p of initialPerf) {
          const id = `${p.type}_${p.date.replace(/-/g, '')}`;
          await setDoc(doc(db, 'performance', id), p);
        }
        
        // Generate initial bets via Gemini if empty
        const initialBets = await generateDailyBets(user.isVip);
        for (const b of initialBets) {
          await setDoc(doc(db, 'bets', b.id), { ...b, createdAt: Timestamp.now() });
        }
      } catch (e) {
        console.error("Error seeding data:", e);
      }
    };
    
    if (authReady && user) seedData();
  }, [authReady, user, bets.length, performanceData.length]);

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
        await setDoc(doc(db, 'users', user.uid), { ...user, isVip: true });
        setUser({ ...user, isVip: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
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
    if (!user || user.role !== 'admin') return;
    setIsGenerating(true);
    try {
      const newBets = await generateDailyBets(true);
      for (const b of newBets) {
        await setDoc(doc(db, 'bets', b.id), {
          ...b,
          createdAt: Timestamp.now()
        });
      }
      // Update last generation date
      await setDoc(doc(db, 'system', 'metadata'), {
        lastBetGeneration: new Date().toISOString().split('T')[0]
      }, { merge: true });
    } catch (error) {
      console.error("Error forcing AI generation:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Check for daily generation (00:01 logic)
  useEffect(() => {
    const checkDailyGeneration = async () => {
      if (!user || user.role !== 'admin' || !authReady) return;
      
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

  const filteredBets = bets.filter(b => b.type === activeTab);
  const tabPerformance = performanceData.filter(p => p.type === (activeTab === 'vip' ? 'single' : activeTab));
  const totalUnits = performanceData.reduce((acc, curr) => acc + curr.units, 0);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Sidebar / Navigation Rail */}
      <div className="fixed left-0 top-0 bottom-0 w-20 border-r border-border bg-card z-50 flex flex-col items-center py-8 gap-8">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/10">
          <Zap className="text-primary-foreground w-7 h-7 fill-primary-foreground" />
        </div>
        
        <nav className="flex flex-col gap-4 flex-1">
          <Button variant="ghost" size="icon" className={`w-12 h-12 rounded-xl ${activeTab !== 'vip' && activeTab !== 'admin' ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent'}`} onClick={() => setActiveTab('single')}>
            <LayoutDashboard className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl hover:bg-accent text-muted-foreground">
            <BarChart3 className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl hover:bg-accent text-muted-foreground">
            <Star className="w-6 h-6" />
          </Button>
        </nav>

        <div className="flex flex-col gap-4">
          {user.role === 'admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`w-12 h-12 rounded-xl ${activeTab === 'admin' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent'}`}
              onClick={() => setActiveTab('admin')}
            >
              <Settings className="w-6 h-6" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`w-12 h-12 rounded-xl ${activeTab === 'vip' ? 'text-yellow-500 bg-yellow-500/10' : 'text-muted-foreground hover:bg-accent'}`}
            onClick={() => setActiveTab('vip')}
          >
            <Crown className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl hover:bg-accent text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <header className="h-20 border-b border-border flex items-center justify-between px-8 sticky top-0 bg-background/80 backdrop-blur-md z-40">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Sua vantagem inteligente no jogo.</p>
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

        <div className="p-8 max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <TabsList className="bg-card border border-border p-1 h-12">
                <TabsTrigger value="single" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-2">
                  <ShieldCheck className="w-4 h-4" /> Individual
                </TabsTrigger>
                <TabsTrigger value="multi" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-2">
                  <Zap className="w-4 h-4" /> Múltipla
                </TabsTrigger>
                <TabsTrigger value="bingo" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-2">
                  <Trophy className="w-4 h-4" /> Bingo
                </TabsTrigger>
                <TabsTrigger value="vip" className="px-6 h-10 data-[state=active]:bg-yellow-500 data-[state=active]:text-black font-bold gap-2">
                  <Crown className="w-4 h-4" /> VIP
                </TabsTrigger>
                {user.role === 'admin' && (
                  <TabsTrigger value="admin" className="px-6 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold gap-2">
                    <Settings className="w-4 h-4" /> Admin
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex items-center gap-6 bg-card border border-border px-6 py-3 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Performance Total</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-black ${totalUnits >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {totalUnits > 0 ? '+' : ''}{totalUnits.toFixed(1)}u
                    </span>
                    {totalUnits >= 0 ? <TrendingUp className="w-4 h-4 text-primary" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8 bg-border" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">ROI</span>
                  <span className="text-xl font-black text-foreground">12.4%</span>
                </div>
              </div>
            </div>

            <TabsContent value="vip" className="mt-0">
              <VipSection onSubscribe={handleSubscribe} isVip={user.isVip} />
            </TabsContent>

            {user.role === 'admin' && (
              <TabsContent value="admin" className="mt-0">
                <AdminPanel 
                  onAddBet={handleAddManualBet} 
                  onForceGenerate={handleForceAIGenerate} 
                  isGenerating={isGenerating} 
                />
              </TabsContent>
            )}

            {['single', 'multi', 'bingo'].map((type) => (
              <TabsContent key={type} value={type} className="mt-0 space-y-8">
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black tracking-tight uppercase">Palpites do Dia</h3>
                      <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
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
                              <BetCard bet={bet} isVipUser={user.isVip} />
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
                        />
                        <div className="mt-6 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Stake Padrão</span>
                            <span className="font-bold">{type === 'bingo' ? '0.1u' : '1.0u'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Últimos 7 dias</span>
                            <span className="text-primary font-bold">+4.5u</span>
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
