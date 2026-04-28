
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth, useFirestore, useUser, useDoc } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { translations, Language } from '@/lib/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [lang, setLang] = useState<Language>('rw');
  const t = translations[lang];
  const { toast } = useToast();
  const router = useRouter();

  const { user, loading: authLoading } = useUser();
  const { data: profile } = useDoc(user ? `users/${user.uid}` : null);
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Driver specific fields
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    if (user && profile && isSuccess) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, profile, isSuccess, router]);

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
            vehicleType: vehicleBrand.toLowerCase().includes('moto') ? 'moto' : 'taxi',
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

  const InputWrapper = ({ icon: Icon, children, className = "" }: { icon: any, children: React.ReactNode, className?: string }) => (
    <div className={`relative group ${className}`}>
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors">
        <Icon size={20} />
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1f2d3a] flex flex-col items-center justify-center p-4 md:p-12 font-body text-white">
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-[#1f2d3a] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="size-24 rounded-[2rem] bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 scale-110 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            <CheckCircle2 className="size-12" />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">SUCCESSFUL</h2>
          <p className="text-slate-400 font-bold italic mt-2">Connecting to Mutambuke network...</p>
        </div>
      )}

      <div className="max-w-3xl w-full space-y-8 bg-[#253341] p-6 md:p-10 rounded-[2.5rem] shadow-2xl">
        {/* Language Selector */}
        <div className="flex justify-end">
          <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-slate-800/50 border-slate-700/50 text-xs font-black">
              <Globe className="size-4 mr-2 text-blue-400" />
              <SelectValue placeholder="Lang" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-700 bg-slate-900 text-white">
              <SelectItem value="rw" className="font-black">RWANDA</SelectItem>
              <SelectItem value="en" className="font-black">ENGLISH</SelectItem>
              <SelectItem value="fr" className="font-black">FRANÇAIS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Form Container */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">MUTAMBUKE</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Smart Urban Mobility System</p>
          </div>

          {/* Header Toggle */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Button 
                onClick={() => setRole('passenger')}
                className={`h-24 md:h-28 rounded-[1.5rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${role === 'passenger' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}
              >
                <div className="size-8 md:size-10 rounded-full bg-slate-700/50 flex items-center justify-center" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{t.passenger}</span>
              </Button>
              <Button 
                onClick={() => setRole('driver')}
                className={`h-24 md:h-28 rounded-[1.5rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${role === 'driver' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-800/30 border-slate-700/50 text-slate-500'}`}
              >
                <ShieldCheck className="size-8 md:size-10" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{t.rider}</span>
              </Button>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <div className={`grid gap-4 ${!isLogin && role === 'driver' ? 'md:grid-cols-1' : ''}`}>
              {!isLogin && (
                <InputWrapper icon={User}>
                  <Input 
                    placeholder={t.fullName} 
                    className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-500 text-lg" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </InputWrapper>
              )}

              <InputWrapper icon={Phone}>
                <Input 
                  placeholder={t.phone} 
                  className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-500 text-lg" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
              </InputWrapper>

              <InputWrapper icon={Lock}>
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder={t.password} 
                  className="h-16 pl-14 pr-12 rounded-2xl bg-slate-800/40 border-slate-700/50 focus:border-blue-500/50 transition-all font-bold placeholder:text-slate-500 text-lg" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </InputWrapper>
            </div>

            {/* Driver Specific Section */}
            {!isLogin && role === 'driver' && (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-center gap-4 py-2">
                   <div className="h-px bg-slate-700/50 flex-1" />
                   <div className="flex items-center gap-2 text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <CheckCircle2 size={16} className="text-blue-500" />
                      {t.driverDetails}
                   </div>
                   <div className="h-px bg-slate-700/50 flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWrapper icon={User}>
                    <Input 
                      placeholder={t.gender} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    />
                  </InputWrapper>
                  <InputWrapper icon={Calendar}>
                    <Input 
                      placeholder={t.dob} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </InputWrapper>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWrapper icon={Car}>
                    <Input 
                      placeholder={t.vehicleBrand} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                    />
                  </InputWrapper>
                  <InputWrapper icon={FileText}>
                    <Input 
                      placeholder={t.licenseCategory} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      value={licenseCategory}
                      onChange={(e) => setLicenseCategory(e.target.value)}
                    />
                  </InputWrapper>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWrapper icon={Car}>
                    <Input 
                      placeholder={t.vehicleModel} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                    />
                  </InputWrapper>
                  <InputWrapper icon={Languages}>
                    <Input 
                      placeholder={t.plateNumber} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 uppercase text-lg" 
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                    />
                  </InputWrapper>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWrapper icon={FileText}>
                    <Input 
                      placeholder={t.licenseNumber} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                    />
                  </InputWrapper>
                  <InputWrapper icon={Camera}>
                    <Input 
                      placeholder={t.profilePhoto} 
                      className="h-16 pl-14 rounded-2xl bg-slate-800/40 border-slate-700/50 font-bold placeholder:text-slate-500 text-lg" 
                      readOnly
                    />
                  </InputWrapper>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full h-20 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white text-2xl font-black italic shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group"
                disabled={isLoading || isSuccess}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {isLogin ? t.login : t.signup}
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center pt-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isLogin ? "Kora konti nshya" : "Sanzwe ufite konti? Yinjira"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
