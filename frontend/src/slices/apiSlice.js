import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';

// makes the base query for API requests
const baseQuery = fetchBaseQuery({ 
    baseUrl: BASE_URL ,
    credentials: 'include',

});

export const apiSlice = createApi({
    baseQuery,
    tagTypes: ['User'],
    endpoints: (builder) => ({}),// Placeholder for defining endpoints
});
