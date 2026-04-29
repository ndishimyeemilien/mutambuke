
'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  User, 
  LogOut, 
  Loader2, 
  Navigation, 
  Bike, 
  Car as CarIcon, 
  Menu,
  X,
  Star,
  Phone,
  Heart,
  ShieldCheck,
  Layers,
  Map as MapIcon,
  Moon,
  Sun,
  Mail,
  Calendar,
  Settings,
  Bell,
  ChevronRight,
  History,
  UserCircle
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const GOOGLE_MAPS_API_KEY = "AIzaSyBYd7EGaMpDouB0Br1yUSwRarQeToFuiiA";
const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'history'>('home');
  const [isRequesting, setIsRequesting] = useState(false);
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi'>('moto');
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  
  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'), 
      where('status', '==', 'online'),
      where('verificationStatus', '==', 'approved')
    );
  }, [db]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Defaulting to Kigali"),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleQuickRequest(type: 'moto' | 'taxi') {
    if (!db || !user) return;
    setVehicleType(type);
    setIsRequesting(true);
    try {
      const rideId = doc(collection(db, 'rides')).id;
      await setDoc(doc(db, 'rides', rideId), {
        rideId, 
        passengerId: user.uid, 
        passengerName: userProfile?.name || user.displayName || 'User',
        passengerPhone: userProfile?.phone || user.phoneNumber || '',
        pickupLocation: 'Current Location',
        destination: 'Not Specified', 
        status: 'requested', 
        vehicleType: type, 
        createdAt: serverTimestamp()
      });
      toast({ title: t.searching, description: "Connecting to MUTAMBUKE network..." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  if (authLoading || profileLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#0F172A]">
      <Loader2 className="size-10 animate-spin text-secondary" />
    </div>
  );

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col font-body overflow-x-hidden pb-10 transition-colors duration-500 ${isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      <header className={`sticky top-0 z-[60] backdrop-blur-md p-5 flex items-center justify-between border-b transition-colors ${isDark ? 'bg-[#0F172A]/95 border-white/5 shadow-2xl' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 cursor-pointer overflow-hidden rounded-xl" onClick={() => setActiveTab('home')}>
              {logo ? (
                <Image src={logo.imageUrl} alt="Logo" fill className="object-cover" />
              ) : (
                <div className="size-full bg-secondary flex items-center justify-center text-white font-black">M</div>
              )}
            </div>
            <h1 className={`text-xl font-black italic tracking-tighter uppercase ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>MUTAMBUKE</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
             {[
               { id: 'home', label: 'UMUGENZI' },
               { id: 'history', label: 'IBYATAMBUTSE' },
               { id: 'profile', label: 'UMWIRONDORO' }
             ].map((link) => (
               <button 
                 key={link.id} 
                 onClick={() => setActiveTab(link.id as any)}
                 className={`text-[10px] font-black tracking-[0.2em] transition-colors uppercase ${activeTab === link.id ? 'text-secondary' : isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
               >
                 {link.label}
               </button>
             ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             onClick={() => setTheme(isDark ? 'light' : 'dark')} 
             variant="ghost" 
             className={`size-10 rounded-xl transition-colors ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-[#0F172A]'}`}
           >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
           </Button>
           <Button onClick={() => setIsMenuOpen(true)} variant="ghost" className={`size-10 rounded-xl md:hidden ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-[#0F172A]'}`}>
              <Menu size={20} />
           </Button>
           <div 
             onClick={() => setActiveTab('profile')}
             className={`px-4 py-2 rounded-xl flex items-center gap-3 border transition-all cursor-pointer hover:scale-105 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-[#0F172A] shadow-sm'}`}
           >
              <UserCircle size={18} className="text-secondary" />
              <span className="font-bold text-[10px] uppercase tracking-tighter hidden sm:inline">{userProfile?.name || 'User'}</span>
           </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {activeTab === 'home' ? (
          <>
            <div className={`relative h-[400px] md:h-[500px] w-full rounded-[2rem] overflow-hidden shadow-2xl border-4 transition-colors ${isDark ? 'border-white/5 bg-[#1a2632]' : 'border-white bg-slate-200'}`}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={passengerLocation}
                  zoom={15}
                  mapTypeId={mapType}
                  options={{ disableDefaultUI: true }}
                >
                  <Marker position={passengerLocation} icon={{ url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', scaledSize: { width: 40, height: 40 } as any }} />
                  {availableDrivers?.map((d: any) => (
                    <Marker key={d.id} position={d.currentLocation || passengerLocation} icon={{ url: d.vehicleType === 'moto' ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', scaledSize: { width: 45, height: 45 } as any }} />
                  ))}
                </GoogleMap>
              ) : <div className="h-full w-full bg-slate-800 animate-pulse flex items-center justify-center"><Loader2 className="animate-spin text-secondary" /></div>}
              
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-xl">
                <Button size="sm" onClick={() => setMapType('roadmap')} className={`h-8 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all ${mapType === 'roadmap' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-slate-100'}`}>Map</Button>
                <Button size="sm" onClick={() => setMapType('satellite')} className={`h-8 px-4 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all ${mapType === 'satellite' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-slate-100'}`}>Sat</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Button 
                 onClick={() => handleQuickRequest('moto')} 
                 disabled={isRequesting}
                 className={`h-24 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all shadow-xl ${isDark ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-[#0F172A] border border-slate-100'}`}
               >
                 <Bike size={32} className="text-secondary" />
                 <span className="text-xs font-black uppercase italic tracking-widest">{t.moto}</span>
               </Button>
               <Button 
                 onClick={() => handleQuickRequest('taxi')} 
                 disabled={isRequesting}
                 className={`h-24 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all shadow-xl ${isDark ? 'bg-white/5 text-white border border-white/10' : 'bg-white text-[#0F172A] border border-slate-100'}`}
               >
                 <CarIcon size={32} className="text-secondary" />
                 <span className="text-xs font-black uppercase italic tracking-widest">{t.taxi}</span>
               </Button>
            </div>

            <section className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h3 className={`text-sm font-black italic uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-slate-400'}`}>Nearby Drivers</h3>
                  <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-secondary/10 text-secondary">
                    {availableDrivers?.length || 0} Online
                  </span>
               </div>
               <div className="grid gap-3">
                  {availableDrivers?.map((driver: any) => (
                    <div key={driver.driverId} className={`group relative border rounded-2xl p-4 flex items-center justify-between transition-all duration-300 shadow-md hover:shadow-lg ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <Avatar className="size-12 border-2 border-secondary/20">
                          <AvatarImage src={`https://picsum.photos/seed/${driver.driverId}/200`} />
                          <AvatarFallback className="bg-slate-800 text-white"><User size={16} /></AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <h4 className={`text-base font-black italic ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{driver.name || 'Umushoferi'}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-secondary">{driver.vehicleType}</span>
                            <div className="flex items-center gap-0.5 text-accent">
                              <Star size={10} className="fill-current" />
                              <span className="text-[9px] font-black">4.8</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <a href={`tel:${driver.phone || '0780000000'}`}>
                        <Button size="icon" className="size-10 rounded-xl bg-secondary text-white hover:bg-secondary/90 shadow-lg">
                          <Phone size={18} />
                        </Button>
                      </a>
                    </div>
                  ))}
                  {(!availableDrivers || availableDrivers.length === 0) && (
                    <div className={`py-16 text-center space-y-4 rounded-[2rem] border-2 border-dashed ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                      <Navigation className="size-12 mx-auto text-slate-500 opacity-20" />
                      <p className={`text-[10px] font-black italic uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Searching for drivers nearby...</p>
                    </div>
                  )}
               </div>
            </section>
          </>
        ) : activeTab === 'profile' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            <header className="flex flex-col items-center text-center space-y-4 py-8">
              <Avatar className="size-32 border-4 border-secondary shadow-2xl">
                <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/400`} />
                <AvatarFallback className="bg-slate-800 text-white text-4xl font-black uppercase">{userProfile?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h2 className={`text-4xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{userProfile?.name || 'User'}</h2>
                <div className="flex items-center justify-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[9px] font-black uppercase tracking-widest border border-secondary/20">Member</span>
                  <div className="flex items-center gap-1 text-accent"><Star size={14} className="fill-current" /><span className="text-sm font-black">4.9</span></div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: 'Email', value: userProfile?.email || user?.email || 'N/A' },
                { icon: Phone, label: 'Phone', value: userProfile?.phone || 'N/A' },
                { icon: Calendar, label: 'Joined', value: '2024' },
                { icon: ShieldCheck, label: 'Security', value: 'Verified' }
              ].map((item, i) => (
                <div key={i} className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-md'}`}>
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                      <p className={`text-base font-black italic truncate ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-12">
              <Button 
                onClick={() => signOut(auth!)}
                className="w-full h-16 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-2 border-red-500/20 text-xl font-black italic uppercase tracking-widest shadow-xl transition-all active:scale-95 group"
              >
                <LogOut size={24} className="mr-3 group-hover:rotate-12 transition-transform" /> 
                {t.logout}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-24 text-center space-y-6">
            <History className="size-20 mx-auto text-slate-500 opacity-20" />
            <h3 className={`text-xl font-black italic uppercase tracking-tighter ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Nta mateka y'ingendo ahari</h3>
            <Button onClick={() => setActiveTab('home')} className="h-14 px-8 rounded-xl bg-secondary text-white text-sm font-black italic uppercase shadow-lg">Shaka urugendo rwa mbere</Button>
          </div>
        )}
      </main>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 flex justify-end">
           <div className={`w-72 h-full p-6 space-y-8 animate-in slide-in-from-right duration-500 border-l ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="relative w-7 h-7">{logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain rounded-lg" />}</div>
                    <h2 className={`text-lg font-black italic tracking-tighter uppercase ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>MUTAMBUKE</h2>
                 </div>
                 <Button variant="ghost" onClick={() => setIsMenuOpen(false)} className={isDark ? 'text-white' : 'text-[#0F172A]'}><X size={24} /></Button>
              </div>
              <div className="space-y-2">
                 {[
                   { id: 'home', label: 'UMUGENZI' },
                   { id: 'history', label: 'IBYATAMBUTSE' },
                   { id: 'profile', label: 'UMWIRONDORO' }
                 ].map((link) => (
                   <Button 
                     key={link.id} 
                     variant="ghost" 
                     onClick={() => { setActiveTab(link.id as any); setIsMenuOpen(false); }}
                     className={`w-full h-12 justify-start text-[10px] font-black tracking-widest uppercase transition-colors ${activeTab === link.id ? 'text-secondary bg-secondary/5' : isDark ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                   >
                     {link.label}
                   </Button>
                 ))}
              </div>
              <div className="pt-6 border-t border-white/10">
                <Button onClick={() => signOut(auth!)} className="w-full h-12 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase italic transition-all">
                   <LogOut size={16} className="mr-2" /> {t.logout}
                </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
