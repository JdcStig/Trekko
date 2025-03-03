import { apiSlice } from './apiSlice'; // Ensure this is correctly imported

const PLAYBYPLAY_URL = '/api/playbyplayanalysis'; // Adjust based on your backend route

export const playByPlayApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Upload CSV for Play-by-Play Analysis
    uploadPlayByPlayCSV: builder.mutation({
      query: (formData) => ({
        url: `${PLAYBYPLAY_URL}/upload`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['PlayByPlay'], // Ensures UI updates after upload
    }),

    // Fetch Play-by-Play Data by Session ID
    getPlayByPlayData: builder.query({
      query: (sessionId) => `${PLAYBYPLAY_URL}/session/${sessionId}`,
      providesTags: ['PlayByPlay'], // Ensures cached data is tagged
    }),
  }),
});

export const { useUploadPlayByPlayCSVMutation, useGetPlayByPlayDataQuery } = playByPlayApiSlice;
