'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bike, 
  LogOut, 
  MapPin, 
  User, 
  Check, 
  X, 
  Navigation, 
  Play, 
  Flag, 
  Clock, 
  ShieldAlert, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  // Get driver profile
  const { data: driverProfile, loading: profileLoading } = useDoc(user ? `drivers/${user.uid}` : null);
  const isOnline = driverProfile?.status === 'online';
  const isVerified = driverProfile?.isVerified === true;

  // Listen for ride requests (only if online and verified)
  const requestsQuery = useMemo(() => {
    if (!db || !isOnline || !isVerified) return null;
    return query(collection(db, 'rides'), where('status', '==', 'requested'));
  }, [db, isOnline, isVerified]);
  const { data: incomingRequests } = useCollection(requestsQuery);

  // Listen for current active ride
  const activeRideQuery = useMemo(() => {
    if (!db || !user || !isVerified) return null;
    return query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'started'])
    );
  }, [db, user, isVerified]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  async function toggleStatus() {
    if (!db || !user) return;
    const newStatus = isOnline ? 'offline' : 'online';
    updateDoc(doc(db, 'drivers', user.uid), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `drivers/${user.uid}`,
        operation: 'update',
        requestResourceData: { status: newStatus }
      }));
    });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
    }).catch(err => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `rides/${rideId}`,
        operation: 'update',
        requestResourceData: { status: 'accepted', driverId: user.uid }
      }));
    });
  }

  async function startRide(rideId: string) {
    if (!db) return;
    updateDoc(doc(db, 'rides', rideId), {
      status: 'started',
    });
  }

  async function completeRide(rideId: string) {
    if (!db) return;
    updateDoc(doc(db, 'rides', rideId), {
      status: 'completed',
    });
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin size-8 text-primary" />
      </div>
    );
  }

  // Verification Screen
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-black text-xl italic text-primary">
            <Bike className="size-6" /> MUTAMBUKE
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400">
            <LogOut className="size-4 mr-2" /> Logout
          </Button>
        </header>
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-6">
            <div className="size-24 rounded-[2rem] bg-orange-100 flex items-center justify-center text-orange-600 mx-auto">
              <ShieldAlert className="size-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black italic text-slate-900 uppercase">Verification Pending</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                Your account is currently being reviewed by our team. We'll notify you once you're approved to start riding.
              </p>
            </div>
            <Card className="border-none shadow-sm bg-blue-50/50 p-6">
              <div className="flex items-start gap-4 text-left">
                <ShieldCheck className="size-6 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-blue-900">Why verification?</p>
                  <p className="text-xs text-blue-700 font-medium">We ensure all our riders are licensed and their vehicles are road-safe to maintain platform quality.</p>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Rider Header */}
      <header className="bg-secondary text-white px-6 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
          <Bike className="size-7" />
          RIDER CONSOLE
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${isOnline ? 'bg-green-500/20 text-white' : 'bg-black/20 text-white/60'}`}>
            <div className={`size-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/80 hover:bg-white/10 rounded-full">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Status Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
          <CardContent className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className={`size-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${isOnline ? 'bg-green-100 text-green-600 scale-105' : 'bg-slate-100 text-slate-400'}`}>
                <Bike className="size-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black italic text-slate-900 uppercase leading-none">
                  {isOnline ? 'READY TO RIDE' : 'GO ONLINE'}
                </h2>
                <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">
                  {isOnline ? 'Waiting for requests...' : 'Activate to start earning'}
                </p>
              </div>
            </div>
            <Switch 
              checked={isOnline} 
              onCheckedChange={toggleStatus} 
              className="data-[state=checked]:bg-green-500 scale-125"
            />
          </CardContent>
        </Card>

        {/* Active Ride Section */}
        {currentRide ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black italic text-secondary tracking-widest uppercase flex items-center gap-2">
                <Navigation className="size-4" /> Active Mission
              </h3>
              <span className="text-[10px] font-black text-slate-300">ID: {currentRide.rideId.slice(-6)}</span>
            </div>
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
              <div className="bg-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="size-7" />
                  </div>
                  <div>
                    <p className="font-black text-xl italic leading-none">{currentRide.passengerName}</p>
                    <p className="text-[10px] font-black opacity-70 tracking-widest mt-1 uppercase">Passenger</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black opacity-70 tracking-widest uppercase">Estimate</p>
                  <p className="text-xl font-black italic">500 RWF</p>
                </div>
              </div>
              <CardContent className="p-8 space-y-8 bg-white">
                <div className="flex gap-5">
                  <div className="flex flex-col items-center gap-1">
                    <div className="size-3 rounded-full bg-primary" />
                    <div className="w-1 flex-1 bg-slate-100 rounded-full" />
                    <div className="size-3 rounded-full bg-secondary" />
                  </div>
                  <div className="flex-1 space-y-8">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">PICKUP AT</p>
                      <p className="font-black text-slate-900 text-lg leading-tight">{currentRide.pickupLocation}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">DROP OFF AT</p>
                      <p className="font-black text-slate-900 text-lg leading-tight">{currentRide.destination}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  {currentRide.status === 'accepted' ? (
                    <Button 
                      onClick={() => startRide(currentRide.rideId)} 
                      className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white text-xl font-black italic shadow-xl shadow-primary/20"
                    >
                      <Play className="size-6 mr-2 fill-current" /> START TRIP
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => completeRide(currentRide.rideId)} 
                      className="w-full h-16 rounded-[1.5rem] bg-green-600 hover:bg-green-700 text-white text-xl font-black italic shadow-xl shadow-green-200"
                    >
                      <Flag className="size-6 mr-2 fill-current" /> COMPLETE MISSION
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isOnline ? (
          /* Incoming Requests */
          <div className="space-y-4">
            <h3 className="text-sm font-black italic text-slate-400 tracking-widest uppercase px-2">
              Live Requests ({incomingRequests?.length || 0})
            </h3>
            {incomingRequests && incomingRequests.length > 0 ? (
              <div className="grid gap-4">
                {incomingRequests.map((req) => (
                  <Card key={req.rideId} className="rounded-[2rem] border-none shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <User className="size-6" />
                          </div>
                          <div>
                            <p className="font-black text-lg text-slate-900 leading-none">{req.passengerName}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                              <Clock className="size-3" /> Just Requested
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50 px-3 py-1 rounded-full">
                          <p className="text-[10px] font-black text-orange-600 tracking-widest uppercase">2.4 KM AWAY</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                          <MapPin className="size-4 text-primary" />
                          <p className="text-sm font-bold text-slate-600 truncate">{req.pickupLocation}</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                          <Flag className="size-4 text-secondary" />
                          <p className="text-sm font-bold text-slate-600 truncate">{req.destination}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black italic text-slate-400 hover:text-red-500 hover:border-red-100">
                          <X className="size-4 mr-2" /> REJECT
                        </Button>
                        <Button onClick={() => acceptRide(req.rideId)} className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black italic shadow-lg">
                          <Check className="size-4 mr-2" /> ACCEPT RIDE
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="size-20 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <Loader2 className="size-10 text-slate-200 animate-spin" />
                </div>
                <div>
                  <p className="text-xl font-black italic text-slate-300 uppercase tracking-tighter">Scanning for Trips...</p>
                  <p className="text-xs text-slate-400 font-bold tracking-widest">STAY NEAR BUSY AREAS FOR MORE JOBS</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Offline Empty State */
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="size-24 rounded-[2.5rem] bg-white flex items-center justify-center shadow-xl border border-slate-100">
              <Bike className="size-12 text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black italic text-slate-300 uppercase leading-none">Status: Offline</p>
              <p className="text-xs text-slate-400 font-bold tracking-widest">GO ONLINE TO SEE REQUESTS</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="p-6 text-center">
        <div className="inline-flex items-center gap-6 px-6 py-3 bg-white rounded-full shadow-sm border border-slate-100">
           <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings</p>
            <p className="text-sm font-black italic text-slate-900">0 RWF</p>
           </div>
           <div className="w-px h-6 bg-slate-100" />
           <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating</p>
            <div className="flex items-center gap-0.5 text-orange-400">
              <StarIcon className="size-3 fill-current" />
              <span className="text-sm font-black italic text-slate-900 ml-1">5.0</span>
            </div>
           </div>
        </div>
      </footer>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
