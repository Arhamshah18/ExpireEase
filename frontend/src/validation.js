export function validateItemInput({ name, mfgDate, expDate, quantity }) {
  const errors = {};

  if (!name || name.trim() === '') {
    errors.name = 'Item name is required.';
  }

  if (!expDate) {
    errors.expDate = 'Expiry date is required.';
  }

  if (mfgDate && expDate) {
    const mfg = new Date(mfgDate).getTime();
    const exp = new Date(expDate).getTime();

    if (mfg >= exp) {
      errors.mfgDate = 'Manufacturing date must be before Expiry date.';
    }
  }

  if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
    errors.quantity = 'Quantity must be greater than 0.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
