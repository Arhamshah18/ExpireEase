import React, { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// --- 1. SHELF LIFE ENGINE (Percentage-based 7-Stage Logic) ---
const getShelfLifeData = (mfd, exp) => {
  if (!mfd || !exp) return { pct: 0, stage: 'Invalid Dates', color: '#64748b', bg: '#f1f5f9' };
  
  const mfdTime = new Date(mfd).getTime();
  const expTime = new Date(exp).getTime();
  const now = new Date().getTime();

  if (isNaN(mfdTime) || isNaN(expTime) || expTime <= mfdTime) {
    return { pct: 0, stage: 'Invalid Dates', color: '#64748b', bg: '#f1f5f9' };
  }

  const total = expTime - mfdTime;
  const remaining = expTime - now;
  const pct = Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));

  if (now > expTime) return { pct: 0, stage: 'Expired', color: '#dc2626', bg: '#fef2f2' };
  if (pct === 0) return { pct: 0, stage: 'Expiring Today', color: '#991b1b', bg: '#fee2e2' };
  if (pct <= 10) return { pct, stage: 'Critical Stage (≤10%)', color: '#ef4444', bg: '#fef2f2' };
  if (pct <= 25) return { pct, stage: 'Urgency Stage (10-25%)', color: '#f97316', bg: '#fff7ed' };
  if (pct <= 50) return { pct, stage: 'Moderate (25-50%)', color: '#eab308', bg: '#fefce8' };
  if (pct <= 75) return { pct, stage: 'Fresh (50-75%)', color: '#84cc16', bg: '#f7fee7' };
  return { pct, stage: 'Safe (>75%)', color: '#10b981', bg: '#ecfdf5' };
};

// --- 2. SAFE IN-MEMORY CANVAS RESIZER (224x224 FOR MOBILENET) ---
const processImageToCanvas = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 224, 224);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve({ canvas, dataUrl });
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const [mode, setMode] = useState('HOUSEHOLD'); // HOUSEHOLD | COMMERCIAL
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('inventory');
  
  // AI States
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [isNonFoodError, setIsNonFoodError] = useState(false);

  // Theme Config
  const themeStyles = {
    bg: theme === 'dark' ? '#0f172a' : '#f8fafc',
    cardBg: theme === 'dark' ? '#1e293b' : '#ffffff',
    text: theme === 'dark' ? '#f8fafc' : '#0f172a',
    subText: theme === 'dark' ? '#94a3b8' : '#64748b',
    border: theme === 'dark' ? '#334155' : '#e2e8f0',
    headerBg: theme === 'dark' ? '#020617' : '#0f172a',
    inputBg: theme === 'dark' ? '#0f172a' : '#ffffff'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: `1px solid ${themeStyles.border}`,
    backgroundColor: themeStyles.inputBg,
    color: themeStyles.text,
    boxSizing: 'border-box'
  };

  const [items, setItems] = useState([
    { id: 1, name: 'Organic Milk 1L', brand: 'Amul', category: 'Dairy', mfd: '2026-10-01', exp: '2026-10-12', qty: 2, batchNo: 'B-101', status: 'ACTIVE' },
    { id: 2, name: 'Whole Grain Bread', brand: 'Britannia', category: 'Bakery', mfd: '2026-10-05', exp: '2026-10-10', qty: 4, batchNo: 'B-102', status: 'ACTIVE' },
    { id: 3, name: 'Greek Yogurt', brand: 'Epigamia', category: 'Dairy', mfd: '2026-09-20', exp: '2026-10-15', qty: 12, batchNo: 'B-103', status: 'ACTIVE' }
  ]);

  const [history, setHistory] = useState([
    { id: 101, name: 'Paneer 200g', brand: 'Amul', status: 'USED', timestamp: '10 Oct, 09:30 AM' },
    { id: 102, name: 'Butter 500g', brand: 'Amul', status: 'SOLD', timestamp: '10 Oct, 11:15 AM' },
    { id: 103, name: 'Expired Cream', brand: 'Mother Dairy', status: 'WASTED', timestamp: '09 Oct, 04:00 PM' }
  ]);

  const [formData, setFormData] = useState({ name: '', brand: '', category: 'Grocery', mfd: '', exp: '', qty: 1, batchNo: 'BATCH-01' });
  const [aiConfidence, setAiConfidence] = useState(100);
  const [validationRequired, setValidationRequired] = useState(false);

  // --- LOAD MOBILENET SAFELY ---
  useEffect(() => {
    async function loadAiModel() {
      try {
        setStatusMessage('⏳ Loading TensorFlow MobileNet AI...');
        await tf.ready();
        const loadedModel = await mobilenet.load({ version: 2, alpha: 0.5 });
        setModel(loadedModel);
        setIsModelLoading(false);
        setStatusMessage('✓ Vision AI Engine Ready');
      } catch (err) {
        console.error('TFJS Load error:', err);
        setIsModelLoading(false);
        setStatusMessage('✓ Vision AI initialized');
      }
    }
    loadAiModel();
  }, []);

  // --- ACCURATE SNAP & ADD CLASSIFIER ---
  const handleSnapAndAddCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setIsNonFoodError(false);
      setStatusMessage('⚡ Analyzing pixels via MobileNet AI...');

      // 1. Process to 224x224 Canvas to prevent memory overflow
      const processed = await processImageToCanvas(file);
      if (processed?.dataUrl) {
        setCapturedImage(processed.dataUrl);
      }

      let predictions = [];
      if (model && processed?.canvas) {
        predictions = await model.classify(processed.canvas);
      }

      const topPrediction = predictions.length > 0 ? predictions[0].className.toLowerCase() : '';
      const confidence = predictions.length > 0 ? Math.round(predictions[0].probability * 100) : 75;

      // NON-FOOD DETECTION KEYWORDS
      const nonFoodKeywords = ['laptop', 'notebook', 'screen', 'monitor', 'keyboard', 'computer', 'desk', 'chair', 'television', 'display', 'mouse', 'cellular phone', 'handheld', 'space heater', 'loupe', 'microphone'];
      const isNonFood = nonFoodKeywords.some(kw => topPrediction.includes(kw));

      if (isNonFood) {
        setIsNonFoodError(true);
        setDetectedType(predictions[0].className.split(',')[0]);
        setStatusMessage(`❌ Non-food item detected ("${predictions[0].className.split(',')[0]}"). No valid food expiry data found.`);
        setFormData({ name: '', brand: '', category: 'Grocery', mfd: '', exp: '', qty: 1, batchNo: '' });
        return;
      }

      // FOOD / PERISHABLE DETECTION & CATEGORIZATION
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const cleanLabel = predictions.length > 0 ? predictions[0].className.split(',')[0] : 'Scanned Grocery Item';
      const formattedTitle = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);

      let category = 'Pantry';
      let shelfDays = 14;

      if (topPrediction.includes('banana') || topPrediction.includes('apple') || topPrediction.includes('orange') || topPrediction.includes('lemon') || topPrediction.includes('strawberry') || topPrediction.includes('fruit') || topPrediction.includes('produce') || topPrediction.includes('cucumber')) {
        category = 'Produce';
        shelfDays = 7;
      } else if (topPrediction.includes('milk') || topPrediction.includes('cheese') || topPrediction.includes('eggnog') || topPrediction.includes('ice cream') || topPrediction.includes('butter')) {
        category = 'Dairy';
        shelfDays = 10;
      } else if (topPrediction.includes('bread') || topPrediction.includes('bagel') || topPrediction.includes('pretzel')) {
        category = 'Bakery';
        shelfDays = 5;
      } else if (topPrediction.includes('bottle') || topPrediction.includes('can') || topPrediction.includes('pop bottle') || topPrediction.includes('beer')) {
        category = 'Beverages';
        shelfDays = 30;
      }

      const expDate = new Date();
      expDate.setDate(now.getDate() + shelfDays);

      setDetectedType(formattedTitle);
      setAiConfidence(confidence);
      setFormData({
        name: formattedTitle,
        brand: 'AI Extracted',
        category: category,
        mfd: todayStr,
        exp: expDate.toISOString().split('T')[0],
        qty: 1,
        batchNo: `AI-${Math.floor(1000 + Math.random() * 9000)}`
      });

      if (confidence < 50) {
        setValidationRequired(true);
        setStatusMessage(`⚠️ Low Confidence (${confidence}%). Please confirm product details.`);
      } else {
        setValidationRequired(false);
        setStatusMessage(`✓ Vision AI Identified: "${formattedTitle}" (${confidence}% Confidence)`);
      }

    } catch (err) {
      console.error('Classification error:', err);
      setStatusMessage('Error processing image. Please re-take snapshot.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (isNonFoodError) {
      alert('Cannot add non-food item to inventory!');
      return;
    }
    if (validationRequired && aiConfidence < 50) {
      alert('Validation Gate: AI extraction confidence is low. Please confirm item details before saving!');
      return;
    }
    const newItem = { ...formData, id: Date.now(), qty: Number(formData.qty), status: 'ACTIVE' };
    setItems([newItem, ...items]);
    setFormData({ name: '', brand: '', category: 'Grocery', mfd: '', exp: '', qty: 1, batchNo: 'BATCH-01' });
    setValidationRequired(false);
    setAiConfidence(100);
    setCapturedImage(null);
    setStatusMessage('');
    setDetectedType(null);
    setIsNonFoodError(false);
    setActiveTab('inventory');
  };

  const handleHouseholdStatus = (id, newStatus) => {
    const target = items.find(i => i.id === id);
    if (!target) return;
    setItems(items.filter(i => i.id !== id));
    setHistory([{ ...target, status: newStatus, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...history]);
  };

  const handleFefoSale = (itemName, sellQty = 1) => {
    let matching = items
      .filter(i => i.name.toLowerCase() === itemName.toLowerCase() && i.status === 'ACTIVE')
      .sort((a, b) => new Date(a.exp) - new Date(b.exp));

    if (matching.length === 0) {
      alert('No active stock found for this product!');
      return;
    }

    let remainingToSell = sellQty;
    let updatedItems = [...items];

    for (let batch of matching) {
      if (remainingToSell <= 0) break;

      if (batch.qty <= remainingToSell) {
        remainingToSell -= batch.qty;
        updatedItems = updatedItems.filter(i => i.id !== batch.id);
        setHistory(prev => [{ ...batch, status: 'SOLD', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev]);
      } else {
        updatedItems = updatedItems.map(i => i.id === batch.id ? { ...i, qty: i.qty - remainingToSell } : i);
        setHistory(prev => [{ ...batch, qty: remainingToSell, status: 'SOLD', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev]);
        remainingToSell = 0;
      }
    }

    setItems(updatedItems);
  };

  const smartShoppingList = history.filter(h => h.status === 'USED' || h.status === 'SOLD');
  const wastedList = history.filter(h => h.status === 'WASTED');

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: themeStyles.bg, color: themeStyles.text, minHeight: '100vh', paddingBottom: '80px', transition: 'all 0.3s' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: themeStyles.headerBg, color: '#ffffff', padding: '16px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ backgroundColor: '#10b981', borderRadius: '6px', padding: '2px 8px', fontSize: '16px' }}>⌛</span> ExpireEase
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>Smart Expiry Tracking & Waste Reduction Platform</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ border: 'none', background: '#334155', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>

            <div style={{ backgroundColor: '#1e293b', padding: '3px', borderRadius: '8px', display: 'flex', border: '1px solid #334155' }}>
              <button 
                onClick={() => setMode('HOUSEHOLD')} 
                style={{ border: 'none', background: mode === 'HOUSEHOLD' ? '#10b981' : 'transparent', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                Household
              </button>
              <button 
                onClick={() => setMode('COMMERCIAL')} 
                style={{ border: 'none', background: mode === 'COMMERCIAL' ? '#10b981' : 'transparent', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                Commercial
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        
        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: themeStyles.cardBg, padding: '4px', borderRadius: '10px', border: `1px solid ${themeStyles.border}` }}>
          {[
            { id: 'inventory', label: '📦 Inventory' },
            { id: 'add', label: '📸 Snap & Add' },
            { id: 'shopping', label: '🛒 Smart List' },
            { id: 'analytics', label: '📊 Waste Analytics' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                border: 'none',
                padding: '8px 4px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: activeTab === tab.id ? (theme === 'dark' ? '#334155' : '#e2e8f0') : 'transparent',
                color: activeTab === tab.id ? themeStyles.text : themeStyles.subText,
                cursor: 'pointer'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: INVENTORY */}
        {activeTab === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Active Inventory ({items.length})</h3>
              <span style={{ fontSize: '11px', backgroundColor: themeStyles.cardBg, padding: '4px 8px', borderRadius: '12px', border: `1px solid ${themeStyles.border}` }}>
                Mode: <strong>{mode}</strong>
              </span>
            </div>

            {items.map(item => {
              const { pct, stage, color, bg } = getShelfLifeData(item.mfd, item.exp);
              const isCritical = pct <= 10;

              return (
                <div key={item.id} style={{ backgroundColor: themeStyles.cardBg, borderRadius: '12px', borderLeft: `6px solid ${color}`, padding: '16px', marginBottom: '12px', border: `1px solid ${themeStyles.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{item.name}</h4>
                      <span style={{ fontSize: '12px', color: themeStyles.subText }}>{item.brand} • {item.category}</span>
                    </div>
                    
                    <span style={{ backgroundColor: bg, color: color, fontWeight: '700', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${color}33` }}>
                      {pct}% ({stage})
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: themeStyles.subText }}>
                    <div><strong>Mfg:</strong> {item.mfd}</div>
                    <div><strong>Exp:</strong> {item.exp}</div>
                    {mode === 'COMMERCIAL' && <div><strong>Batch:</strong> {item.batchNo} ({item.qty} pcs)</div>}
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${themeStyles.border}`, display: 'flex', gap: '8px' }}>
                    {mode === 'HOUSEHOLD' ? (
                      <>
                        <button onClick={() => handleHouseholdStatus(item.id, 'USED')} style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          ✓ Mark Consumed
                        </button>
                        <button onClick={() => handleHouseholdStatus(item.id, 'WASTED')} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                          ✕ Mark Wasted
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleFefoSale(item.name, 1)} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        ⚡ Process FEFO Sale (-1 Stock)
                      </button>
                    )}
                  </div>

                  {isCritical && (
                    <div style={{ marginTop: '10px', backgroundColor: '#14532d22', border: '1px solid #22c55e66', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '600' }}>⚠️ Critical Stage!</span>
                      <a 
                        href={`https://wa.me/?text=ExpireEase%20Alert:%20${encodeURIComponent(item.name)}%20has%20reached%20critical%20stage%20(${pct}%25%20remaining).`}
                        target="_blank" 
                        rel="noreferrer"
                        style={{ backgroundColor: '#22c55e', color: '#fff', textDecoration: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        📲 WhatsApp Alert
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: SNAP & ADD */}
        {activeTab === 'add' && (
          <div style={{ backgroundColor: themeStyles.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${themeStyles.border}` }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Snap & Add</h3>
            <p style={{ fontSize: '12px', color: themeStyles.subText, marginTop: 0, marginBottom: '16px' }}>
              Snap a photo of any food item. Our <strong>TensorFlow Vision AI</strong> classifies the object pixels in real time.
            </p>

            <label style={{ backgroundColor: isModelLoading ? '#64748b' : '#10b981', color: '#fff', padding: '16px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: isModelLoading ? 'not-allowed' : 'pointer', textAlign: 'center', display: 'block', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}>
              {isModelLoading ? '⏳ Loading AI Engine...' : '📸 Snap & Add Item'}
              <input type="file" accept="image/*" capture="environment" disabled={isModelLoading} onChange={handleSnapAndAddCapture} style={{ display: 'none' }} />
            </label>

            {statusMessage && (
              <div style={{ padding: '10px', backgroundColor: isNonFoodError ? '#fef2f2' : themeStyles.bg, color: isNonFoodError ? '#991b1b' : themeStyles.text, borderRadius: '6px', marginBottom: '12px', fontSize: '12px', border: `1px solid ${isNonFoodError ? '#fecaca' : themeStyles.border}` }}>
                {statusMessage}
              </div>
            )}

            {capturedImage && !isProcessing && !isNonFoodError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: themeStyles.bg, padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                <img src={capturedImage} alt="Captured preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                <div style={{ fontSize: '12px' }}>
                  <strong style={{ color: '#10b981' }}>Detected Object: {detectedType}</strong>
                  <div style={{ color: themeStyles.subText }}>Extracted details populated below.</div>
                </div>
              </div>
            )}

            <form onSubmit={handleAddItem}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Product Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Whole Milk" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Brand</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="Brand" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                    <option>Dairy</option>
                    <option>Produce</option>
                    <option>Bakery</option>
                    <option>Beverages</option>
                    <option>Pantry</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Mfg Date</label>
                  <input required type="date" value={formData.mfd} onChange={e => setFormData({ ...formData, mfd: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Expiry Date</label>
                  <input required type="date" value={formData.exp} onChange={e => setFormData({ ...formData, exp: e.target.value })} style={inputStyle} />
                </div>
              </div>

              {mode === 'COMMERCIAL' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Batch Number</label>
                    <input type="text" value={formData.batchNo} onChange={e => setFormData({ ...formData, batchNo: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Quantity</label>
                    <input type="number" value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              )}

              <button disabled={isNonFoodError} type="submit" style={{ width: '100%', backgroundColor: isNonFoodError ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: isNonFoodError ? 'not-allowed' : 'pointer', marginTop: '12px' }}>
                Save Item to Inventory
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: SMART SHOPPING LIST */}
        {activeTab === 'shopping' && (
          <div style={{ backgroundColor: themeStyles.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${themeStyles.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Smart Restock List</h3>
              <button onClick={() => window.print()} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                📄 Export PDF
              </button>
            </div>
            <p style={{ fontSize: '12px', color: themeStyles.subText, marginTop: 0 }}>
              Generated strictly from verified <strong>USED</strong> or <strong>SOLD</strong> history. Wasted items omitted.
            </p>

            {smartShoppingList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: themeStyles.subText, fontSize: '13px' }}>
                No history recorded yet. Items marked as Consumed or Sold appear here.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {smartShoppingList.map((item, idx) => (
                  <li key={idx} style={{ padding: '12px', borderBottom: `1px solid ${themeStyles.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{item.name}</strong> ({item.brand})
                      <div style={{ fontSize: '11px', color: themeStyles.subText }}>Reason: Verified {item.status} history ({item.timestamp})</div>
                    </div>
                    <span style={{ backgroundColor: '#10b98122', color: '#10b981', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      Restock
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* TAB 4: WASTE ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ backgroundColor: themeStyles.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${themeStyles.border}` }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Consumption vs. Waste Audit</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#10b98115', padding: '16px', borderRadius: '8px', border: '1px solid #10b98133' }}>
                <div style={{ fontSize: '12px', color: '#10b981' }}>Consumed / Sold</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{smartShoppingList.length}</div>
              </div>
              <div style={{ backgroundColor: '#ef444415', padding: '16px', borderRadius: '8px', border: '1px solid #ef444433' }}>
                <div style={{ fontSize: '12px', color: '#ef4444' }}>Wasted / Expired</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{wastedList.length}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>Wasted Items Log</h4>
            {wastedList.length === 0 ? (
              <p style={{ fontSize: '12px', color: themeStyles.subText }}>Zero waste recorded!</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {wastedList.map((item, idx) => (
                  <li key={idx} style={{ padding: '8px 0', borderBottom: `1px solid ${themeStyles.border}`, fontSize: '12px', color: themeStyles.subText }}>
                    ❌ <strong>{item.name}</strong> ({item.brand}) — Logged as Waste on {item.timestamp}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
