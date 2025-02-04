import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';

export const playersApiSlice = createApi({
  reducerPath: 'playersApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Player'],
  endpoints: (builder) => ({
    getPlayers: builder.query({
      query: () => 'players', // This concatenates to BASE_URL + 'players'
      transformResponse: (responseData) => ({ players: responseData }),
      providesTags: (result = { players: [] }, error, arg) =>
        result.players.length
          ? [
              ...result.players.map(({ _id }) => ({ type: 'Player', id: _id })),
              { type: 'Player', id: 'LIST' },
            ]
          : [{ type: 'Player', id: 'LIST' }],
    }),
    deletePlayer: builder.mutation({
      query: (id) => ({
        url: `players/${id}`,
        method: 'DELETE',
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
    }),
    createPlayer: builder.mutation({
      query: (playerData) => ({
        url: 'players',
        method: 'POST',
        body: playerData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
    }),
    updatePlayer: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `players/${id}`,
        method: 'PUT', 
        body: patch,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
    }),
  }),
});

export const { 
  useGetPlayersQuery, 
  useDeletePlayerMutation, 
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
} = playersApiSlice;
