const namePattern = /^([\w])+\s+([\w\s])+$/i;
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const newPasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#~])[A-Za-z\d@$!%*?&#~]{6,72}$/;

export const PASSWORD_REQUIREMENT =
  'Use 6 to 72 characters with uppercase, lowercase, a number, and a special character.';

export const isValidName = (value) =>
  typeof value === 'string' && namePattern.test(value.trim());

export const isValidEmail = (value) =>
  typeof value === 'string' && emailPattern.test(value.trim());

export const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const isValidNewPassword = (value) =>
  typeof value === 'string' && newPasswordPattern.test(value);

export const getMemoryValidationError = (data = {}) => {
  if (typeof data.title !== 'string' || !data.title.trim()) {
    return 'Memory title is required';
  }
  if (typeof data.memory !== 'string' || data.memory.trim().length < 5) {
    return 'Memory content must contain at least 5 characters';
  }
  if (data.priority !== undefined && data.priority !== null) {
    const priority = Number(data.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      return 'Memory priority must be between 1 and 5';
    }
  }
  if (data.dueDate && Number.isNaN(new Date(data.dueDate).getTime())) {
    return 'Please provide a valid due date';
  }
  return null;
};
