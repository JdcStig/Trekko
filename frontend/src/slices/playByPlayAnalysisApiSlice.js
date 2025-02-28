// src/slices/playByPlayAnalysisApiSlice.js
import { apiSlice } from './apiSlice';

export const playByPlayAnalysisApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/playByPlayAnalysiss
    getPlayByPlayAnalysiss: builder.query({
      query: () => '/playByPlayAnalysiss',
      providesTags: ['PlayByPlayAnalysis'],
    }),

    // POST /api/playByPlayAnalysiss
    createPlayByPlayAnalysis: builder.mutation({
      query: (newAnalysis) => ({
        url: '/playByPlayAnalysiss',
        method: 'POST',
        body: newAnalysis,
      }),
      invalidatesTags: ['PlayByPlayAnalysis'],
    }),

    // PUT /api/playByPlayAnalysiss/:id
    updatePlayByPlayAnalysis: builder.mutation({
      query: (updatedAnalysis) => ({
        url: `/playByPlayAnalysiss/${updatedAnalysis._id}`,
        method: 'PUT',
        body: updatedAnalysis,
      }),
      invalidatesTags: ['PlayByPlayAnalysis', 'PlayByPlayAnalysisCSV'],
    }),

    // DELETE /api/playByPlayAnalysiss/:id
    deletePlayByPlayAnalysis: builder.mutation({
      query: (id) => ({
        url: `/playByPlayAnalysiss/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlayByPlayAnalysis'],
    }),

    // POST /api/playByPlayAnalysiss/upload
    uploadPlayByPlayAnalysisCSV: builder.mutation({
      query: (formData) => ({
        url: '/playByPlayAnalysiss/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['PlayByPlayAnalysisCSV'],
    }),

    // GET /api/playByPlayAnalysiss/:id/csvs
    getPlayByPlayAnalysisCSVs: builder.query({
      query: (analysisId) => `/playByPlayAnalysiss/${analysisId}/csvs`,
      providesTags: (result, error, arg) =>
        result && result.playByPlayAnalysisPlayerDataArray
          ? [
              ...result.playByPlayAnalysisPlayerDataArray.map(({ _id }) => ({
                type: 'PlayByPlayAnalysisCSV',
                id: _id,
              })),
              { type: 'PlayByPlayAnalysisCSV', id: 'LIST' },
            ]
          : [{ type: 'PlayByPlayAnalysisCSV', id: 'LIST' }],
    }),

    // DELETE /api/playByPlayAnalysiss/:id/csvs/all
    deleteAllPlayByPlayAnalysisCSVs: builder.mutation({
      query: (analysisId) => ({
        url: `/playByPlayAnalysiss/${analysisId}/csvs/all`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlayByPlayAnalysisCSV'],
    }),
  }),
});

export const {
  useGetPlayByPlayAnalysissQuery,
  useCreatePlayByPlayAnalysisMutation,
  useUpdatePlayByPlayAnalysisMutation,
  useDeletePlayByPlayAnalysisMutation,
  useUploadPlayByPlayAnalysisCSVMutation,
  useGetPlayByPlayAnalysisCSVsQuery,
  useDeleteAllPlayByPlayAnalysisCSVsMutation,
} = playByPlayAnalysisApiSlice;
