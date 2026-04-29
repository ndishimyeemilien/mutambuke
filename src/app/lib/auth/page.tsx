
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Globe, 
  CheckCircle2, 
  Phone, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Calendar, 
  Car, 
  FileText, 
  Languages, 
  Camera,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { translations, Language } from '@/lib/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const InputWrapper = ({ icon: Icon, children, className = "" }: { icon: any, children: React.ReactNode, className?: string }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-secondary transition-colors">
      <Icon size={20} />
    </div>
    {children}
  </div>
);

export default function AuthPage() {
  const [lang, setLang] = useState<Language>('rw');
  const t = translations[lang];
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const logo = PlaceHolderImages.find(img => img.id === 'logo');
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [vehicleType, setVehicleType] = useState<'moto' | 'taxi' | ''>('');
  const [licenseCategory, setLicenseCategory] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    if (isSuccess && user) {
      router.replace('/');
    }
  }, [isSuccess, user, router]);

  const getErrorMessage = (error: any) => {
    const code = error.code;
    if (code === 'auth/email-already-in-use') return t.errorEmailInUse;
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return t.errorInvalidAuth;
    return error.message || t.errorGeneric;
  };

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !db) return;

    setIsLoading(true);
    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const internalEmail = `${cleanPhone}@mutambuke.com`;

      if (isLogin) {
        await signInWithEmailAndPassword(auth, internalEmail, password);
        setIsSuccess(true);
      } else {
        if (!name.trim()) throw new Error(t.fullName);
        if (!phone.trim()) throw new Error(t.phone);
        if (role === 'driver' && !plateNumber.trim()) throw new Error(t.plateNumber);
        if (role === 'driver' && !vehicleType) throw new Error("Please select a vehicle type.");

        const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, password);
        const newUser = userCredential.user;

        const userData = {
          userId: newUser.uid,
          name: name.trim(),
          email: internalEmail,
          phone: cleanPhone,
          role: role,
          language: lang,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', newUser.uid), userData);

        if (role === 'driver') {
          await setDoc(doc(db, 'drivers', newUser.uid), {
            driverId: newUser.uid,
            status: 'offline',
            verificationStatus: 'pending',
            vehicleType: vehicleType,
            plateNumber: plateNumber.trim().toUpperCase(),
            gender,
            dob,
            licenseCategory,
            vehicleModel,
            licenseNumber,
            updatedAt: serverTimestamp(),
          });
        }
        setIsSuccess(true);
      }
    } catch (error: any) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: lang === 'rw' ? "Ikosa" : "Error",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-body text-white">
      {isSuccess && (
        <div className="fixed inset-0 z-[100] bg-[#0F172A] flex flex-col items-center justify-center animate-in fade-in duration-100">
          <div className="size-20 rounded-2xl bg-secondary/20 flex items-center justify-center text-secondary mb-4 shadow-2xl">
            <CheckCircle2 size={40} className="animate-bounce" />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">WELCOME</h2>
        </div>
      )}

      <div className="max-w-md w-full space-y-6 bg-white/5 p-8 rounded-[2rem] shadow-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="relative w-12 h-12 overflow-hidden rounded-xl">
            {logo ? (
              <Image src={logo.imageUrl} alt="MUTAMBUKE" fill className="object-cover" priority />
            ) : (
              <div className="size-full bg-secondary flex items-center justify-center text-white font-black">M</div>
            )}
          </div>
          <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
            <SelectTrigger className="w-[120px] h-10 rounded-xl bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest">
              <Globe size={14} className="mr-2 text-secondary" />
              <SelectValue placeholder="Lang" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
              <SelectItem value="rw" className="font-black text-[10px]">Kinyarwanda</SelectItem>
              <SelectItem value="en" className="font-black text-[10px]">English</SelectItem>
              <SelectItem value="fr" className="font-black text-[10px]">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">MUTAMBUKE</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[8px]">Smart Urban Mobility</p>
        </div>

        {!isLogin && (
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => setRole('passenger')}
              className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${role === 'passenger' ? 'bg-secondary/10 border-secondary/50 text-secondary' : 'bg-white/5 border-white/5 text-slate-500'}`}
            >
              <User size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest mt-1">{t.passenger}</span>
            </Button>
            <Button 
              onClick={() => setRole('driver')}
              className={`h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${role === 'driver' ? 'bg-secondary/10 border-secondary/50 text-secondary' : 'bg-white/5 border-white/5 text-slate-500'}`}
            >
              <ShieldCheck size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest mt-1">{t.rider}</span>
            </Button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-3">
            {!isLogin && (
              <InputWrapper icon={User}>
                <Input 
                  placeholder={t.fullName} 
                  className="h-14 pl-12 rounded-xl bg-white/5 border-white/10 focus:border-secondary transition-all font-bold placeholder:text-slate-500 text-sm" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </InputWrapper>
            )}

            <InputWrapper icon={Phone}>
              <Input 
                placeholder={t.phone} 
                className="h-14 pl-12 rounded-xl bg-white/5 border-white/10 focus:border-secondary transition-all font-bold placeholder:text-slate-500 text-sm" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </InputWrapper>

            <InputWrapper icon={Lock}>
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder={t.password} 
                className="h-14 pl-12 pr-12 rounded-xl bg-white/5 border-white/10 focus:border-secondary transition-all font-bold placeholder:text-slate-500 text-sm" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </InputWrapper>
          </div>

          {!isLogin && role === 'driver' && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                <div className="h-px bg-white/5 flex-1" />
                {t.driverDetails}
                <div className="h-px bg-white/5 flex-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold" placeholder={t.plateNumber} value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required />
                <Select value={vehicleType} onValueChange={(v: 'moto' | 'taxi' | '') => setVehicleType(v)} required>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold text-slate-500">
                    <SelectValue placeholder={t.vehicleType || "Vehicle Type"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
                    <SelectItem value="moto" className="font-bold text-xs">Moto</SelectItem>
                    <SelectItem value="taxi" className="font-bold text-xs">Taxi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-16 rounded-2xl bg-secondary hover:bg-secondary/90 text-[#0F172A] text-lg font-black italic shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
              disabled={isLoading || isSuccess}
            >
              {isLoading ? <Loader2 className="animate-spin size-6" /> : (
                <>
                  {isLogin ? t.login : t.signup}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black uppercase tracking-widest text-secondary/60 hover:text-secondary transition-colors"
          >
            {isLogin ? "Kora konti nshya" : "Sanzwe ufite konti? Yinjira"}
          </button>
        </div>
      </div>
    </div>
  );
}
