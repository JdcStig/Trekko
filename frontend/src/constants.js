export const BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api/'
    : '/api/');
export const USERS_URL = 'users';