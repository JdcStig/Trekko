import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';

export const teamsApiSlice = createApi({
  reducerPath: 'teamsApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Team'],
  endpoints: (builder) => ({
    getTeams: builder.query({
      query: () => ({
          url: "teams",
          credentials: "include",
      }),
      transformResponse: (responseData) => ({ teams: responseData }),
  }),
  

    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `teams/${id}`,
        method: 'DELETE',
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),

    createTeam: builder.mutation({
      query: (teamData) => ({
        url: 'teams',
        method: 'POST',
        body: teamData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),

    updateTeam: builder.mutation({
      query: ({ _id, ...teamData }) => ({
        url: `teams/${_id}`, // Ensure _id is used here
        method: 'PUT',
        body: teamData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),
  }),
});

export const { 
  useGetTeamsQuery, 
  useDeleteTeamMutation, 
  useCreateTeamMutation, 
  useUpdateTeamMutation 
} = teamsApiSlice;
