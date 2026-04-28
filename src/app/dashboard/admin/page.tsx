'use client';

import React, { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Users, 
  LogOut, 
  LayoutDashboard, 
  Map as MapIcon, 
  Search,
  CheckCircle2,
  Clock,
  Bike,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { collection, doc, updateDoc, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Input } from '@/components/ui/input';
import { translations } from '@/lib/translations';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const [activeNav, setActiveNav] = useState('dashboard');

  const { data: pending } = useCollection(db ? query(collection(db, 'drivers'), where('verificationStatus', '==', 'pending')) : null);
  const { data: allDrivers } = useCollection(db ? collection(db, 'drivers') : null);
  const { data: allUsers } = useCollection(db ? collection(db, 'users') : null);

  const stats = {
    totalDrivers: allDrivers?.length || 0,
    approvedDrivers: allDrivers?.filter((r: any) => r.verificationStatus === 'approved').length || 0,
    pendingDrivers: allDrivers?.filter((r: any) => r.verificationStatus === 'pending').length || 0,
    totalUsers: allUsers?.length || 0,
  };

  async function updateVerification(id: string, status: 'approved' | 'rejected') {
    if (db) await updateDoc(doc(db, 'drivers', id), { verificationStatus: status });
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-80 bg-[#0F172A] text-white flex flex-col h-screen sticky top-0 shadow-3xl">
        <div className="p-10">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-accent">MUTAMBUKE</h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mt-1">Admin Central</p>
        </div>
        <nav className="flex-1 px-6 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'riders', icon: ShieldCheck, label: 'Verify Riders' },
            { id: 'users', icon: Users, label: 'User Control' },
            { id: 'rides', icon: MapIcon, label: 'Monitor Rides' }
          ].map((item) => (
            <Button 
              key={item.id}
              variant="ghost" 
              onClick={() => setActiveNav(item.id)}
              className={`w-full h-16 justify-start gap-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeNav === item.id ? 'bg-white/10 text-accent' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <item.icon className="size-5" /> {item.label}
            </Button>
          ))}
        </nav>
        <div className="p-10">
          <Button onClick={() => signOut(auth!)} className="w-full h-16 rounded-2xl bg-white/5 hover:bg-red-600 text-white font-black uppercase italic tracking-tighter transition-all">
            <LogOut className="size-5 mr-3" /> Log Out
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-12 overflow-y-auto no-scrollbar">
        <header className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#0F172A]">{activeNav.toUpperCase()}</h2>
            <p className="text-slate-400 font-bold italic">MUTAMBUKE Transport Network Management</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-80">
              <Input className="pill-input bg-white shadow-sm" placeholder="Search system..." />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
          </div>
        </header>

        {/* DASHBOARD CARDS */}
        <div className="grid grid-cols-4 gap-8 mb-16">
          <StatCard icon={Bike} label="Total Riders" value={stats.totalDrivers} color="text-[#0F172A]" bg="bg-slate-100" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approvedDrivers} color="text-secondary" bg="bg-secondary/10" />
          <StatCard icon={Clock} label="Pending" value={stats.pendingDrivers} color="text-accent" bg="bg-accent/10" />
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="text-blue-600" bg="bg-blue-50" />
        </div>

        {/* CONTENT SWITCH */}
        {activeNav === 'riders' ? (
          <section className="space-y-6">
            <h3 className="text-2xl font-black italic uppercase text-[#0F172A]">Verify Riders</h3>
            <div className="grid gap-6">
              {pending?.map((r: any) => (
                <Card key={r.driverId} className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-6">
                    <div className="size-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                      <Users size={32} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black italic text-[#0F172A] uppercase">{r.plateNumber}</h4>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{r.vehicleType} • {r.licenseCategory} License</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => updateVerification(r.driverId, 'rejected')} variant="outline" className="h-16 px-10 rounded-2xl font-black text-red-500 border-red-100 hover:bg-red-50 transition-all">Reject</Button>
                    <Button onClick={() => updateVerification(r.driverId, 'approved')} className="h-16 px-10 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black italic transition-all">Verify Rider</Button>
                  </div>
                </Card>
              ))}
              {!pending?.length && <div className="py-20 text-center text-slate-300 font-bold text-xl italic bg-white rounded-[3rem] border-4 border-dashed border-slate-50">No pending riders to verify</div>}
            </div>
          </section>
        ) : activeNav === 'users' ? (
          <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
             <h3 className="text-2xl font-black italic uppercase text-[#0F172A] mb-8">User Control Panel</h3>
             <div className="grid gap-4">
                {allUsers?.map((u: any) => (
                  <div key={u.userId} className="flex items-center justify-between p-6 hover:bg-slate-50 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-[#0F172A]">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-black uppercase text-sm tracking-tighter">{u.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{u.phone}</p>
                      </div>
                    </div>
                    <Badge className={`uppercase text-[8px] font-black ${u.role === 'driver' ? 'bg-accent/20 text-accent-foreground' : 'bg-blue-100 text-blue-600'}`}>
                      {u.role}
                    </Badge>
                  </div>
                ))}
             </div>
          </section>
        ) : (
          <div className="bg-white rounded-[3rem] p-20 text-center border-4 border-dashed border-slate-100 animate-in zoom-in-95">
            <LayoutDashboard size={64} className="mx-auto mb-6 text-slate-200" />
            <h3 className="text-2xl font-black text-slate-300 italic uppercase">Dashboard Statistics & Monitoring</h3>
            <p className="text-slate-400 font-bold italic mt-2">Charts and live monitoring maps coming in the next update.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white group hover:scale-105 transition-all">
      <CardContent className="p-8 flex items-center gap-6">
        <div className={`size-16 rounded-[1.5rem] ${bg} flex items-center justify-center ${color}`}>
          <Icon size={32} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
          <p className={`text-3xl font-black italic ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}