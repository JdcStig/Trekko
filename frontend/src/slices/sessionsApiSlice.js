// import { apiSlice } from './apiSlice';

// export const sessionsApiSlice = apiSlice.injectEndpoints({
//   endpoints: (builder) => ({
//     getSessions: builder.query({
//       query: () => '/sessionCollections',
//       providesTags: ['SessionCollection'],
//     }),


//     // CREATE a new session collection
//     createSession: builder.mutation({
//       query: (newSession) => ({
//         url: '/sessionCollections',
//         method: 'POST',
//         body: newSession,
//       }),
//       invalidatesTags: ['SessionCollection'],
//     }),

//     // UPDATE an existing session collection
//     updateSession: builder.mutation({
//       query: (updatedSession) => ({
//         url: `/sessionCollections/${updatedSession._id}`,
//         method: 'PUT',
//         body: updatedSession,
//       }),
//       invalidatesTags: ['SessionCollection'],
//     }),

//     // DELETE a session collection
//     deleteSession: builder.mutation({
//       query: (id) => ({
//         url: `/sessionCollections/${id}`,
//         method: 'DELETE',
//       }),
//       invalidatesTags: ['SessionCollection'],
//     }),
//     // UPLOAD CSV file for a session collection
//     uploadSessionCSV: builder.mutation({
//       query: (formData) => ({
//         url: '/sessionCollections/upload',
//         method: 'POST',
//         body: formData,
//       }),
//       invalidatesTags: [{ type: 'SessionCollection', id: 'LIST' }],
//     }),

//     // FETCH existing CSVs for a session
//     getSessionCSVs: builder.query({
//       query: (sessionId) => `/sessionCollections/${sessionId}/csvs`,
//       providesTags: (result, error, arg) =>
//         result && result.sessionDataArray
//           ? [
//               ...result.sessionDataArray.map(({ _id }) => ({ type: 'SessionCSV', id: _id })),
//               { type: 'SessionCSV', id: 'LIST' },
//             ]
//           : [{ type: 'SessionCSV', id: 'LIST' }],
//     }),

//     deleteAllSessionCSVs: builder.mutation({
//       query: (sessionId) => ({
//         url: `/sessionCollections/${sessionId}/csvs/all`,
//         method: 'DELETE',
//       }),
//       invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
//     }),
    
    

//     // DELETE a CSV file from a session
//     deleteSessionCSV: builder.mutation({
//       query: ({ sessionId, fileId }) => ({
//         url: `/sessionCollections/${sessionId}/csvs/${fileId}`,
//         method: 'DELETE',
//       }),
//       invalidatesTags: (result, error, arg) => [{ type: 'SessionCSV', id: arg.fileId }],
//     }),
//   }),
// });

// export const {
//   useGetSessionsQuery,
//   useCreateSessionMutation,
//   useUpdateSessionMutation,
//   useDeleteSessionMutation,
//   useUploadSessionCSVMutation,
//   useGetSessionCSVsQuery,
//   useDeleteSessionCSVMutation,
//   useDeleteAllSessionCSVsMutation,
// } = sessionsApiSlice;
// src/slices/sessionsApiSlice.js
import { apiSlice } from './apiSlice';

export const sessionsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSessions: builder.query({
      query: () => '/sessionCollections',
      providesTags: ['SessionCollection'],
    }),

    createSession: builder.mutation({
      query: (newSession) => ({
        url: '/sessionCollections',
        method: 'POST',
        body: newSession,
      }),
      invalidatesTags: ['SessionCollection'],
    }),

    updateSession: builder.mutation({
      query: (updatedSession) => ({
        url: `/sessionCollections/${updatedSession._id}`,
        method: 'PUT',
        body: updatedSession,
      }),
      invalidatesTags: ['SessionCollection'],
    }),

    deleteSession: builder.mutation({
      query: (id) => ({
        url: `/sessionCollections/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SessionCollection'],
    }),

    // UPDATED: Invalidate the 'SessionCSV' tag for CSV changes
    uploadSessionCSV: builder.mutation({
      query: (formData) => ({
        url: '/sessionCollections/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    getSessionCSVs: builder.query({
      query: (sessionId) => `/sessionCollections/${sessionId}/csvs`,
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
        url: `/sessionCollections/${sessionId}/csvs/all`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'SessionCSV', id: 'LIST' }],
    }),

    deleteSessionCSV: builder.mutation({
      query: ({ sessionId, fileId }) => ({
        url: `/sessionCollections/${sessionId}/csvs/${fileId}`,
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
