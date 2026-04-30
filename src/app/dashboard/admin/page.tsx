'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, Users, LogOut, LayoutDashboard, Map as MapIcon, 
  Search, CheckCircle2, Clock, Bike, TrendingUp, Activity, 
  Calendar, MoreVertical, ShieldAlert, Globe, Loader2
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  const isAdmin = userProfile?.role === 'admin';

  const { data: pending } = useCollection(db && isAdmin ? query(collection(db, 'drivers'), where('verificationStatus', '==', 'pending')) : null);
  const { data: allDrivers } = useCollection(db && isAdmin ? collection(db, 'drivers') : null);
  const { data: allUsers } = useCollection(db && isAdmin ? collection(db, 'users') : null);
  const { data: recentRides } = useCollection(db && isAdmin ? query(collection(db, 'rides'), orderBy('createdAt', 'desc'), limit(15)) : null);

  const stats = {
    totalDrivers: allDrivers?.length || 0,
    approvedDrivers: allDrivers?.filter((r: any) => r.verificationStatus === 'approved').length || 0,
    pendingDrivers: pending?.length || 0,
    totalUsers: allUsers?.length || 0,
    activeRides: recentRides?.filter((r: any) => ['requested', 'accepted', 'started'].includes(r.status)).length || 0
  };

  const chartData = [
    { name: 'Mon', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 1).length || 0 },
    { name: 'Tue', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 2).length || 0 },
    { name: 'Wed', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 3).length || 0 },
    { name: 'Thu', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 4).length || 0 },
    { name: 'Fri', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 5).length || 0 },
    { name: 'Sat', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 6).length || 0 },
    { name: 'Sun', value: recentRides?.filter((r) => new Date(r.createdAt?.toDate()).getDay() === 0).length || 0 },
  ];

  async function updateVerification(id: string, status: 'approved' | 'rejected') {
    if (db && isAdmin) await updateDoc(doc(db, 'drivers', id), { verificationStatus: status });
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    router.replace('/lib/auth');
  }

  if (userLoading || profileLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-secondary size-12"/></div>;
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/lib/auth');
    return null;
  }

  if (!isAdmin) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 text-center p-8">
            <ShieldAlert size={80} className="text-red-500 mb-6"/>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-red-800">Access Denied</h1>
            <p className="text-red-600 font-bold text-sm uppercase tracking-widest mt-2 max-w-md">You do not have permissions to view this page. Please ensure you are an admin.</p>
            <Button onClick={handleLogout} className="mt-8 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all">
                <LogOut className="size-5 mr-3" /> Log Out
            </Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-body">
      <aside className="w-80 bg-[#0F172A] text-white flex flex-col h-screen sticky top-0 shadow-2xl z-50">
        <div className="p-10">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-accent">MUTAMBUKE</h1>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em] mt-2">Systems Central</p>
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
              className={`w-full h-16 justify-start gap-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeNav === item.id ? 'bg-white/10 text-accent' : 'text-white/30 hover:text-white'}`}
            >
              <item.icon className="size-5" /> {item.label}
            </Button>
          ))}
        </nav>
        <div className="p-10 border-t border-white/5">
          <Button onClick={handleLogout} className="w-full h-16 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black uppercase tracking-widest text-xs transition-all">
            <LogOut className="size-5 mr-3" /> Log Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto no-scrollbar">
        <header className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#0F172A]">{activeNav}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Network Operations Management</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-80">
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-14 rounded-full bg-white border-none shadow-sm px-14 font-bold text-sm" 
                placeholder="Search system..." 
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-8 mb-12">
          <StatCard icon={Bike} label="Total Riders" value={stats.totalDrivers} color="text-slate-900" bg="bg-slate-100" />
          <StatCard icon={CheckCircle2} label="Approved" value={stats.approvedDrivers} color="text-secondary" bg="bg-secondary/10" />
          <StatCard icon={Clock} label="Pending" value={stats.pendingDrivers} color="text-accent" bg="bg-accent/10" />
          <StatCard icon={Activity} label="Active Rides" value={stats.activeRides} color="text-blue-600" bg="bg-blue-50" />
        </div>

        {activeNav === 'dashboard' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 rounded-[3rem] border-none shadow-xl bg-white p-10">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><TrendingUp className="text-secondary"/> Weekly Traffic</h3>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                       <Bar dataKey="value" fill="#22C55E" radius={[10, 10, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </Card>
            <Card className="rounded-[3rem] border-none shadow-xl bg-white p-10">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-8">System Status</h3>
               <div className="space-y-6">
                  <StatusRow label="Database" status="online" />
                  <StatusRow label="Map Services" status="online" />
                  <StatusRow label="Payment Gateway" status="warning" />
                  <StatusRow label="Auth Service" status="online" />
               </div>
            </Card>

            <Card className="lg:col-span-3 rounded-[3rem] border-none shadow-xl bg-white p-10 overflow-hidden">
               <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><Calendar className="text-accent"/> Recent Rides</h3>
               <Table>
                 <TableHeader>
                   <TableRow className="border-slate-50 hover:bg-transparent">
                     <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Ride ID</TableHead>
                     <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Passenger</TableHead>
                     <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Driver</TableHead>
                     <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Vehicle</TableHead>
                     <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Status</TableHead>
                     <TableHead className="text-right"></TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {recentRides?.map((r: any) => (
                     <TableRow key={r.rideId} className="border-slate-50 hover:bg-slate-50/50">
                       <TableCell className="font-mono text-[10px] text-slate-400">{r.rideId.slice(0,8)}</TableCell>
                       <TableCell className="font-bold text-sm uppercase">{r.passengerName}</TableCell>
                       <TableCell className="font-bold text-sm uppercase">{r.driverName || '---'}</TableCell>
                       <TableCell className="uppercase text-[10px] font-bold text-slate-400">{r.vehicleType}</TableCell>
                       <TableCell>
                         <Badge className={`uppercase text-[8px] font-black ${r.status === 'completed' ? 'bg-secondary/10 text-secondary' : r.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-accent/10 text-accent-foreground'}`}>
                           {r.status}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="rounded-xl"><MoreVertical size={16}/></Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </Card>
          </div>
        )}

        {activeNav === 'riders' && (
          <div className="grid gap-6">
            <h3 className="text-2xl font-black italic uppercase text-slate-900">Verify Riders</h3>
            {pending?.map((r: any) => (
              <Card key={r.driverId} className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 flex items-center justify-between animate-in slide-in-from-bottom-5">
                <div className="flex items-center gap-6">
                  <div className="size-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                    {r.vehicleType === 'moto' ? <Bike size={32} /> : <MapIcon size={32} />}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black italic text-[#0F172A] uppercase tracking-tighter">{r.plateNumber}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{r.vehicleType} • {r.licenseCategory} License</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => updateVerification(r.driverId, 'rejected')} variant="outline" className="h-16 px-10 rounded-2xl font-black text-red-500 border-red-100 hover:bg-red-50">Reject</Button>
                  <Button onClick={() => updateVerification(r.driverId, 'approved')} className="h-16 px-10 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-black italic">Verify Rider</Button>
                </div>
              </Card>
            ))}
            {!pending?.length && <div className="py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50 opacity-20"><ShieldCheck size={64} className="mx-auto mb-4"/> <p className="font-black uppercase text-xs tracking-[0.4em]">No pending riders</p></div>}
          </div>
        )}

        {activeNav === 'rides' && (
           <Card className="rounded-[3rem] border-none shadow-xl bg-white p-10">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><Globe className="text-blue-500"/> Real-time Network Monitor</h3>
              <div className="grid gap-4">
                 {recentRides?.filter((r: any) => ['requested', 'accepted', 'started'].includes(r.status)).map((r: any) => (
                    <div key={r.rideId} className="p-6 rounded-3xl bg-slate-50 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                             {r.vehicleType === 'moto' ? <Bike className="text-secondary"/> : <MapIcon className="text-accent"/>}
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase tracking-widest">{r.passengerName} • {r.status}</p>
                             <p className="text-[10px] text-slate-400 font-bold">{r.pickupLocation?.address || 'Live Location'}</p>
                          </div>
                       </div>
                       <Badge className="bg-blue-500 text-white font-black italic">LIVE</Badge>
                    </div>
                 ))}
                 {stats.activeRides === 0 && <div className="py-20 text-center opacity-20 font-black uppercase text-xs tracking-widest">No active rides at the moment</div>}
              </div>
           </Card>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white group hover:scale-105 transition-all cursor-default overflow-hidden">
      <CardContent className="p-8 flex items-center gap-6 relative">
        <div className={`absolute top-0 right-0 size-32 ${bg} rounded-full -mr-16 -mt-16 opacity-50`} />
        <div className={`size-16 rounded-[1.5rem] ${bg} flex items-center justify-center ${color} relative z-10`}>
          <Icon size={32} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-3xl font-black italic ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, status }: any) {
  return (
    <div className="flex items-center justify-between">
       <span className="text-xs font-black uppercase text-slate-400 tracking-widest">{label}</span>
       <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${status === 'online' ? 'bg-secondary' : 'bg-accent'} animate-pulse`} />
          <span className={`text-[10px] font-black uppercase ${status === 'online' ? 'text-secondary' : 'text-accent'}`}>{status}</span>
       </div>
    </div>
  );
}
