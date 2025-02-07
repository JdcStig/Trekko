import { apiSlice } from './apiSlice';

export const teamsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch Teams
    getTeams: builder.query({
      query: () => ({
        url: "teams",
      }),
      providesTags: ['Team'],
      transformResponse: (responseData) => ({ teams: responseData }), // Keep this if needed
    }),

    // Delete a Team
    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `teams/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Team'], // Ensures UI updates correctly
    }),

    // Create a New Team
    createTeam: builder.mutation({
      query: (teamData) => ({
        url: 'teams',
        method: 'POST',
        body: teamData,
      }),
      invalidatesTags: ['Team'], // Triggers a refetch
    }),

    // Update a Team
    updateTeam: builder.mutation({
      query: ({ _id, ...teamData }) => ({
        url: `teams/${_id}`,
        method: 'PUT',
        body: teamData,
      }),
      invalidatesTags: ['Team'], // Ensures updated data is refetched
    }),
  }),
});

export const { 
  useGetTeamsQuery, 
  useDeleteTeamMutation, 
  useCreateTeamMutation, 
  useUpdateTeamMutation 
} = teamsApiSlice;
