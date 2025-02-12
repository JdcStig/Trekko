import { apiSlice } from './apiSlice';

export const sessionsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    
    // GET all session collections
    getSessions: builder.query({
      query: () => '/sessionCollections', // Ensure this matches backend route
      providesTags: (result = [], error, arg) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: 'SessionCollection', id: _id })),
              { type: 'SessionCollection', id: 'LIST' },
            ]
          : [{ type: 'SessionCollection', id: 'LIST' }],
    }),

    // CREATE a new session collection
    createSession: builder.mutation({
      query: (newSession) => ({
        url: '/sessionCollections', // Ensure correct API endpoint
        method: 'POST',
        body: newSession,
      }),
      invalidatesTags: [{ type: 'SessionCollection', id: 'LIST' }],
    }),

    // UPDATE an existing session collection
    updateSession: builder.mutation({
      query: (updatedSession) => ({
        url: `/sessionCollections/${updatedSession._id}`, // Updated endpoint
        method: 'PUT',
        body: updatedSession,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'SessionCollection', id: arg._id }],
    }),

    // DELETE a session collection
    deleteSession: builder.mutation({
      query: (id) => ({
        url: `/sessionCollections/${id}`, // Updated endpoint
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'SessionCollection', id: arg }],
    }),

    // UPLOAD CSV file for a session collection
    uploadSessionCSV: builder.mutation({
      query: (formData) => ({
        url: '/sessionCollections/upload', // Ensure backend route is correct
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'SessionCollection', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useUploadSessionCSVMutation,
} = sessionsApiSlice;
