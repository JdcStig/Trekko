import { apiSlice } from './apiSlice';

export const forceVelocityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getForceVelocityData: builder.query({
      // We'll pass { startDate, endDate, playerIds, grouped }
      query: ({ startDate, endDate, playerIds, grouped }) => {
        // Build the querystring
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate)   params.set('endDate', endDate);
        if (grouped)   params.set('grouped', grouped);
        // If playerIds is an array, add them
        if (Array.isArray(playerIds)) {
          playerIds.forEach(pid => params.append('playerIds', pid));
        }
        const qs = params.toString();

        return {
          url: `/forcevelocity?${qs}`,
          method: 'GET',
        };
      },
    }),
  }),
});

export const { useGetForceVelocityDataQuery } = forceVelocityApiSlice;
