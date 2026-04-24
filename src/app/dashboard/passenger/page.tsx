
'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Bike, User, LogOut, Loader2, Star, Clock } from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';

export default function PassengerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Get online riders
  const ridersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'drivers'), where('status', '==', 'online'));
  }, [db]);
  const { data: riders } = useCollection(ridersQuery);

  // Check for active ride
  const activeRideQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', 'in', ['requested', 'accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  async function handleRequestRide() {
    if (!db || !user || !pickup || !destination) return;
    setIsRequesting(true);
    
    const rideId = doc(collection(db, 'rides')).id;
    const rideData = {
      rideId,
      passengerId: user.uid,
      passengerName: user.displayName || 'Passenger',
      pickupLocation: pickup,
      destination: destination,
      status: 'requested',
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'rides', rideId), rideData);
    setIsRequesting(false);
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-primary text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Bike className="size-6" />
            MUTAMBUKE
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10">
            <LogOut className="size-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Welcome */}
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="size-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Hello, {user?.displayName || 'Passenger'}!</h2>
            <p className="text-muted-foreground text-sm">Where are you going today?</p>
          </div>
        </div>

        {/* Map Simulation */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-slate-200 aspect-[16/9] relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://picsum.photos/seed/map1/1200/800')] bg-cover" />
            
            {/* Simulation Points */}
            <div className="relative z-10 w-full h-full">
              {/* Passenger Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="absolute -top-1 w-full h-full bg-primary/20 animate-ping rounded-full" />
                  <MapPin className="size-8 text-primary fill-primary/20" />
                </div>
              </div>

              {/* Online Riders Simulated */}
              {riders?.map((rider, i) => (
                <div key={rider.driverId} className="absolute" style={{ top: `${20 + (i * 15)}%`, left: `${30 + (i * 20)}%` }}>
                  <Bike className="size-6 text-secondary" />
                </div>
              ))}
            </div>

            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
              <Clock className="size-3" />
              {riders?.length || 0} active riders nearby
            </div>
          </div>
        </Card>

        {/* Request Form or Status */}
        {currentRide ? (
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                Ride Status: {currentRide.status.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-medium">{currentRide.pickupLocation}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-medium">{currentRide.destination}</p>
                </div>
              </div>
              {currentRide.driverId && (
                <div className="bg-primary/5 p-4 rounded-xl flex items-center gap-4">
                  <Bike className="size-8 text-primary" />
                  <div>
                    <p className="font-bold">Rider is on the way!</p>
                    <p className="text-sm text-muted-foreground">Stay at your pickup point.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle>Request a Ride</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pickup Location</Label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-3 size-4 text-primary" />
                  <Input 
                    placeholder="Enter pickup point" 
                    className="pl-10 h-12"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-secondary" />
                  <Input 
                    placeholder="Where to?" 
                    className="pl-10 h-12"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleRequestRide} 
                className="w-full h-12 text-lg font-bold bg-secondary hover:bg-secondary/90"
                disabled={!pickup || !destination || isRequesting}
              >
                {isRequesting ? <Loader2 className="animate-spin" /> : 'Request Ride Now'}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
