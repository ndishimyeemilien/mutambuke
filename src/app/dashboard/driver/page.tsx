'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Bike, 
  LogOut, 
  Navigation, 
  User, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  History, 
  UserCircle, 
  Bell,
  Home,
  FileText,
  UploadCloud,
  Save,
  X
} from 'lucide-react';
import { collection, doc, updateDoc, query, where, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";

export default function DriverDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [location, setLocation] = useState({ lat: -1.9441, lng: 30.0619 });
  const [activeView, setActiveView] = useState<'map' | 'history' | 'profile'>('map');

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const { data: profile, loading: pLoading } = useDoc(user ? `users/${user.uid}` : null);
  const { data: driver, loading: dLoading } = useDoc(user ? `drivers/${user.uid}` : null);

  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('');

  useEffect(() => {
    if (driver) {
      setPlateNumber(driver.plateNumber || '');
      setVehicleModel(driver.vehicleModel || '');
      setLicenseNumber(driver.licenseNumber || '');
      setLicenseCategory(driver.licenseCategory || '');
    }
  }, [driver]);

  const isOnline = driver?.status === 'online';
  const isBusy = driver?.status === 'busy';
  const isApproved = driver?.verificationStatus === 'approved';

  const activeRideQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', 'in', ['accepted', 'started', 'arrived']));
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  const rideHistoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'rides'), where('driverId', '==', user.uid), where('status', '==', 'completed'), orderBy('createdAt', 'desc'), limit(20));
  }, [db, user]);
  const { data: rideHistory } = useCollection(rideHistoryQuery);

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
        null, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [db, user, isOnline, isBusy]);

  async function toggleStatus() {
    if (!db || !user || !isApproved || isBusy) return;
    const newStatus = isOnline ? 'offline' : 'online';
    await updateDoc(doc(db, 'drivers', user.uid), { status: newStatus, updatedAt: serverTimestamp() });
  }

  async function updateRideStatus(rideId: string, status: 'started' | 'arrived' | 'completed' | 'cancelled') {
      if (!db || !user) return;
      await updateDoc(doc(db, 'rides', rideId), { status });
      if (status === 'completed' || status === 'cancelled') {
          await updateDoc(doc(db, 'drivers', user.uid), { status: 'online' });
      }
      toast({ title: `Urugendo ruhinduwe: ${status}` });
  }

  async function handleProfileUpdate() {
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'drivers', user.uid), {
        plateNumber,
        vehicleModel,
        licenseNumber,
        licenseCategory,
        updatedAt: serverTimestamp(),
        verificationStatus: 'pending' // Resubmit for verification
      });
      toast({ title: "Porofayili yawe yoherejwe neza!" });
    } catch (error) {
      toast({ variant: 'destructive', title: "Ikosa! Porofayili ntiyavuguruwe." });
    }
  }

  async function handleLogout() {
    if (!auth) return;
    await signOut(auth);
    router.replace('/lib/auth');
  }

  if (dLoading || pLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-secondary size-10" /></div>;

  if (driver?.verificationStatus === 'rejected') return (
    <div className="h-screen flex flex-col items-center justify-center bg-red-900/10 text-white p-10 text-center">
        <X className="size-20 text-red-500 mb-6"/>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 italic text-red-400">KONTI YARANZWE</h1>
        <p className="text-white/40 max-w-md font-bold text-sm uppercase tracking-widest leading-relaxed mb-4">Ibyangombwa watanze ntibujuje ibisabwa. Ongera ugerageze.</p>
        <Button size="lg" className="h-14 rounded-2xl px-10 text-lg font-black italic" onClick={() => updateDoc(doc(db, 'drivers', user.uid), { verificationStatus: 'new' })}>Kosora Amakuru</Button>
    </div>
  );

  if (!isApproved) return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col bg-[#070b14] text-white font-body">
        <main className="flex-1 p-4 lg:p-6 max-w-2xl mx-auto w-full space-y-6 overflow-y-auto no-scrollbar pt-10">
            <div className="text-center">
                <ShieldCheck className="size-16 text-accent mx-auto mb-6 animate-pulse"/>
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 italic text-accent">TUNGANYA KONTI</h1>
                <p className="text-white/40 font-bold text-sm uppercase tracking-widest leading-relaxed">Uzuza amakuru yawe yose kugirango ubone uburenganzira bwo gukora.</p>
            </div>
            <div className="space-y-4 pt-6">
                <InputWithLabel label="Plaque y'ikinyabiziga" value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} />
                <InputWithLabel label="Ubwoko bw'ikinyabiziga (Urugero: TVS 150)" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
                <InputWithLabel label="Numero ya Perimi" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
                <Select value={licenseCategory} onValueChange={setLicenseCategory}>
                    <SelectTrigger className="h-14 rounded-xl bg-white/5 border-white/10 text-white/40 focus:border-secondary transition-all font-bold text-sm">
                        <SelectValue placeholder="Hitamo Icyiciro cya Perimi" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-700 bg-[#0a0f1a] text-white">
                        <SelectItem value="A">A - Moto</SelectItem>
                        <SelectItem value="B">B - Imbangukiragutabara</SelectItem>
                        <SelectItem value="F">F - Ubuhinzi</SelectItem>
                    </SelectContent>
                </Select>
                
                <Button onClick={handleProfileUpdate} size="lg" className="w-full h-16 rounded-2xl bg-secondary text-[#0F172A] text-lg font-black italic mt-6">
                    <Save size={20} className="mr-3"/> Emeza Amakuru
                </Button>
            </div>
        </main>
    </div>
  );
  
  return (
    <div className="h-screen w-screen overflow-hidden relative flex flex-col bg-[#070b14] text-white font-body">
      <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4"><div className="size-10 bg-secondary rounded-xl flex items-center justify-center font-black text-white italic">M</div><span className="font-black text-xl tracking-tighter text-white uppercase italic">MUTAMBUKE</span></div>
        <div className="flex items-center gap-6">
           <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border border-white/5 ${isOnline ? 'bg-secondary/10' : 'bg-red-500/10'}`}>
              <div className={`size-2 rounded-full animate-pulse ${isOnline ? 'bg-secondary' : 'bg-red-500'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest">{isBusy ? "URI MU RUGENDO" : (isOnline ? 'URI KU KAZI' : 'NTURI KU KAZI')}</p>
              <Switch checked={isOnline} onCheckedChange={toggleStatus} disabled={isBusy} />
           </div>
           <Button variant="ghost" size="icon" className="rounded-full bg-white/5 relative"><Bell size={20} className="text-white/60"/></Button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto no-scrollbar">
        {activeView === 'map' && (
          <>
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-[#0F172A] relative h-[400px]">
                {isLoaded ? (
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={location} zoom={16} mapTypeId="hybrid" options={{ disableDefaultUI: true }}><Marker position={location} /></GoogleMap>
                ) : <div className="size-full flex items-center justify-center"><Loader2 className="animate-spin text-secondary"/></div>}
            </Card>

            {currentRide ? (
                <Card className="rounded-[2.5rem] border-none bg-secondary/10 p-8 flex items-center justify-between gap-6 shadow-2xl">
                  <div className="flex items-center gap-6">
                      <div className="size-16 rounded-[1.5rem] bg-secondary/20 text-secondary shadow-inner flex items-center justify-center"><UserCircle size={40}/></div>
                      <div>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">URUGENDO RURIHO</p>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{currentRide.passengerName}</h3>
                      </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {currentRide.status === 'accepted' && <Button onClick={() => updateRideStatus(currentRide.id, 'started')} className="h-14 px-10 rounded-xl bg-secondary text-[#0F172A] font-black uppercase text-xs italic">Tangira</Button>}
                    {currentRide.status === 'started' && <Button onClick={() => updateRideStatus(currentRide.id, 'arrived')} className="h-14 px-10 rounded-xl bg-blue-500 text-white font-black uppercase text-xs italic">Nahageze</Button>}
                    {currentRide.status === 'arrived' && <Button onClick={() => updateRideStatus(currentRide.id, 'completed')} className="h-14 px-10 rounded-xl bg-green-500 text-white font-black uppercase text-xs italic">Rurangize</Button>}
                  </div>
                </Card>
            ) : (
               <div className="py-20 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-white/[0.02]">
                  <Navigation className={`mx-auto mb-4 text-white/10 ${isOnline ? 'animate-pulse' : ''}`} size={48} />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{isOnline ? 'Tegereje abagenzi...' : 'Nturi ku kazi'}</p>
               </div>
            )}
          </>
        )}

        {activeView === 'history' && (
          <div className="space-y-6"><h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">AMATEKA Y'INGENDO</h2>
             <div className="grid gap-4">
                {rideHistory?.map((ride: any) => (<Card key={ride.id} className="p-6 rounded-[2rem] bg-[#0F172A] border-none flex items-center justify-between shadow-lg"><div><h4 className="font-bold text-lg uppercase text-white">Urugendo rwa {ride.passengerName}</h4><p className="text-xs text-white/40 mt-1">{ride.createdAt?.toDate ? format(ride.createdAt.toDate(), 'MMM dd, p') : ''}</p></div><Badge className="bg-green-500/10 text-green-400">Byarangiye</Badge></Card>))}
                {!rideHistory?.length && <p className='text-center text-white/30 py-10'>Nta mateka arahari.</p>}
             </div></div>
        )}

        {activeView === 'profile' && (
           <div className="space-y-8 pb-24 max-w-2xl mx-auto">
             <div className="p-10 rounded-[3rem] bg-[#0F172A] border-white/5 text-center">
                <UserCircle size={80} className="mx-auto text-secondary mb-4"/>
                <h2 className="text-4xl font-black uppercase italic text-white">{profile?.name}</h2>
                <p className="text-sm text-white/40 mt-2">{driver?.plateNumber} • {driver?.vehicleType}</p>
             </div>
             <div className="space-y-4">
                <InputWithLabel label="Plaque y'ikinyabiziga" value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} />
                <InputWithLabel label="Ubwoko bw'ikinyabiziga" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
                <InputWithLabel label="Numero ya Perimi" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
                <Select value={licenseCategory} onValueChange={setLicenseCategory}>
                    <SelectTrigger className="h-14 rounded-xl bg-white/5 border-white/10 text-white/40 focus:border-secondary transition-all font-bold text-sm">
                        <SelectValue placeholder="Hitamo Icyiciro cya Perimi" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-700 bg-[#0a0f1a] text-white">
                        <SelectItem value="A">A - Moto</SelectItem>
                        <SelectItem value="B">B - Imbangukiragutabara</SelectItem>
                        <SelectItem value="F">F - Ubuhinzi</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={handleProfileUpdate} size="lg" className="w-full h-16 rounded-2xl bg-secondary text-[#0F172A] text-lg font-black italic mt-4"><Save size={20} className="mr-3"/> Bika Impinduka</Button>
             </div>
             <Button onClick={handleLogout} className="w-full h-20 rounded-[2rem] bg-red-500/10 text-red-400 font-black text-lg uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all mt-8">GUSOHOKA</Button>
          </div>
        )}
      </main>

      <nav className="h-24 bg-[#0F172A]/90 border-t border-white/5 flex items-center justify-around px-4 sticky bottom-0 z-50 backdrop-blur-xl">
        <NavItem active={activeView === 'map'} onClick={() => setActiveView('map')} icon={Home} label="Ahabanza" />
        <NavItem active={activeView === 'history'} onClick={() => setActiveView('history')} icon={History} label="Amateka" />
        <NavItem active={activeView === 'profile'} onClick={() => setActiveView('profile')} icon={User} label="Porofayili" />
      </nav>
    </div>
  );
}

const NavItem = ({ active, onClick, icon: Icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all w-20 ${active ? 'text-secondary' : 'text-white/30 hover:text-white/70'}`}>
    <Icon size={28} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const InputWithLabel = ({ label, ...props }: React.ComponentProps<typeof Input> & { label: string }) => (
    <div>
        <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 block">{label}</label>
        <Input className="h-14 rounded-xl bg-white/5 border-white/10 focus:border-secondary transition-all font-bold placeholder:text-slate-500 text-sm" {...props} />
    </div>
);
