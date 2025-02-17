import { apiSlice } from './apiSlice';

export const sessionsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/sessions
    getSessions: builder.query({
      query: () => '/sessions', // all lowercase
      providesTags: ['Session'],
    }),

    // POST /api/sessions
    createSession: builder.mutation({
      query: (newSession) => ({
        url: '/sessions',
        method: 'POST',
        body: newSession,
      }),
      invalidatesTags: ['Session'],
    }),

    // PUT /api/sessions/:id
    updateSession: builder.mutation({
      query: (updatedSession) => ({
        url: `/sessions/${updatedSession._id}`, // use backticks
        method: 'PUT',
        body: updatedSession,
      }),
      invalidatesTags: ['Session'],
    }),

    // DELETE /api/sessions/:id
    deleteSession: builder.mutation({
      query: (id) => ({
        url: `/sessions/${id}`, // use backticks
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),

    // POST /api/sessions/upload
    uploadSessionCSV: builder.mutation({
      query: (formData) => ({
        url: '/sessions/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    // GET /api/sessions/:id/csvs
    getSessionCSVs: builder.query({
      query: (sessionId) => `/sessions/${sessionId}/csvs`, // use backticks or quotes
      providesTags: (result, error, arg) =>
        result && result.sessionPlayerDataArray
          ? [
              ...result.sessionPlayerDataArray.map(({ _id }) => ({
                type: 'SessionCSV',
                id: _id,
              })),
              { type: 'SessionCSV', id: 'LIST' },
            ]
          : [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    // DELETE /api/sessions/:id/csvs/all
    deleteAllSessionCSVs: builder.mutation({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/csvs/all`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    // DELETE /api/sessions/:id/csvs/:fileId
    deleteSessionCSV: builder.mutation({
      query: ({ sessionId, fileId }) => ({
        url: `/sessions/${sessionId}/csvs/${fileId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'SessionCSV', id: arg.fileId },
      ],
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
