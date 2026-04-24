
'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bike, LogOut, MapPin, User, Check, X, Navigation, Play, Flag } from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  // Get driver profile
  const { data: driverProfile } = useDoc(user ? `drivers/${user.uid}` : null);
  const isOnline = driverProfile?.status === 'online';

  // Listen for ride requests
  const requestsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'rides'), where('status', '==', 'requested'));
  }, [db]);
  const { data: incomingRequests } = useCollection(requestsQuery);

  // Listen for current active ride
  const activeRideQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  async function toggleStatus() {
    if (!db || !user) return;
    const newStatus = isOnline ? 'offline' : 'online';
    await updateDoc(doc(db, 'drivers', user.uid), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
    });
  }

  async function startRide(rideId: string) {
    if (!db) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'started',
    });
  }

  async function completeRide(rideId: string) {
    if (!db) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'completed',
    });
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-secondary text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Bike className="size-6" />
            MUTAMBUKE RIDER
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
            <LogOut className="size-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Status Toggle */}
        <Card className="shadow-lg border-none bg-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-full flex items-center justify-center transition-colors ${isOnline ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                <Bike className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{isOnline ? 'Available' : 'Currently Offline'}</h2>
                <p className="text-sm text-muted-foreground">{isOnline ? 'Ready to receive requests' : 'Go online to start earning'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="online-mode" className="font-bold">{isOnline ? 'ONLINE' : 'OFFLINE'}</Label>
              <Switch id="online-mode" checked={isOnline} onCheckedChange={toggleStatus} />
            </div>
          </CardContent>
        </Card>

        {/* Current Trip */}
        {currentRide && (
          <Card className="border-2 border-secondary/20 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-secondary text-white p-4 flex justify-between items-center">
              <span className="font-bold flex items-center gap-2 uppercase tracking-wider">
                <Navigation className="size-4" /> Trip in Progress
              </span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">#{currentRide.rideId.slice(-6)}</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4 border-b pb-6">
                <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="size-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-bold text-lg">{currentRide.passengerName}</p>
                  <p className="text-sm text-muted-foreground">Pick up immediately</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="size-3 rounded-full bg-primary" />
                    <div className="w-0.5 h-8 bg-slate-200" />
                    <div className="size-3 rounded-full bg-secondary" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-xs text-muted-foreground font-bold">PICKUP</p>
                      <p className="font-medium">{currentRide.pickupLocation}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold">DESTINATION</p>
                      <p className="font-medium">{currentRide.destination}</p>
                    </div>
                  </div>
                </div>
              </div>

              {currentRide.status === 'accepted' ? (
                <Button onClick={() => startRide(currentRide.rideId)} className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90">
                  <Play className="size-5 mr-2" /> Start Trip
                </Button>
              ) : (
                <Button onClick={() => completeRide(currentRide.rideId)} className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700">
                  <Flag className="size-5 mr-2" /> Complete Trip
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Incoming Requests */}
        {isOnline && !currentRide && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-600 flex items-center gap-2">
              <Navigation className="size-5" /> Incoming Requests ({incomingRequests?.length || 0})
            </h3>
            {incomingRequests && incomingRequests.length > 0 ? (
              incomingRequests.map((req) => (
                <Card key={req.rideId} className="shadow-md border-none animate-in zoom-in-95">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="size-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-bold">{req.passengerName}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="size-3" /> Requested just now
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-secondary">Estimated</p>
                        <p className="text-xs text-muted-foreground">2.5 km away</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                        <MapPin className="size-4 text-primary" />
                        <span className="truncate">From: <strong>{req.pickupLocation}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                        <Flag className="size-4 text-secondary" />
                        <span className="truncate">To: <strong>{req.destination}</strong></span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
                        <X className="size-4 mr-2" /> Decline
                      </Button>
                      <Button onClick={() => acceptRide(req.rideId)} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Check className="size-4 mr-2" /> Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <Bike className="size-12 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400">Waiting for ride requests...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return <ClockIcon className={className} />;
}
function ClockIcon({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
