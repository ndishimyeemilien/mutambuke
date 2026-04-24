
'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, User, LogOut, CheckCircle2, Clock, MapPin, Bike } from 'lucide-react';
import { collection, doc, updateDoc, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function AdminDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  // Get all riders who need verification
  const ridersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'drivers'), where('isVerified', '==', false));
  }, [db]);
  const { data: pendingRiders, loading: ridersLoading } = useCollection(ridersQuery);

  // Get stats
  const allRidersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'drivers');
  }, [db]);
  const { data: allRiders } = useCollection(allRidersQuery);

  const stats = {
    total: allRiders?.length || 0,
    verified: allRiders?.filter(r => r.isVerified).length || 0,
    pending: allRiders?.filter(r => !r.isVerified).length || 0,
  };

  async function verifyRider(riderId: string) {
    if (!db) return;
    await updateDoc(doc(db, 'drivers', riderId), {
      isVerified: true
    });
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  if (ridersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Clock className="animate-spin size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary text-white p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-2xl italic tracking-tighter">
            <ShieldCheck className="size-8" />
            MUTAMBUKE ADMIN
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10 font-bold">
            <LogOut className="size-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Bike className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Riders</p>
                <p className="text-3xl font-black">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verified</p>
                <p className="text-3xl font-black">{stats.verified}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                <Clock className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                <p className="text-3xl font-black">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Verification List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic text-slate-800 flex items-center gap-2">
            <User className="size-6" /> PENDING VERIFICATION
          </h2>
          
          {pendingRiders && pendingRiders.length > 0 ? (
            <div className="grid gap-4">
              {pendingRiders.map((rider) => (
                <Card key={rider.driverId} className="border-none shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User className="size-8" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">Rider ID: {rider.driverId.slice(-8)}</h3>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">UNVERIFIED</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><MapPin className="size-3" /> Location Pending</span>
                            <span className="flex items-center gap-1"><Bike className="size-3" /> Vehicle Info Pending</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50">
                          Reject
                        </Button>
                        <Button 
                          onClick={() => verifyRider(rider.driverId)}
                          className="h-12 px-6 rounded-xl font-bold bg-green-600 hover:bg-green-700"
                        >
                          Approve Rider
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <CheckCircle2 className="size-16 text-slate-200 mx-auto mb-4" />
              <p className="text-xl font-bold text-slate-400">No pending verifications</p>
              <p className="text-slate-300">All riders are currently verified.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
