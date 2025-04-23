export const generateCode = (prefix = 'TEST') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
