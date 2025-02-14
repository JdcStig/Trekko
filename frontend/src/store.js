import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './slices/apiSlice';
import { playersApiSlice } from './slices/playersApiSlice';
import { teamsApiSlice } from './slices/teamsApiSlice';
import { sessionsApiSlice } from './slices/sessionsApiSlice';

// Create the Redux store by combining reducers and applying middleware.
const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [playersApiSlice.reducerPath]: playersApiSlice.reducer,
    [teamsApiSlice.reducerPath]: teamsApiSlice.reducer,
    [sessionsApiSlice.reducerPath]: sessionsApiSlice.reducer, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, playersApiSlice.middleware, teamsApiSlice.middleware,sessionsApiSlice.middleware), 
  
});

export default store;
