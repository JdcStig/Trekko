import { USERS_URL } from '../constants';
import { apiSlice } from './apiSlice';

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/auth`, // Resolves to BASE_URL + 'users/auth'
        method: 'POST',
        body: data,
      }),
    }),
    googleLogin: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}/google-auth`,
        method: 'POST',
        body: data,
      }),
    }),
    register: builder.mutation({
      query: (data) => ({
        url: `${USERS_URL}`, // Resolves to BASE_URL + 'users'
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: `${USERS_URL}/logout`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGoogleLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = usersApiSlice;
