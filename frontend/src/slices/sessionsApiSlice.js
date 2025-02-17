import { apiSlice } from './apiSlice';

export const sessionsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSessions: builder.query({
      query: () => '/Sessions',
      providesTags: ['Session'],
    }),

    createSession: builder.mutation({
      query: (newSession) => ({
        url: '/Sessions',
        method: 'POST',
        body: newSession,
      }),
      invalidatesTags: ['Session'],
    }),

    updateSession: builder.mutation({
      query: (updatedSession) => ({
        url: `/Sessions/${updatedSession._id}`,
        method: 'PUT',
        body: updatedSession,
      }),
      invalidatesTags: ['Session'],
    }),

    deleteSession: builder.mutation({
      query: (id) => ({
        url: `/Sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),

    // UPDATED: Invalidate the 'SessionCSV' tag for CSV changes
    uploadSessionCSV: builder.mutation({
      query: (formData) => ({
        url: '/Sessions/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    getSessionCSVs: builder.query({
      query: (sessionId) => `/Sessions/${sessionId}/csvs`,
      providesTags: (result, error, arg) =>
        result && result.sessionDataArray
          ? [
              ...result.sessionDataArray.map(({ _id }) => ({ type: 'SessionCSV', id: _id })),
              { type: 'SessionCSV', id: 'LIST' },
            ]
          : [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    deleteAllSessionCSVs: builder.mutation({
      query: (sessionId) => ({
        url: `/Sessions/${sessionId}/csvs/all`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    deleteSessionCSV: builder.mutation({
      query: ({ sessionId, fileId }) => ({
        url: `/Sessions/${sessionId}/csvs/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'SessionCSV', id: arg.fileId }],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useUploadSessionCSVMutation,
  useGetSessionCSVsQuery,
  useDeleteSessionCSVMutation,
  useDeleteAllSessionCSVsMutation,
} = sessionsApiSlice;
