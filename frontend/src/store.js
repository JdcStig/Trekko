import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './slices/apiSlice';
import { playersApiSlice } from './slices/playersApiSlice';


// Create the Redux store by combining reducers and applying middleware.
const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [playersApiSlice.reducerPath]: playersApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, playersApiSlice.middleware),
  
});

export default store;
