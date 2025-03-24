// file: src/slices/forceVelocityApiSlice.js

import { apiSlice } from './apiSlice';

export const forceVelocityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Query to get force velocity data
    getForceVelocityData: builder.query({
      // Expects an object: { startDate, endDate, playerIds, grouped }
      query: ({ startDate, endDate, playerIds, grouped }) => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate)   params.set('endDate', endDate);
        if (grouped)   params.set('grouped', grouped);
        if (Array.isArray(playerIds)) {
          playerIds.forEach((pid) => params.append('playerIds', pid));
        }
        const qs = params.toString();
        return {
          url: `/forcevelocity?${qs}`,
          method: 'GET',
        };
      },
    }),

    // Mutation to run the force velocity analysis (i.e. call the Python script)
    runForceVelocityAnalysis: builder.mutation({
      query: (analysisValue) => ({
        url: '/forcevelocity/runAnalysis',
        method: 'POST',
        body: { analysisValue },
      }),
    }),
  }),
});

export const {
  useGetForceVelocityDataQuery,
  useRunForceVelocityAnalysisMutation,
} = forceVelocityApiSlice;
