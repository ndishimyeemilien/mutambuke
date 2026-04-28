'use client';

import React, { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  User, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Bike, 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  FileText, 
  Search,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { collection, doc, updateDoc, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Input } from '@/components/ui/input';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('dashboard');

  const pendingQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'drivers'), where('verificationStatus', '==', 'pending'));
  }, [db]);
  const { data: pendingRiders } = useCollection(pendingQuery);

  const allRidersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'drivers');
  }, [db]);
  const { data: allRiders } = useCollection(allRidersQuery);

  const stats = {
    total: allRiders?.length || 0,
    approved: allRiders?.filter(r => r.verificationStatus === 'approved').length || 0,
    pending: allRiders?.filter(r => r.verificationStatus === 'pending').length || 0,
  };

  async function updateVerification(riderId: string, status: 'approved' | 'rejected') {
    if (!db) return;
    updateDoc(doc(db, 'drivers', riderId), {
      verificationStatus: status
    });
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-primary text-white flex flex-col sticky top-0 h-screen shadow-2xl z-50">
        <div className="p-10">
           <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-2">MUTAMBUKE</h1>
           <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">ADMIN CONTROL</p>
        </div>

        <nav className="flex-1 px-6 space-y-2">
           <Button 
            variant="ghost" 
            onClick={() => setActiveNav('dashboard')}
            className={`w-full h-14 justify-start gap-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeNav === 'dashboard' ? 'bg-white/10 text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
           >
              <LayoutDashboard className="size-5" /> Dashboard
           </Button>
           <Button 
            variant="ghost" 
            onClick={() => setActiveNav('riders')}
            className={`w-full h-14 justify-start gap-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeNav === 'riders' ? 'bg-white/10 text-accent' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
           >
              <ShieldCheck className="size-5" /> Verify Riders
           </Button>
           <Button 
            variant="ghost" 
            className="w-full h-14 justify-start gap-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white/40"
           >
              <Users className="size-5" /> User Control
           </Button>
           <Button 
            variant="ghost" 
            className="w-full h-14 justify-start gap-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white/40"
           >
              <MapIcon className="size-5" /> Live Monitoring
           </Button>
           <Button 
            variant="ghost" 
            className="w-full h-14 justify-start gap-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white/40"
           >
              <FileText className="size-5" /> Reports
           </Button>
        </nav>

        <div className="p-10">
           <Button onClick={handleLogout} className="w-full h-16 rounded-2xl bg-white/5 hover:bg-red-600 text-white font-black uppercase italic tracking-tighter transition-all">
              <LogOut className="size-5 mr-3" /> Log Out
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto no-scrollbar">
        <header className="flex justify-between items-center mb-12">
           <div className="space-y-1">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-primary">System Overview</h2>
              <p className="text-slate-400 font-bold italic">Real-time status of Mutambuke network</p>
           </div>
           <div className="flex items-center gap-6">
              <div className="relative w-80">
                 <Input className="h-14 pl-12 rounded-2xl border-none bg-white shadow-sm font-bold" placeholder="Search ID or Plate..." />
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
              <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary cursor-pointer relative">
                 <AlertCircle className="size-6" />
                 <div className="absolute top-3 right-3 size-2 bg-red-500 rounded-full" />
              </div>
           </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
           <Card className="rounded-[2.5rem] border-none shadow-xl bg-white group hover:scale-105 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="size-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <Bike size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Riders</p>
                    <p className="text-3xl font-black text-primary italic">{stats.total}</p>
                 </div>
              </CardContent>
           </Card>
           <Card className="rounded-[2.5rem] border-none shadow-xl bg-white group hover:scale-105 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="size-16 rounded-[1.5rem] bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all">
                    <CheckCircle2 size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Approved</p>
                    <p className="text-3xl font-black text-primary italic">{stats.approved}</p>
                 </div>
              </CardContent>
           </Card>
           <Card className="rounded-[2.5rem] border-none shadow-xl bg-white group hover:scale-105 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="size-16 rounded-[1.5rem] bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-primary transition-all">
                    <Clock size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pending</p>
                    <p className="text-3xl font-black text-primary italic">{stats.pending}</p>
                 </div>
              </CardContent>
           </Card>
           <Card className="rounded-[2.5rem] border-none shadow-xl bg-white group hover:scale-105 transition-all">
              <CardContent className="p-8 flex items-center gap-6">
                 <div className="size-16 rounded-[1.5rem] bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <TrendingUp size={32} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Rides</p>
                    <p className="text-3xl font-black text-primary italic">124</p>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Verification List */}
        <section className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-primary">Verify Riders</h3>
              <Button variant="link" className="font-bold text-secondary">View All List <ChevronRight className="ml-2 size-4" /></Button>
           </div>
           
           <div className="grid gap-6">
              {pendingRiders && pendingRiders.length > 0 ? (
                pendingRiders.map((rider) => (
                  <Card key={rider.driverId} className="rounded-[2.5rem] border-none shadow-md overflow-hidden bg-white animate-in slide-in-from-bottom-4">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="size-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300">
                          <User size={40} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                             <h4 className="text-2xl font-black italic text-primary uppercase">{rider.plateNumber}</h4>
                             <Badge className="bg-accent text-primary uppercase font-black text-[9px] tracking-widest">Awaiting Verification</Badge>
                          </div>
                          <p className="text-sm font-bold text-slate-400 italic">
                             ID: {rider.driverId.slice(-12).toUpperCase()} • {rider.vehicleType.toUpperCase()} • {rider.licenseCategory}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Button 
                          onClick={() => updateVerification(rider.driverId, 'rejected')}
                          variant="outline" 
                          className="h-16 px-10 rounded-2xl font-black uppercase italic border-red-100 text-red-500 hover:bg-red-50"
                        >
                          Decline
                        </Button>
                        <Button 
                          onClick={() => updateVerification(rider.driverId, 'approved')}
                          className="h-16 px-10 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black italic uppercase tracking-widest shadow-xl"
                        >
                          Approve Rider
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-24 bg-white rounded-[3rem] text-center space-y-4 border-2 border-dashed border-slate-100">
                   <div className="size-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mx-auto">
                      <CheckCircle2 size={40} />
                   </div>
                   <p className="text-xl font-bold text-slate-300 italic">All pending verifications cleared</p>
                </div>
              )}
           </div>
        </section>
      </main>
    </div>
  );
}