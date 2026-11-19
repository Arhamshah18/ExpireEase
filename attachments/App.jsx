import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {
  Hourglass,
  Package,
  ScanLine,
  ShoppingBag,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  Check,
  AlertTriangle,
  FileDown,
  Mail,
  User,
  Plus,
  RotateCcw,
  Trash2,
  RefreshCw,
  Search,
  ChevronRight,
  Lock
} from 'lucide-react';

/* --------------------------------------------------
   UTILITY CONSTANTS
--------------------------------------------------- */
const BLOCKED_CLASSES = [
  'laptop', 'notebook', 'screen', 'monitor', 'keyboard', 'computer',
  'desk', 'chair', 'television', 'mouse', 'handheld', 'phone',
  'cellular', 'display', 'window', 'ceiling', 'floor', 'wall',
  'space', 'heater', 'light', 'lamp', 'table', 'bottle', 'cup',
  'mug', 'glass', 'container', 'box', 'package', 'bag'
];

const CATEGORIES = ['Produce', 'Dairy', 'Bakery', 'Beverages', 'Pantry', 'Meat/Seafood'];

/* --------------------------------------------------
   SHELF LIFE ENGINE (7-stage)
--------------------------------------------------- */
function getShelfLifeData(mfd, exp) {
  if (!mfd || !exp) return { pct: 0, stage: 'Invalid', color: '#94a3b8', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };

  const mfdTime = new Date(mfd).getTime();
  const expTime = new Date(exp).getTime();
  const now = Date.now();

  if (isNaN(mfdTime) || isNaN(expTime) || expTime <= mfdTime) {
    return { pct: 0, stage: 'Invalid', color: '#94a3b8', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  }

  const total = expTime - mfdTime;
  const remaining = expTime - now;
  const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));

  if (now > expTime) return { pct: 0, stage: 'Expired', color: '#ef4444', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  if (pct <= 10) return { pct, stage: 'Critical', color: '#ef4444', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  if (pct <= 25) return { pct, stage: 'Urgent', color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  if (pct <= 50) return { pct, stage: 'Moderate', color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  if (pct <= 75) return { pct, stage: 'Fresh', color: '#84cc16', bg: 'bg-lime-500/10', border: 'border-lime-500/20' };
  return { pct, stage: 'Safe', color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
}

/* --------------------------------------------------
   INTERACTIVE SMILEY MASCOT COMPONENT
--------------------------------------------------- */
function SmileyMascot({ expression }) {
  const faceRef = useRef(null);

  return (
    <div
      ref={faceRef}
      className="relative w-24 h-24 mx-auto mb-8 bg-emerald-accent rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] transition-transform duration-500 hover:scale-105"
    >
      {/* Eyelids (peek-a-boo) */}
      <div
        className="absolute top-0 left-0 w-full h-10 bg-emerald-accent rounded-t-full transition-all duration-300"
        style={{ transform: `scaleY(${expression.eyelids})`, transformOrigin: 'center top' }}
      />
      <div
        className="absolute top-0 left-0 w-full h-10 bg-emerald-accent rounded-t-full transition-all duration-300"
        style={{ transform: `scaleY(${expression.eyelids})`, transformOrigin: 'center top' }}
      />

      {/* Eyes */}
      <div className="flex gap-5">
        <div className="w-3.5 h-3.5 bg-[#0a0a0a] rounded-full relative">
          <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full opacity-80" />
        </div>
        <div className="w-3.5 h-3.5 bg-[#0a0a0a] rounded-full relative">
          <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full opacity-80" />
        </div>
      </div>

      {/* Mouth */}
      <div
        className="absolute transition-all duration-500"
        style={{
          bottom: '24px',
          width: expression.mouthWidth,
          height: expression.mouthHeight,
          border: `3px solid #0a0a0a`,
          borderRadius: expression.mouthType === 'frown' ? '0 0 100% 100%' : '0 0 100% 100%',
          transform: expression.mouthType === 'frown' ? 'rotate(180deg)' : 'rotate(0deg)'
        }}
      />
    </div>
  );
}

/* --------------------------------------------------
   MAIN APP COMPONENT
--------------------------------------------------- */
export default function App() {
  /* ------------ THEME LOGIC ------------ */
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
  }, [theme]);

  /* ------------ AUTH STATE ------------ */
  const [currentUser, setCurrentUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  /* ------------ APP STATE ------------ */
  const [activeTab, setActiveTab] = useState('stock');
  const [now, setNow] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');

  /* ------------ INVENTORY DATA ------------ */
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);

  /* ------------ SCANNER STATE ------------ */
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'Produce', mfd: '', exp: '', quantity: 1
  });
  const [scanStatus, setScanStatus] = useState('');
  const [detectedType, setDetectedType] = useState(null);
  const [isNonFoodError, setIsNonFoodError] = useState(false);

  /* ------------ MASCOT EXPRESSION STATE ------------ */
  const [mascotExpr, setMascotExpr] = useState({
    eyelids: 0,
    mouthType: 'neutral',
    mouthWidth: 10,
    mouthHeight: 5
  });

  /* ------------ TIME & GREETING ------------ */
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = setInterval(tick, 60000);
    tick();
    return () => clearInterval(t);
  }, []);

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [now]);

  const namePart = currentUser?.name || 'Guest';
  const subtitles = [
    'Kitchen stock looks fresh today.',
    'Ready to track your pantry.',
    'Keep waste at zero today.',
    'Expiry dates at your fingertips.',
    'Zero-waste starts here.'
  ];
  const subtitle = subtitles[now.getHours() % subtitles.length];

  /* ------------ MOBILENET INITIALIZATION ------------ */
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        await tf.ready();
        const net = await mobilenet.load({ version: 2, alpha: 0.75 });
        if (mounted) setModel(net);
      } catch (err) {
        console.error('AI loading failed', err);
      } finally {
        if (mounted) setIsModelLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  /* ------------ DEMO DATA ------------ */
  useEffect(() => {
    const localItems = localStorage.getItem('expireease_inventory');
    const localHistory = localStorage.getItem('expireease_history');

    if (localItems) {
      setItems(JSON.parse(localItems));
    } else {
      setItems([
        { id: 1, name: 'Organic Milk 1L', category: 'Dairy', mfd: '2026-11-01', exp: '2026-11-20', quantity: 1 },
        { id: 2, name: 'Greek Yogurt', category: 'Dairy', mfd: '2026-11-05', exp: '2026-11-18', quantity: 2 },
        { id: 3, name: 'Whole Grain Bread', category: 'Bakery', mfd: '2026-11-10', exp: '2026-11-15', quantity: 1 }
      ]);
    }

    if (localHistory) {
      setHistory(JSON.parse(localHistory));
    } else {
      setHistory([
        { id: 101, name: 'Paneer 200g', category: 'Dairy', status: 'USED', timestamp: '10 Nov, 09:30 AM' },
        { id: 102, name: 'Butter 500g', category: 'Dairy', status: 'WASTED', timestamp: '09 Nov, 04:00 PM' }
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('expireease_inventory', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('expireease_history', JSON.stringify(history));
  }, [history]);

  /* ------------ HANDLERS ------------ */
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setMascotExpr({ eyelids: 0, mouthType: 'frown', mouthWidth: 12, mouthHeight: 5 });
      return;
    }
    if (isRegistering && !authName.trim()) {
      setMascotExpr({ eyelids: 0, mouthType: 'frown', mouthWidth: 12, mouthHeight: 5 });
      return;
    }
    setCurrentUser({ name: isRegistering ? authName.trim() : 'Arham', email: authEmail });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthName('');
    setAuthEmail('');
    setAuthPassword('');
    setIsRegistering(false);
  };

  const handleSetStatus = (id, status) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const entry = {
      ...item,
      status,
      timestamp: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };
    setItems(items.filter(i => i.id !== id));
    setHistory([entry, ...history]);
  };

  const handleSnapCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setIsNonFoodError(false);
    setScanStatus('Analyzing image...');
    setDetectedType(null);

    try {
      const reader = new FileReader();
      const imgData = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = imgData;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 224; canvas.height = 224;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 224, 224);

      // AI Branch
      if (!model) throw new Error('AI Model not loaded');
      const predictions = await model.classify(canvas);
      const top = predictions[0];
      const label = top.className.toLowerCase();

      if (BLOCKED_CLASSES.some(k => label.includes(k))) {
        setIsNonFoodError(true);
        setDetectedType(top.className.split(',')[0]);
        setScanStatus('Blocked: Non-food item detected.');
        setIsProcessing(false);
        return;
      }

      setFormData({
        name: top.className.split(',')[0].charAt(0).toUpperCase() + top.className.split(',')[0].slice(1),
        category: CATEGORIES.find(c => label.includes(c.toLowerCase().split('/')[0])) || 'Produce',
        mfd: new Date().toISOString().split('T')[0],
        exp: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        quantity: 1
      });
      setDetectedType(top.className.split(',')[0]);
      setScanStatus(`✓ Identified ${top.className} (${Math.round(top.probability * 100)}%)`);
    } catch (err) {
      setScanStatus('Failed to process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.exp) return;
    const newItem = { id: Date.now(), ...formData, quantity: Number(formData.quantity) };
    setItems([newItem, ...items]);
    setFormData({ name: '', category: 'Produce', mfd: '', exp: '', quantity: 1 });
    setDetectedType(null); setScanStatus(''); setActiveTab('stock');
  };

  const consumedItems = history.filter(h => h.status === 'USED');
  const wastedItems = history.filter(h => h.status === 'WASTED');
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalConsumed = consumedItems.length;
  const totalWasted = wastedItems.length;

  /* ------------ AUTH SCREEN ------------ */
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-main flex flex-col items-center justify-center p-6 font-body">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-item border border-theme rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />

            <SmileyMascot expression={mascotExpr} />

            <div className="text-center mb-10">
              <h1 className="font-display font-bold text-3xl text-main tracking-tight mb-2"><span style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Expire</span><span style={{ fontFamily: 'Space Grotesk, sans-serif', fontStyle: 'italic' }}>Ease</span></h1>
              <p className="text-sub text-sm font-medium">Kitchen Inventory & Expiry Tracker</p>
            </div>

            <div className="flex bg-sub p-1.5 rounded-2xl mb-8 border border-theme">
              <button
                onClick={() => setIsRegistering(false)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-400 ${!isRegistering ? 'bg-emerald-accent text-nothing-900 shadow-lg' : 'text-sub hover:text-main'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsRegistering(true)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-400 ${isRegistering ? 'bg-emerald-accent text-nothing-900 shadow-lg' : 'text-sub hover:text-main'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-6">
              {isRegistering && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text" required value={authName} onChange={e => setAuthName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-12 pr-5 py-4 rounded-2xl bg-sub border border-theme text-main placeholder-slate-600 focus:border-emerald-accent outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email" required value={authEmail}
                    onChange={e => {
                      setAuthEmail(e.target.value);
                      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
                      setMascotExpr(valid
                        ? { eyelids: 0, mouthType: 'smile', mouthWidth: 14, mouthHeight: 6 }
                        : { eyelids: 0, mouthType: 'neutral', mouthWidth: 10, mouthHeight: 5 }
                      );
                    }}
                    placeholder="name@household.com"
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-sub border border-theme text-main placeholder-slate-600 focus:border-emerald-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password" required value={authPassword}
                    onChange={e => {
                      setAuthPassword(e.target.value);
                      setMascotExpr({ eyelids: 1, mouthType: 'neutral', mouthWidth: 10, mouthHeight: 5 });
                    }}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-sub border border-theme text-main placeholder-slate-600 focus:border-emerald-accent outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-5 rounded-[1.75rem] font-display font-bold text-lg bg-emerald-accent text-nothing-900 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 mt-4">
                {isRegistering ? 'Create Account' : 'Sign In Now'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ------------ MAIN DASHBOARD ------------ */
  return (
    <div className="min-h-screen bg-main text-main flex flex-col font-body selection:bg-emerald-accent selection:text-nothing-900">
      {/* Executive Header */}
      <header className="sticky top-0 z-50 bg-sub/80 backdrop-blur-xl border-b border-theme px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-accent/10 border border-emerald-accent/20 flex items-center justify-center">
            <Hourglass className="w-6 h-6 text-emerald-accent" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight leading-none mb-1"><span>Expire</span><span style={{ fontStyle: 'italic' }}>Ease</span></h1>
            <p className="text-[10px] font-bold text-emerald-accent uppercase tracking-widest leading-none">{greeting}, {namePart}</p>
            <p className="text-[9px] text-sub mt-1">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-item border border-theme text-main hover:bg-sub transition-all active:scale-90"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={handleLogout}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-90"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 space-y-8 pb-36 max-w-2xl mx-auto w-full">

        {/* STOCK TAB */}
        {activeTab === 'stock' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-2xl flex items-center gap-3">
                <Package className="w-7 h-7 text-emerald-accent" />
                Kitchen Stock
              </h2>
              <div className="bg-emerald-accent/10 text-emerald-accent px-4 py-1.5 rounded-full font-display font-bold text-sm border border-emerald-accent/20">
                {items.length} Items
              </div>
            </div>

            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-accent transition-colors" />
              <input
                type="text" placeholder="Search your pantry..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-item border border-theme text-sm focus:border-emerald-accent outline-none transition-all shadow-sm"
              />
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-item border border-theme border-dashed rounded-[2.5rem] p-16 text-center">
                <div className="w-20 h-20 bg-sub rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">No items found</h3>
                <p className="text-sm text-sub mb-8">Ready to scan your first product?</p>
                <button
                  onClick={() => setActiveTab('scan')}
                  className="px-8 py-3.5 bg-emerald-accent text-nothing-900 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                >
                  Go to Scan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map(item => {
                  const s = getShelfLifeData(item.mfd, item.exp);
                  return (
                    <div key={item.id} className="bg-item border border-theme rounded-[2rem] p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-emerald-accent/30 transition-all duration-300">
                      <div className="absolute top-0 left-0 w-2 h-full opacity-80" style={{ backgroundColor: s.color }} />

                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h4 className="font-bold text-lg text-main truncate leading-tight">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-sub bg-sub px-2.5 py-1 rounded-lg border border-theme">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        <div className={`font-mono-tech font-bold text-xs px-3 py-1.5 rounded-xl border ${s.bg} ${s.border}`} style={{ color: s.color }}>
                          {s.pct}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px] font-mono-tech text-sub">
                        <div className="bg-sub/40 p-3 rounded-2xl border border-theme">
                          <p className="opacity-50 mb-1 font-bold">MFD</p>
                          <p className="text-main font-bold text-xs">{item.mfd}</p>
                        </div>
                        <div className="bg-sub/40 p-3 rounded-2xl border border-theme">
                          <p className="opacity-50 mb-1 font-bold">EXP</p>
                          <p className="text-main font-bold text-xs">{item.exp}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-1">
                        <button
                          onClick={() => handleSetStatus(item.id, 'USED')}
                          className="flex-1 py-3.5 bg-emerald-accent/10 border border-emerald-accent/20 text-emerald-accent rounded-2xl font-bold text-[11px] uppercase tracking-wider hover:bg-emerald-accent hover:text-nothing-900 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Check className="w-4 h-4" /> Consumed
                        </button>
                        <button
                          onClick={() => handleSetStatus(item.id, 'WASTED')}
                          className="flex-1 py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl font-bold text-[11px] uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" /> Wasted
                        </button>
                      </div>

                      {s.pct <= 10 && (
                        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-500 animate-pulse">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] leading-tight">Critical Expiry Warning: Please use or discard item.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SCAN TAB */}
        {activeTab === 'scan' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-display font-bold text-2xl flex items-center gap-3 text-main">
              <ScanLine className="w-7 h-7 text-emerald-accent" />
              Smart Scanner
            </h2>

            <div className="bg-item border border-theme rounded-[2.5rem] overflow-hidden shadow-xl">
              <div className="p-10 text-center border-b border-theme relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-accent/5 rounded-full blur-3xl" />

                <div className="w-24 h-24 bg-sub rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-theme">
                  <ScanLine className="w-10 h-10 text-emerald-accent animate-pulse" />
                </div>
                <h3 className="font-display font-bold text-xl mb-3">Snapshot Identify</h3>
                <p className="text-sm text-sub mb-10 max-w-[240px] mx-auto leading-relaxed">Point your camera at food items for automatic shelf-life calculation.</p>

                <div className="relative group max-w-[260px] mx-auto">
                  <input
                    type="file" accept="image/*" capture="environment"
                    disabled={isModelLoading || isProcessing}
                    onChange={handleSnapCapture}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />
                  <div className={`py-5 rounded-[1.75rem] font-display font-bold text-lg flex items-center justify-center gap-3 transition-all duration-500 ${
                    isModelLoading || isProcessing ? 'bg-sub text-slate-600' : 'bg-emerald-accent text-nothing-900 shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95'
                  }`}>
                    {isModelLoading ? <><RefreshCw className="w-6 h-6 animate-spin" /> Preparing AI</> :
                     isProcessing ? <><RefreshCw className="w-6 h-6 animate-spin" /> Analyzing</> :
                     <><Plus className="w-6 h-6" /> Take Snapshot</>}
                  </div>
                </div>
              </div>

              {scanStatus && (
                <div className={`p-5 flex items-center justify-center gap-3 ${isNonFoodError ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-accent/5 text-emerald-accent'}`}>
                  {isNonFoodError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{scanStatus}</span>
                </div>
              )}
            </div>

            {detectedType && !isProcessing && !isNonFoodError && (
              <div className="bg-item border border-theme rounded-[2.5rem] p-8 space-y-8 animate-fade-in shadow-2xl relative">
                <div className="flex items-center gap-5 border-b border-theme pb-8">
                  <div className="w-20 h-20 bg-emerald-accent/10 border border-emerald-accent/20 rounded-[1.75rem] flex items-center justify-center">
                    <Check className="w-10 h-10 text-emerald-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-2xl truncate mb-1">{formData.name}</h3>
                    <p className="text-[10px] font-bold text-emerald-accent uppercase tracking-[0.2em]">Item Identified</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Edit Name</label>
                  <input
                    type="text" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Edit detected name..."
                    className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none transition-all"
                  />
                </div>

                <form onSubmit={handleAddItem} className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Category</label>
                      <select
                        value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none appearance-none cursor-pointer"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Quantity</label>
                      <input
                        type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Mfg Date</label>
                      <input
                        type="date" required value={formData.mfd} onChange={e => setFormData({...formData, mfd: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Expiry Date</label>
                      <input
                        type="date" required value={formData.exp} onChange={e => setFormData({...formData, exp: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-sub border border-emerald-accent/40 text-sm text-main focus:border-emerald-accent outline-none font-mono"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 bg-emerald-accent text-nothing-900 rounded-[1.75rem] font-display font-bold text-xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all mt-4">
                    Confirm & Save
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="bg-item border border-theme rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />

            <div className="flex items-center gap-5 border-b border-theme pb-6 mb-8">
              <div className="w-16 h-16 bg-emerald-accent/10 border border-emerald-accent/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                <Plus className="w-8 h-8 text-emerald-accent" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl mb-1">Manual Entry</h3>
                <p className="text-[10px] text-sub font-bold uppercase tracking-[0.2em]">Add items without scanning</p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Item Name</label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Fresh Spinach"
                  className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Category</label>
                  <select
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none appearance-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Quantity</label>
                  <input
                    type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Mfg Date</label>
                  <input
                    type="date" required value={formData.mfd} onChange={e => setFormData({...formData, mfd: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-sub border border-theme text-sm text-main focus:border-emerald-accent outline-none font-mono"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-sub uppercase tracking-[0.2em] ml-2">Expiry Date</label>
                  <input
                    type="date" required value={formData.exp} onChange={e => setFormData({...formData, exp: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-sub border border-emerald-accent/40 text-sm text-main focus:border-emerald-accent outline-none font-mono"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-emerald-accent text-nothing-900 rounded-[1.75rem] font-display font-bold text-xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all mt-4">
                Save to Stock
              </button>
            </form>
          </div>
        )}

        {/* SHOPPING TAB */}
        {activeTab === 'shopping' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-2xl flex items-center gap-3">
                <ShoppingBag className="w-7 h-7 text-emerald-accent" />
                Shopping List
              </h2>
              <button
                onClick={() => window.print()}
                className="px-5 py-3 rounded-2xl bg-item border border-theme text-main hover:bg-sub transition-all flex items-center gap-2 active:scale-95 shadow-sm"
              >
                <FileDown className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Export PDF</span>
              </button>
            </div>

            <div className="bg-item border border-theme rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />

              <div className="flex items-center gap-5 border-b border-theme pb-8 mb-8">
                <div className="w-16 h-16 bg-emerald-accent/10 border border-emerald-accent/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                  <RotateCcw className="w-8 h-8 text-emerald-accent" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl mb-1">Restock Hub</h3>
                  <p className="text-[10px] text-sub font-bold uppercase tracking-[0.2em]">Verified Consumer History</p>
                </div>
              </div>

              {consumedItems.length === 0 ? (
                <div className="py-20 text-center opacity-40">
                  <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-5" />
                  <p className="text-sm font-medium">No restock items generated yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-theme">
                  {consumedItems.map((item, i) => (
                    <div key={i} className="py-6 flex items-center justify-between group">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="w-12 h-12 rounded-[1.25rem] bg-sub flex items-center justify-center border border-theme group-hover:border-emerald-accent/30 transition-colors">
                          <Plus className="w-5 h-5 text-emerald-accent group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-main truncate group-hover:text-emerald-accent transition-colors">{item.name}</p>
                          <p className="text-[10px] font-mono-tech text-sub mt-0.5">{item.timestamp}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-700 group-hover:translate-x-1 group-hover:text-emerald-accent transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-display font-bold text-2xl flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-emerald-accent" />
              Kitchen Analytics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-item border border-emerald-accent/20 rounded-[2.5rem] p-8 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] font-bold text-emerald-accent uppercase tracking-[0.3em] mb-3 relative z-10">Consumed</p>
                <p className="text-6xl font-display font-bold text-emerald-accent relative z-10">{totalConsumed}</p>
              </div>
              <div className="bg-item border border-rose-500/20 rounded-[2.5rem] p-8 text-center shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.3em] mb-3 relative z-10">Wasted</p>
                <p className="text-6xl font-display font-bold text-rose-500 relative z-10">{totalWasted}</p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="bg-item border border-theme rounded-[2.75rem] p-10 shadow-xl">
                <h3 className="font-display font-bold text-xl mb-10 flex items-center gap-3">
                  <RotateCcw className="w-6 h-6 text-emerald-accent" />
                  Waste Distribution
                </h3>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
                  <div className="relative w-56 h-56 group">
                    <svg viewBox="0 0 160 160" className="w-full h-full">
                      <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" className="text-sub/20" strokeWidth="18" />
                      {totalWasted > 0 && ['Produce', 'Dairy', 'Bakery', 'Pantry'].map((cat, i) => {
                        const count = wastedItems.filter(w => w.category === cat).length;
                        if (count === 0) return null;
                        const ratio = count / totalWasted;
                        const circumference = 2 * Math.PI * 68;
                        const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16'];
                        return (
                          <circle
                            key={cat} cx="80" cy="80" r="68" fill="none" stroke={colors[i]} strokeWidth="18"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - ratio)}
                            className="animate-spin-reveal"
                            style={{ '--circ': circumference, '--draw': circumference * (1 - ratio) }}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="font-display font-bold text-5xl tracking-tighter leading-none mb-1">{totalWasted}</span>
                      <span className="text-[10px] font-black text-sub uppercase tracking-[0.2em] opacity-60">Items</span>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1 w-full">
                    {['Produce', 'Dairy', 'Bakery', 'Pantry'].map((cat, i) => {
                      const count = wastedItems.filter(w => w.category === cat).length;
                      const colors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500'];
                      return (
                        <div key={cat} className="space-y-2.5">
                          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase ml-1">
                            <div className="flex items-center gap-3 text-main">
                              <div className={`w-3 h-3 rounded-full ${colors[i]} shadow-lg`} />
                              {cat}
                            </div>
                            <span className="text-sub font-mono-tech">{count} items</span>
                          </div>
                          <div className="h-2 bg-sub rounded-full overflow-hidden border border-theme shadow-inner">
                            <div className={`h-full ${colors[i]} animate-climb-bar shadow-[0_0_10px_rgba(0,0,0,0.2)]`} style={{ width: `${totalWasted ? (count/totalWasted)*100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-item border border-theme rounded-[2.75rem] p-10 shadow-xl">
                <h3 className="font-display font-bold text-xl mb-8 flex items-center gap-3">
                  <Trash2 className="w-6 h-6 text-rose-500" />
                  Discards Audit Log
                </h3>
                {wastedItems.length === 0 ? (
                  <div className="py-10 text-center opacity-30">
                    <p className="text-sm font-medium uppercase tracking-[0.2em]">Zero Waste Records</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wastedItems.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-sub/30 rounded-[1.5rem] border border-theme group hover:border-rose-500/30 transition-all duration-300">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                            <Trash2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-base truncate group-hover:text-rose-500 transition-colors">{item.name}</p>
                            <p className="text-[10px] font-mono-tech text-sub mt-0.5 tracking-wider uppercase">{item.timestamp}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-xl bg-rose-500/5 tracking-widest uppercase">Discarded</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4">
        <div className="max-w-md mx-auto bg-item/80 backdrop-blur-2xl border border-theme rounded-[2.5rem] p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.4)] relative">
          {/* Active indicator track would go here, but keeping it flat and minimalist */}
          <div className="flex gap-2">
            {[
              { id: 'stock', label: 'Stock', icon: Package },
              { id: 'scan', label: 'Scan', icon: ScanLine },
              { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-2 rounded-[1.75rem] transition-all duration-500 group relative ${
                  activeTab === tab.id
                    ? 'bg-emerald-accent text-nothing-900 shadow-xl shadow-emerald-500/20 scale-[1.04]'
                    : 'text-sub hover:text-main hover:bg-sub/50'
                }`}
              >
                <tab.icon className={`w-5 h-5 transition-transform duration-500 group-hover:scale-110 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-2 opacity-70'}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === tab.id ? 'opacity-100 mt-0.5' : 'opacity-0 scale-75 h-0 overflow-hidden'}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}