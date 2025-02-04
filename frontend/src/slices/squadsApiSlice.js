import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants'; 

export const squadsApiSlice = createApi({
  reducerPath: 'squadsApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Squad'],
  endpoints: (builder) => ({
    getSquads: builder.query({
      query: () => 'squads',
      transformResponse: (responseData) => ({ squads: responseData }),
      providesTags: (result = { squads: [] }) =>
        result.squads.length
          ? [
              ...result.squads.map(({ _id }) => ({ type: 'Squad', id: _id })),
              { type: 'Squad', id: 'LIST' },
            ]
          : [{ type: 'Squad', id: 'LIST' }],
    }),
    deleteSquad: builder.mutation({
      query: (id) => ({
        url: `squads/${id}`,
        method: 'DELETE',
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Squad', id: 'LIST' }],
    }),
    createSquad: builder.mutation({
      query: (squadData) => ({
        url: 'squads',
        method: 'POST',
        body: squadData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Squad', id: 'LIST' }],
    }),
    updateSquad: builder.mutation({
      query: ({ id, ...squadData }) => ({
        url: `squads/${id}`,
        method: 'PUT',
        body: squadData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Squad', id: 'LIST' }],
    }),
  }),
});

export const { useGetSquadsQuery, useDeleteSquadMutation, useCreateSquadMutation, useUpdateSquadMutation, } = squadsApiSlice;
