import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ShieldCheck, Phone, User, Mail, Store, Lock, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const { login, register, resetPinRequest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, pin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({ username, mobile, email, pin, shopName });
      setSuccess('Registration submitted! Awaiting admin approval.');
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await resetPinRequest(username, mobile);
      setSuccess(data.message);
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-frame bg-white">
      <div className="mobile-content flex flex-col pt-20">
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-100">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">OmniAuth</h1>
          <p className="text-slate-400 text-sm mt-1">Secure Record Management</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-6 text-center">
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold mb-6 text-center">
            {success}
          </motion.div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                required
                type="text" 
                placeholder="Username"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                required
                type="password" 
                maxLength={6}
                placeholder="6-Digit PIN"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <div className="text-right">
              <button type="button" onClick={() => setMode('reset')} className="text-xs font-bold text-slate-400 hover:text-emerald-600">Forgot PIN?</button>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Login Now'}
            </button>
            <p className="text-center text-sm text-slate-400 mt-6">
              Don't have an account? <button type="button" onClick={() => setMode('register')} className="text-emerald-600 font-bold">Sign Up</button>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setMode('login')} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={16} /></button>
              <h2 className="font-bold">Create Account</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Input icon={<User size={18}/>} placeholder="Username" value={username} onChange={setUsername} />
              <Input icon={<Phone size={18}/>} placeholder="Mobile Number" value={mobile} onChange={setMobile} />
              <Input icon={<Mail size={18}/>} placeholder="Email Address" value={email} onChange={setEmail} />
              <Input icon={<Store size={18}/>} placeholder="Shop Name" value={shopName} onChange={setShopName} />
              <Input icon={<Lock size={18}/>} placeholder="6-Digit PIN" type="password" maxLength={6} value={pin} onChange={setPin} />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Submitting...' : 'Register Account'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setMode('login')} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={16} /></button>
              <h2 className="font-bold">Reset Security PIN</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Enter your username and registered mobile number to receive reset instructions.</p>
            
            <Input icon={<User size={18}/>} placeholder="Username" value={username} onChange={setUsername} />
            <Input icon={<Phone size={18}/>} placeholder="Registered Mobile" value={mobile} onChange={setMobile} />

            <button 
              disabled={loading}
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Processing...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({ icon, placeholder, type = "text", value, onChange, maxLength }: any) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>
      <input 
        required
        type={type} 
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl py-3 pl-12 pr-4 focus:bg-white focus:border-emerald-500 transition-all outline-none text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
