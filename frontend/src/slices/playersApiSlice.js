import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';
import { sessionsApiSlice } from './sessionsApiSlice'; 

export const playersApiSlice = createApi({
  reducerPath: 'playersApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Player'],
  endpoints: (builder) => ({
    //fetch all players
    getPlayers: builder.query({
      query: () => ({
          url: "players",
          credentials: "include", // Ensures authentication is included
      }),
      transformResponse: (responseData) => ({ players: responseData }),
  }),
  

    
  deletePlayer: builder.mutation({
    query: (id) => ({
      url: `players/${id}`,
      method: 'DELETE',
      credentials: 'include',
    }),
    async onQueryStarted(id, { dispatch, queryFulfilled }) {
      try {
        // Waits for the delete request to complete
        await queryFulfilled;

        // Refetch the players list
        dispatch(playersApiSlice.util.invalidateTags([{ type: 'Player', id: 'LIST' }]));

        // Additionally, refetch sessions and sessionPlayerData
        dispatch(sessionsApiSlice.util.invalidateTags(['Session']));

      } catch (err) {
        console.error('Failed to delete player:', err);
      }
    },
    invalidatesTags: [{ type: 'Player', id: 'LIST' }],
  }),
  


    createPlayer: builder.mutation({
      query: (playerData) => ({
        url: 'players',
        method: 'POST',
        body: { ...playerData }, // Ensure userId is sent
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Player', id: 'LIST' }],
    }),

    

updatePlayer: builder.mutation({
  query: (player) => ({
      url: `/players/${player.id}`,
      method: 'PUT',
      body: { name: player.name, position: player.position, teamName: player.teamName },
      credentials: 'include',
  }),
  invalidatesTags: ['Player'], 
}),

}),
})




export const { 
  useGetPlayersQuery, 
  useDeletePlayerMutation, 
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
} = playersApiSlice;
