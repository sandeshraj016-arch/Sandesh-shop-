/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
} from './firebase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  Heart, 
  Eye, 
  TrendingUp, 
  History, 
  LogOut, 
  Instagram,
  Plus,
  BarChart3,
  ShieldCheck,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Types ---
interface UserStats {
  followers: number;
  likes: number;
  views: number;
  displayName: string;
  photoURL: string;
}

interface SimulationRecord {
  id: string;
  type: 'followers' | 'likes' | 'views';
  amount: number;
  timestamp: any;
}

// --- Components ---

const LoginScreen = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully signed in!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
              <Instagram className="text-white w-10 h-10" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-white">SocialBoost</CardTitle>
            <CardDescription className="text-zinc-400">
              The ultimate growth simulator for influencers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Secure Google Authentication</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Real-time growth visualization</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Advanced simulation algorithms</span>
              </div>
            </div>
            <Button 
              onClick={handleLogin}
              className="w-full bg-white text-black hover:bg-zinc-200 h-12 text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in with Google
            </Button>
            <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest">
              Simulation purposes only • No real followers provided
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
  <Card className="bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 transition-all group overflow-hidden relative">
    <div className={cn("absolute top-0 left-0 w-1 h-full", color)} />
    <CardContent className="p-6 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white tabular-nums">
          {value.toLocaleString()}
        </h3>
      </div>
      <div className={cn("p-3 rounded-xl transition-all group-hover:scale-110", color.replace('bg-', 'bg-opacity-10 text-'))}>
        <Icon className="w-6 h-6" />
      </div>
    </CardContent>
    <button 
      onClick={onClick}
      className="absolute bottom-2 right-2 p-1 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
    >
      <Plus className="w-4 h-4" />
    </button>
  </Card>
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({ followers: 0, likes: 0, views: 0, displayName: '', photoURL: '' });
  const [history, setHistory] = useState<SimulationRecord[]>([]);
  const [profileLink, setProfileLink] = useState('');
  const [videoLink, setVideoLink] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Initialize or fetch user doc
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const initialStats = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || 'Influencer',
            photoURL: currentUser.photoURL || '',
            followers: 1250,
            likes: 8400,
            views: 25000,
            lastUpdated: serverTimestamp()
          };
          await setDoc(userRef, initialStats);
          setStats(initialStats as any);
        }

        // Listen for stats updates
        onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setStats(doc.data() as UserStats);
          }
        });

        // Listen for simulation history
        const historyQuery = query(
          collection(db, 'users', currentUser.uid, 'simulations'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        onSnapshot(historyQuery, (snapshot) => {
          const records = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as SimulationRecord[];
          setHistory(records);
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const runSimulation = async (type: 'followers' | 'likes' | 'views', amount: number) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const simRef = collection(db, 'users', user.uid, 'simulations');

    try {
      // Add history record
      await addDoc(simRef, {
        uid: user.uid,
        type,
        amount,
        timestamp: serverTimestamp()
      });

      // Update user stats
      await setDoc(userRef, {
        ...stats,
        [type]: stats[type] + amount,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      toast.success(`Successfully simulated +${amount.toLocaleString()} ${type}!`);
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Simulation failed. Check your connection.');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileLink.trim()) return;
    if (!profileLink.includes('instagram.com/')) {
      toast.error('Please enter a valid Instagram profile link');
      return;
    }
    runSimulation('followers', 100);
    setProfileLink('');
  };

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoLink.trim()) return;
    if (!videoLink.includes('instagram.com/')) {
      toast.error('Please enter a valid Instagram video/reel link');
      return;
    }
    runSimulation('likes', 100);
    runSimulation('views', 100);
    setVideoLink('');
  };

  const chartData = useMemo(() => {
    // Generate some mock historical data based on current stats and history
    // In a real app, we'd store daily snapshots
    const baseDate = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        followers: Math.max(0, stats.followers - (6 - i) * 50),
        likes: Math.max(0, stats.likes - (6 - i) * 200),
        views: Math.max(0, stats.views - (6 - i) * 1000),
      };
    });
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-zinc-800 border-t-purple-500 rounded-full"
        />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-purple-500/30">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
              <Instagram className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">SocialBoost</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900/50 rounded-full border border-zinc-800">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback className="bg-zinc-800 text-[10px]">{user.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-zinc-300 hidden sm:block">{user.displayName}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => signOut(auth)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Stats & Actions */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-zinc-500 text-sm">Real-time simulation metrics and growth tools.</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1 px-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                Live Simulation
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard 
                title="Followers" 
                value={stats.followers} 
                icon={Users} 
                color="bg-purple-500"
                onClick={() => runSimulation('followers', 100)}
              />
              <StatCard 
                title="Likes" 
                value={stats.likes} 
                icon={Heart} 
                color="bg-pink-500"
                onClick={() => runSimulation('likes', 500)}
              />
              <StatCard 
                title="Views" 
                value={stats.views} 
                icon={Eye} 
                color="bg-blue-500"
                onClick={() => runSimulation('views', 2500)}
              />
            </div>

            {/* Chart Section */}
            <Card className="bg-zinc-900/40 border-zinc-800/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Growth Analytics</CardTitle>
                  <CardDescription>Simulated performance over the last 7 days</CardDescription>
                </div>
                <BarChart3 className="w-5 h-5 text-zinc-500" />
              </CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#71717a" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="followers" 
                      stroke="#a855f7" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorFollowers)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-zinc-900/40 border-zinc-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Boost Pack
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-zinc-800 hover:bg-zinc-800"
                    onClick={() => runSimulation('followers', 500)}
                  >
                    +500 Followers
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-zinc-800 hover:bg-zinc-800"
                    onClick={() => runSimulation('likes', 2000)}
                  >
                    +2k Likes
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/40 border-zinc-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Viral Simulation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white border-0"
                    onClick={() => {
                      runSimulation('views', 10000);
                      runSimulation('likes', 1000);
                    }}
                  >
                    Go Viral (+10k Views)
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Link Inputs Section */}
            <Card className="bg-zinc-900/40 border-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-purple-500" />
                  Growth Tools
                </CardTitle>
                <CardDescription>Enter links to simulate targeted growth</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleProfileSubmit} className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Instagram Profile Link</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="url" 
                        placeholder="https://instagram.com/username" 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        value={profileLink}
                        onChange={(e) => setProfileLink(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white shrink-0">
                      Get Followers
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-600 italic">Simulates +100 followers per link</p>
                </form>

                <Separator className="bg-zinc-800" />

                <form onSubmit={handleVideoSubmit} className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Instagram Video/Reel Link</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="url" 
                        placeholder="https://instagram.com/reels/..." 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                      Get Likes & Views
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-600 italic">Simulates +100 likes & +100 views per link</p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: History & Profile */}
          <div className="space-y-8">
            <Card className="bg-zinc-900/40 border-zinc-800/50 h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-zinc-500" />
                  Activity Log
                </CardTitle>
                <CardDescription>Your recent simulation history</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[600px] px-6">
                  <div className="space-y-6 py-4">
                    <AnimatePresence mode="popLayout">
                      {history.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600">
                          <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p>No activity yet</p>
                        </div>
                      ) : (
                        history.map((item, idx) => (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-start gap-4 relative"
                          >
                            {idx !== history.length - 1 && (
                              <div className="absolute left-[11px] top-7 bottom-[-24px] w-px bg-zinc-800" />
                            )}
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10",
                              item.type === 'followers' ? 'bg-purple-500/20 text-purple-500' :
                              item.type === 'likes' ? 'bg-pink-500/20 text-pink-500' :
                              'bg-blue-500/20 text-blue-500'
                            )}>
                              {item.type === 'followers' ? <Users className="w-3 h-3" /> :
                               item.type === 'likes' ? <Heart className="w-3 h-3" /> :
                               <Eye className="w-3 h-3" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">
                                +{item.amount.toLocaleString()} {item.type}
                              </p>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                {item.timestamp?.toDate().toLocaleString() || 'Just now'}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] mb-4">SocialBoost Simulator v1.0</p>
          <div className="flex justify-center gap-8 text-zinc-600 text-[10px] uppercase tracking-widest">
            <span>No real data shared</span>
            <span>Educational purpose</span>
            <span>Privacy focused</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
