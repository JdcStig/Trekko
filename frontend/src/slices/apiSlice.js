import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL, // Will be 'http://localhost:5000/api/' in development and '/api/' in production
  credentials: 'include', // Sends cookies with requests
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.userInfo?.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ['User', 'Team', 'Match'],
  endpoints: (builder) => ({}),
});
