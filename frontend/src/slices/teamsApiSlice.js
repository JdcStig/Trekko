import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BASE_URL } from '../constants';

export const teamsApiSlice = createApi({
  reducerPath: 'teamsApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['Team'],
  endpoints: (builder) => ({
    getTeams: builder.query({
      query: () => 'teams',
      transformResponse: (responseData) => ({ teams: responseData }),
      providesTags: (result = { teams: [] }) =>
        result.teams.length
          ? [
              ...result.teams.map(({ _id }) => ({ type: 'Team', id: _id })),
              { type: 'Team', id: 'LIST' },
            ]
          : [{ type: 'Team', id: 'LIST' }],
    }),

    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `teams/${id}`,
        method: 'DELETE',
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }], // Refresh team list after deletion
    }),

    createTeam: builder.mutation({
      query: (teamData) => ({
        url: 'teams',
        method: 'POST',
        body: teamData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }], // Refresh team list after creation
    }),

    updateTeam: builder.mutation({
      query: ({ id, ...teamData }) => ({
        url: `teams/${id}`,
        method: 'PUT',
        body: teamData,
        credentials: 'include',
      }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }], // Refresh team list after update
    }),
  }),
});

export const { 
  useGetTeamsQuery, 
  useDeleteTeamMutation, 
  useCreateTeamMutation, 
  useUpdateTeamMutation 
} = teamsApiSlice;
