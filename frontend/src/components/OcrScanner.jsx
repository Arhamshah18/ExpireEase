import React, { useRef, useState } from 'react';
import ManualEntryForm from './ManualEntryForm';

const CONFIDENCE_THRESHOLD = 0.6;

// OCR output only ever pre-fills ManualEntryForm — it never writes to
// Firestore directly, and any field the engine wasn't confident about
// is left blank rather than guessed.
export default function OcrScanner({ onSubmitItem }) {
  const fileInputRef = useRef(null);
  const [prefill, setPrefill] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setScanning(true);
    try {
      const fields = await extractFields(file);
      setPrefill(fields);
    } catch (err) {
      console.error('OCR error:', err);
      setError('Could not read that image. Try again or enter manually.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <h3>Scan Item Label</h3>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
      />
      {scanning && <p>Reading label…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {prefill && (
        <>
          <p style={{ fontSize: '13px', color: '#666' }}>
            Review before saving — anything left blank couldn't be read reliably.
          </p>
          <ManualEntryForm prefill={prefill} onSubmitItem={onSubmitItem} />
        </>
      )}
    </div>
  );
}

// Wraps whichever OCR engine is wired in (ML Kit on device, Tesseract as
// fallback). Swap runOcr's implementation without touching the confidence
// gate below.
async function extractFields(imageFile) {
  const result = await runOcr(imageFile);
  const fields = { name: '', mfgDate: '', expDate: '', quantity: '' };

  for (const block of result.textBlocks) {
    if (block.confidence < CONFIDENCE_THRESHOLD) continue; // leave blank
    assignToField(fields, block);
  }

  return fields;
}

// Placeholder — replace with the actual ML Kit / Tesseract call.
async function runOcr(_imageFile) {
  return { textBlocks: [] };
}

// Simple label/pattern matching to route a recognized text block to a field.
function assignToField(fields, block) {
  const text = block.text.trim();
  const datePattern = /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/;

  if (/exp|best before|use by/i.test(block.label || '') && datePattern.test(text)) {
    fields.expDate = text;
  } else if (/mfg|manufactured|packed/i.test(block.label || '') && datePattern.test(text)) {
    fields.mfgDate = text;
  } else if (!fields.name && /^[A-Za-z]/.test(text)) {
    fields.name = text;
  }
}
