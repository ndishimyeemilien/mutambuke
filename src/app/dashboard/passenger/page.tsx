
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  User, 
  LogOut, 
  Loader2, 
  Phone, 
  Navigation, 
  Bike, 
  Car as CarIcon, 
  Star,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { collection, doc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { translations, Language } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyApdnBLqJeVW4c5t1Z32v8BzVBVWyJnY1g";

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const kigaliCenter = { lat: -1.9441, lng: 30.0619 };

export default function PassengerDashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pickup, setPickup] = useState('My Current Location');
  const [destination, setDestination] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'moto' | 'taxi'>('moto');
  const [passengerLocation, setPassengerLocation] = useState(kigaliCenter);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const logo = PlaceHolderImages.find(img => img.id === 'logo');

  const { data: userProfile, loading: profileLoading } = useDoc(user ? `users/${user.uid}` : null);
  
  const ridersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'drivers'), 
      where('status', '==', 'online'), 
      where('isVerified', '==', true),
      where('vehicleType', '==', vehicleTypeFilter)
    );
  }, [db, vehicleTypeFilter]);
  const { data: availableDrivers } = useCollection(ridersQuery);

  const activeRideQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'rides'),
      where('passengerId', '==', user.uid),
      where('status', 'in', ['requested', 'accepted', 'started'])
    );
  }, [db, user]);
  const { data: activeRides } = useCollection(activeRideQuery);
  const currentRide = activeRides?.[0];

  const lang = (userProfile?.language as Language) || 'rw';
  const t = translations[lang];

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPassengerLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log("Using default Kigali center");
        }
      );
    }
  }, []);

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  };

  const nearestDriver = useMemo(() => {
    if (!availableDrivers || availableDrivers.length === 0) return null;
    return availableDrivers.reduce((prev, curr) => {
      const prevDist = getDistance(passengerLocation.lat, passengerLocation.lng, prev.currentLocation?.lat || 0, prev.currentLocation?.lng || 0);
      const currDist = getDistance(passengerLocation.lat, passengerLocation.lng, curr.currentLocation?.lat || 0, curr.currentLocation?.lng || 0);
      return prevDist < currDist ? prev : curr;
    });
  }, [availableDrivers, passengerLocation]);

  async function handleRequestRide() {
    if (!db || !user || !destination) return;
    setIsRequesting(true);
    
    try {
      const rideId = doc(collection(db, 'rides')).id;
      const rideData = {
        rideId,
        passengerId: user.uid,
        passengerName: userProfile?.name || 'Passenger',
        passengerPhone: userProfile?.phone || '',
        pickupLocation: pickup,
        destination: destination,
        status: 'requested',
        vehicleType: vehicleTypeFilter,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'rides', rideId), rideData);
      toast({
        title: t.searching,
        description: "Connecting you to the nearest rider...",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleLogout() {
    if (auth) {
      await signOut(auth);
      router.replace('/landing');
    }
  }

  if (profileLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={passengerLocation}
          zoom={14}
          options={{
            disableDefaultUI: true,
            styles: [
              {
                featureType: "all",
                elementType: "labels.text.fill",
                color: "#9ca3af"
              },
              {
                featureType: "water",
                elementType: "geometry",
                color: "#e5e7eb"
              }
            ]
          }}
        >
          <Marker 
            position={passengerLocation} 
            icon={{
              url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
          />
          {availableDrivers?.map((driver) => (
            <Marker
              key={driver.driverId}
              position={driver.currentLocation || { lat: passengerLocation.lat + 0.005, lng: passengerLocation.lng + 0.005 }}
              icon={{
                url: driver.vehicleType === 'moto' 
                  ? 'https://cdn-icons-png.flaticon.com/512/3194/3194514.png' 
                  : 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png',
                scaledSize: new google.maps.Size(35, 35)
              }}
              title={driver.driverId}
            />
          ))}
        </GoogleMap>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-slate-900/20 pointer-events-none" />
      </div>

      <header className="relative z-30 p-4">
        <Card className="rounded-[2rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative size-10">
              {logo && <Image src={logo.imageUrl} alt="Logo" fill className="object-contain rounded-xl" />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase leading-none mb-1">MUTAMBUKE</p>
              <h1 className="text-sm font-black italic text-slate-900 uppercase leading-none">Smart Urban</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full text-slate-400 hover:text-red-500">
              <LogOut className="size-5" />
            </Button>
            <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-white">
              <User className="size-5 text-slate-600" />
            </div>
          </div>
        </Card>
      </header>

      <main className="flex-1 flex flex-col justify-end p-4 md:p-8 space-y-4 relative z-30 pointer-events-none">
        <div className="pointer-events-auto">
          {currentRide ? (
            <Card className="rounded-[2.5rem] border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden bg-white animate-in slide-in-from-bottom-20 duration-500">
              <div className={`${currentRide.status === 'requested' ? 'bg-primary' : 'bg-green-600'} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      {currentRide.status === 'requested' ? <Search className="size-8 animate-pulse" /> : <CheckCircle2 className="size-8" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic uppercase leading-tight">
                        {currentRide.status === 'requested' ? t.searching : t.rideConfirmed}
                      </h3>
                      <p className="text-[10px] font-bold opacity-70 tracking-widest mt-1 uppercase">Mission ID: {currentRide.rideId.slice(-6)}</p>
                    </div>
                  </div>
                  {currentRide.status === 'requested' && <Loader2 className="size-6 animate-spin" />}
                </div>
              </div>
              
              <CardContent className="p-8 space-y-8">
                 {currentRide.status !== 'requested' && currentRide.driverId && (
                   <div className="flex items-center justify-between bg-slate-50 p-5 rounded-[2rem] border-2 border-white shadow-sm">
                     <div className="flex items-center gap-4">
                       <div className="size-16 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm">
                         <User className="size-10" />
                       </div>
                       <div>
                         <p className="font-black text-slate-900 italic text-xl uppercase leading-none">{currentRide.driverName || 'Verified Rider'}</p>
                         <div className="flex items-center gap-2 mt-2">
                           <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400 text-[10px] font-black rounded-lg">
                             <Star className="size-3 fill-black" /> 4.9
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentRide.vehicleType}</p>
                         </div>
                       </div>
                     </div>
                     <a href={`tel:${currentRide.driverPhone}`} className="size-16 rounded-[1.25rem] bg-green-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                       <Phone className="size-8" />
                     </a>
                   </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex gap-4 items-start">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><MapPin className="size-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">{t.pickupAt}</p>
                        <p className="font-bold text-slate-900 text-lg leading-tight">{currentRide.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="size-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0"><Navigation className="size-5" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest mb-1 uppercase">{t.destination}</p>
                        <p className="font-bold text-slate-900 text-lg leading-tight">{currentRide.destination}</p>
                      </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[3rem] border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] p-8 space-y-8 bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-500">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                   <h2 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Where to?</h2>
                   <div className="flex gap-2">
                      <Button 
                        variant={vehicleTypeFilter === 'moto' ? 'default' : 'outline'} 
                        onClick={() => setVehicleTypeFilter('moto')}
                        className={`rounded-xl h-12 px-5 font-black italic gap-2 transition-all ${vehicleTypeFilter === 'moto' ? 'bg-secondary' : 'text-slate-400'}`}
                      >
                        <Bike className="size-4" /> {t.moto}
                      </Button>
                      <Button 
                        variant={vehicleTypeFilter === 'taxi' ? 'default' : 'outline'} 
                        onClick={() => setVehicleTypeFilter('taxi')}
                        className={`rounded-xl h-12 px-5 font-black italic gap-2 transition-all ${vehicleTypeFilter === 'taxi' ? 'bg-primary' : 'text-slate-400'}`}
                      >
                        <CarIcon className="size-4" /> {t.taxi}
                      </Button>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 group">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Current Location</Label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 size-2 bg-primary rounded-full ring-4 ring-primary/20" />
                      <Input 
                        placeholder="Pickup point..." 
                        className="h-16 pl-14 rounded-[1.5rem] bg-slate-50 border-none font-bold text-lg focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" 
                        value={pickup} 
                        onChange={(e) => setPickup(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 group">
                    <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2">Destination</Label>
                    <div className="relative">
                      <Navigation className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-secondary" />
                      <Input 
                        placeholder="Enter destination..." 
                        className="h-16 pl-14 rounded-[1.5rem] bg-slate-50 border-none font-bold text-lg focus:bg-white focus:ring-2 focus:ring-secondary/20 transition-all" 
                        value={destination} 
                        onChange={(e) => setDestination(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleRequestRide} 
                  disabled={!destination || isRequesting} 
                  className={`w-full h-20 rounded-[1.75rem] text-2xl font-black shadow-2xl uppercase italic transition-all active:scale-95 ${vehicleTypeFilter === 'moto' ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'}`}
                >
                  {isRequesting ? <Loader2 className="size-8 animate-spin" /> : t.confirmed}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
