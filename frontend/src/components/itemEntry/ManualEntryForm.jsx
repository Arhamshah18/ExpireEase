import React, { useState, useEffect } from 'react';
import { validateItemInput } from '../../utils/validation';

// `prefill` lets OCR/barcode scanners hand off partially-known data.
// Nothing is written to the database from here until the user submits —
// this form is the single confirm-before-save gate for every entry mode.
export default function ManualEntryForm({ onSubmitItem, prefill }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Dairy',
    mfgDate: '',
    expDate: '',
    quantity: 1,
    ...prefill
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (prefill) {
      setFormData((prev) => ({ ...prev, ...prefill }));
    }
  }, [prefill]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateItemInput(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onSubmitItem(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '350px' }}>
      <h3>Add New Item</h3>

      <input type="text" name="name" placeholder="Item Name (e.g. Milk)" value={formData.name} onChange={handleChange} />
      {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}

      <label>Mfg Date (Optional):</label>
      <input type="date" name="mfgDate" value={formData.mfgDate} onChange={handleChange} />
      {errors.mfgDate && <span style={{ color: 'red' }}>{errors.mfgDate}</span>}

      <label>Expiry Date:</label>
      <input type="date" name="expDate" value={formData.expDate} onChange={handleChange} />
      {errors.expDate && <span style={{ color: 'red' }}>{errors.expDate}</span>}

      <input type="number" name="quantity" min="1" value={formData.quantity} onChange={handleChange} />
      {errors.quantity && <span style={{ color: 'red' }}>{errors.quantity}</span>}

      <button type="submit">Save Item</button>
    </form>
  );
}
