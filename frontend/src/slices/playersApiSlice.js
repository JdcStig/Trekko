import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';
import { sessionsApiSlice } from './sessionsApiSlice';

export const playersApiSlice = createApi({
  reducerPath: 'playersApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Player'],
  endpoints: (builder) => ({
    // ============ GET /api/players ============
    getPlayers: builder.query({
      query: () => ({
        url: 'players',
        credentials: 'include',
      }),
      transformResponse: (responseData) => ({ players: responseData }),
      providesTags: (result) =>
        result?.players
          ? [
              ...result.players.map((player) => ({
                type: 'Player',
                id: player._id,
              })),
              { type: 'Player', id: 'LIST' },
            ]
          : [{ type: 'Player', id: 'LIST' }],

      // ✅ Auto-refetch when component mounts or arg changes
      refetchOnMountOrArgChange: true,
      // ✅ Disable long-term caching
      keepUnusedDataFor: 0,
    }),

    // ============ DELETE /api/players/:id ============
    deletePlayer: builder.mutation({
      query: (id) => ({
        url: `players/${id}`,
        method: 'DELETE',
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(sessionsApiSlice.util.invalidateTags(['Session']));
        } catch (err) {
          console.error('Failed to delete player:', err);
        }
      },
    }),

    // ============ POST /api/players ============
    createPlayer: builder.mutation({
      query: (playerData) => ({
        url: 'players',
        method: 'POST',
        body: playerData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
    }),

    // ============ PUT /api/players/:id ============
    updatePlayer: builder.mutation({
      query: (player) => ({
        url: `players/${player.id}`,
        method: 'PUT',
        body: {
          name: player.name,
          position: player.position,
          teamName: player.teamName,
        },
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
