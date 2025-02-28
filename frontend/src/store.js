// store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './slices/apiSlice';
import { playersApiSlice } from './slices/playersApiSlice';
import { teamsApiSlice } from './slices/teamsApiSlice';
import { sessionsApiSlice } from './slices/sessionsApiSlice';
// FIX #1: Use the correct relative path to the slices folder
import { playByPlayAnalysisApiSlice } from './slices/playByPlayAnalysisApiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [playersApiSlice.reducerPath]: playersApiSlice.reducer,
    [teamsApiSlice.reducerPath]: teamsApiSlice.reducer,
    [sessionsApiSlice.reducerPath]: sessionsApiSlice.reducer,
    [playByPlayAnalysisApiSlice.reducerPath]: playByPlayAnalysisApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      apiSlice.middleware,
      playersApiSlice.middleware,
      teamsApiSlice.middleware,
      sessionsApiSlice.middleware,
      // FIX #2: Add the middleware for playByPlayAnalysisApiSlice
      playByPlayAnalysisApiSlice.middleware
    ),
});

export default store;
