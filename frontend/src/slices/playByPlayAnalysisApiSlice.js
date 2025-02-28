// src/slices/playByPlayAnalysisApiSlice.js
import { apiSlice } from './apiSlice';

export const playByPlayAnalysisApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/playbyplayanalysis
    getPlayByPlayAnalysiss: builder.query({
      query: () => '/playbyplayanalysis',
      providesTags: ['PlayByPlayAnalysis'],
    }),

    // POST /api/playbyplayanalysis
    createPlayByPlayAnalysis: builder.mutation({
      query: (newAnalysis) => ({
        url: '/playbyplayanalysis',
        method: 'POST',
        body: newAnalysis,
      }),
      invalidatesTags: ['PlayByPlayAnalysis'],
    }),

    // PUT /api/playbyplayanalysis/:id
    updatePlayByPlayAnalysis: builder.mutation({
      query: (updatedAnalysis) => ({
        url: `/playbyplayanalysis/${updatedAnalysis._id}`,
        method: 'PUT',
        body: updatedAnalysis,
      }),
      invalidatesTags: ['PlayByPlayAnalysis', 'PlayByPlayAnalysisCSV'],
    }),

    // DELETE /api/playbyplayanalysis/:id
    deletePlayByPlayAnalysis: builder.mutation({
      query: (id) => ({
        url: `/playbyplayanalysis/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlayByPlayAnalysis'],
    }),

    // POST /api/playbyplayanalysis/upload
    uploadPlayByPlayAnalysisCSV: builder.mutation({
      query: (formData) => ({
        url: '/playbyplayanalysis/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['PlayByPlayAnalysisCSV'],
    }),

    // GET /api/playbyplayanalysis/:id/csvs
    getPlayByPlayAnalysisCSVs: builder.query({
      query: (analysisId) => `/playbyplayanalysis/${analysisId}/csvs`,
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

    // DELETE /api/playbyplayanalysis/:id/csvs/all
    deleteAllPlayByPlayAnalysisCSVs: builder.mutation({
      query: (analysisId) => ({
        url: `/playbyplayanalysis/${analysisId}/csvs/all`,
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
