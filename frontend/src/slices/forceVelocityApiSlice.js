// file: src/slices/forceVelocityApiSlice.js
import { apiSlice } from './apiSlice';

export const forceVelocityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Query: get force-velocity data from /api/forcevelocity
    getForceVelocityData: builder.query({
      // Expects { startDate, endDate, playerIds, grouping }
      query: ({ startDate, endDate, playerIds, grouping }) => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate)   params.set('endDate', endDate);
        if (grouping)  params.set('grouping', grouping);

        if (Array.isArray(playerIds)) {
          playerIds.forEach((pid) => params.append('playerIds', pid));
        }

        return {
          url: `/forcevelocity?${params.toString()}`,
          method: 'GET',
        };
      },
    }),

    // Mutation: run local Python script => store ForceVelocityAnalysis doc
    runForceVelocityAnalysis: builder.mutation({
      // Expects { startDate, endDate, grouping, playerIds }
      query: (body) => ({
        url: '/forcevelocity/runAnalysis',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetForceVelocityDataQuery,
  useRunForceVelocityAnalysisMutation,
} = forceVelocityApiSlice;
