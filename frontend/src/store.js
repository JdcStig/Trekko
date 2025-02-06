import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './slices/apiSlice';
import { playersApiSlice } from './slices/playersApiSlice';
import { teamsApiSlice } from './slices/teamsApiSlice';


// Create the Redux store by combining reducers and applying middleware.
const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [playersApiSlice.reducerPath]: playersApiSlice.reducer,
    [teamsApiSlice.reducerPath]: teamsApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, playersApiSlice.middleware, teamsApiSlice.middleware), 
  
});

export default store;
