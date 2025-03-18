// src/slices/sessionsApiSlice.js
import { apiSlice } from './apiSlice';

export const sessionsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/sessions
    getSessions: builder.query({
      query: () => '/sessions',
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
        url: `/sessions/${updatedSession._id}`,
        method: 'PUT',
        body: updatedSession,
      }),
      invalidatesTags: [{ type: 'Session', id: 'LIST' }, { type: 'SessionCSV', id: 'LIST' }],
    }),

    // DELETE /api/sessions/:id
    deleteSession: builder.mutation({
      query: (id) => ({
        url: `/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),

    // POST /api/sessions/upload
    uploadSessionCSV: builder.mutation({
      query: (formData) => ({
        url: '/sessions/uploadSession',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

     // POST /api/sessions/upload
     uploadPlayCSV: builder.mutation({
      query: (formData) => ({
        url: '/sessions/uploadPlay',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'PlayCSV', id: 'LIST' }],
    }),

    // GET /api/sessions/:id/csvs
    getSessionCSVs: builder.query({
      query: (sessionId) => `/sessions/${sessionId}/csvs`,
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
        url: `/sessions/${sessionId}/csvs/players`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    // DELETE /api/sessions/:id/csvs/all
    deleteAllPlayCSVs: builder.mutation({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/csvs/plays`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'PlayCSV', id: 'LIST' }],
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
  useDeleteAllSessionCSVsMutation,
  useDeleteSessionCSVMutation,
  useUploadPlayCSVMutation,
  useDeleteAllPlayCSVsMutation
} = sessionsApiSlice;
