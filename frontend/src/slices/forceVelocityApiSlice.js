// file: src/slices/forceVelocityApiSlice.js
import { apiSlice } from './apiSlice';

export const forceVelocityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getForceVelocityData: builder.query({
      query: ({ startDate, endDate, playerIds, grouped }) => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (grouped) params.set('grouped', grouped);
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

    runForceVelocityAnalysis: builder.mutation({
      // Expect an object with analysisValue, startDate, endDate, grouping, playerIds
      query: (data) => ({
        url: '/forcevelocity/runAnalysis',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetForceVelocityDataQuery,
  useRunForceVelocityAnalysisMutation,
} = forceVelocityApiSlice;
