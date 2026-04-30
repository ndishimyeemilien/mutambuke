'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Bike, 
  Car, 
  LogOut, 
  Navigation, 
  User, 
  Phone, 
  Star, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  MessageSquare, 
  Send, 
  X, 
  History, 
  UserCircle, 
  Wallet,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bell
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [location, setLocation] = useState({ lat: -1.9441, lng: 30.0619 });
  const [activeView, setActiveView] = useState<'map' | 'profile' | 'history' | 'earnings'>('map');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  const { data: driver, loading: dLoading } = useDoc(user ? `drivers/${user.uid}` : null);

  const isOnline = driver?.status === 'online';
  const isBusy = driver?.status === 'busy';
  const isApproved = driver?.verificationStatus === 'approved';

  // Real-time ride requests
  const requestsQuery = useMemoFirebase(() => {
    if (!db || !isOnline || !isApproved) return null;
    return query(
      collection(db, 'rides'), 
      where('status', '==', 'requested'), 
      where('vehicleType', '==', driver?.vehicleType || 'moto'),
      limit(1)
    );
  }, [db, isOnline, isApproved, driver?.vehicleType]);
  const { data: requests } = useCollection(requestsQuery);
  const pendingRequest = requests?.[0];

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          if (db && user && (isOnline || isBusy)) {
            updateDoc(doc(db, 'drivers', user.uid), { currentLocation: newLoc, updatedAt: serverTimestamp() }).catch(() => {});
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [db, user, isOnline, isBusy]);

  async function toggleStatus() {
    if (!db || !user || !isApproved || isBusy) return;
    const newStatus = isOnline ? 'offline' : 'online';
    await updateDoc(doc(db, 'drivers', user.uid), { status: newStatus, updatedAt: serverTimestamp() });
  }

  async function acceptRide(rideId: string) {
    if (!db || !user) return;
    await updateDoc(doc(db, 'rides', rideId), {
      status: 'accepted',
      driverId: user.uid,
      driverName: profile?.name || 'Driver',
      driverPhone: profile?.phone || '',
      acceptedAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'drivers', user.uid), { status: 'busy', updatedAt: serverTimestamp() });
    toast({ title: "Urugendo rwemewe!" });
  }

  if (dLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-10" /></div>;
  
  if (!isApproved) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white p-10 text-center">
        <ShieldCheck className="size-20 text-accent mb-6 animate-pulse"/>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-accent">KONTI IRAGENZURWA</h1>
        <p className="text-white/40 max-w-md font-bold text-sm uppercase tracking-widest leading-relaxed">Amakuru yawe arimo kugenzurwa. Murakoze kwihangana mu gihe MUTAMBUKE irimo kwemeza ibyangombwa byanyu.</p>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col bg-[#070b14] text-white font-body">
      
      {/* TOP HEADER */}
      <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
           <div className="size-10 bg-secondary rounded-xl flex items-center justify-center font-black text-white italic">M</div>
           <span className="font-black text-xl tracking-tighter text-white uppercase italic">MUTAMBUKE</span>
        </div>
        
        <div className="flex items-center gap-6">
           <div className={`flex items-center gap-3 px-6 py-2 rounded-full border border-white/5 ${isOnline ? 'bg-secondary/10' : 'bg-red-500/10'}`}>
              <div className={`size-2 rounded-full animate-pulse ${isOnline ? 'bg-secondary' : 'bg-red-500'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'URI ONLINE' : 'URI OFFLINE'}</p>
              <Switch checked={isOnline} onCheckedChange={toggleStatus} disabled={isBusy} />
           </div>
           <Button variant="ghost" size="icon" className="rounded-full bg-white/5 relative">
              <Bell size={20} className="text-white/60"/>
              {pendingRequest && <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full animate-ping" />}
           </Button>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto no-scrollbar">
         
         {/* MAP CONTAINER - HYBRID */}
         <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-[#0F172A] relative h-[400px]">
            {isLoaded ? (
              <GoogleMap
                 mapContainerStyle={{ width: '100%', height: '100%' }}
                 center={location}
                 zoom={16}
                 mapTypeId="hybrid"
                 options={{ disableDefaultUI: true }}
              >
                 <Marker position={location} icon={{
                    url: driver?.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
                    scaledSize: { width: 45, height: 45 } as any
                 }} />
              </GoogleMap>
            ) : <div className="size-full flex items-center justify-center"><Loader2 className="animate-spin text-secondary"/></div>}
         </Card>

         {/* RIDE REQUESTS SECTION */}
         <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/20">UBUTUMWA BUSHYA</h2>
            
            {pendingRequest ? (
               <Card className="rounded-[2.5rem] border-none bg-secondary/10 p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-6">
                     <div className="size-20 rounded-[2rem] bg-secondary/20 flex items-center justify-center text-secondary">
                        <UserCircle size={50}/>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">URUGENDO RUSHURA</p>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter">{pendingRequest.passengerName}</h3>
                        <p className="text-sm font-bold text-white/40 mt-1 flex items-center gap-2"><MapPin size={14}/> Kigali, hafi yawe</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                     <Button variant="ghost" className="flex-1 md:flex-none h-16 px-10 rounded-2xl bg-white/5 font-black uppercase text-xs">REJECT</Button>
                     <Button onClick={() => acceptRide(pendingRequest.rideId)} className="flex-1 md:flex-none h-16 px-12 rounded-2xl bg-secondary text-[#0F172A] font-black uppercase text-xs italic tracking-widest shadow-xl shadow-secondary/20">EMERA URUGENDO</Button>
                  </div>
               </Card>
            ) : (
               <div className="py-20 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.02]">
                  <Navigation className={`mx-auto mb-4 text-white/10 ${isOnline ? 'animate-bounce' : ''}`} size={48} />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                     {isOnline ? 'Uri gushakisha abagenzi...' : 'Nturi ku kazi uyu munsi'}
                  </p>
               </div>
            )}
         </div>

         {/* EARNINGS SUMMARY */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="INYUNGU" value="8,400 Rwf" icon={Wallet} color="text-secondary" />
            <StatsCard label="INGENDO" value="12 Trips" icon={CheckCircle2} color="text-blue-500" />
            <StatsCard label="URUBATSO" value="4.9 Stars" icon={Star} color="text-accent" />
         </div>

      </main>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="rounded-[2.5rem] border-none bg-white/5 p-8 group hover:bg-white/10 transition-all">
       <div className="flex items-center gap-6">
          <div className={`size-16 rounded-3xl bg-white/5 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
             <Icon size={32}/>
          </div>
          <div>
             <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">{label}</p>
             <p className="text-2xl font-black italic tracking-tighter uppercase">{value}</p>
          </div>
       </div>
    </Card>
  );
}
