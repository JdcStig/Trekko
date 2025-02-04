import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './slices/apiSlice';
import { playersApiSlice } from './slices/playersApiSlice';
import { squadsApiSlice } from './slices/squadsApiSlice';


// Create the Redux store by combining reducers and applying middleware.
const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [playersApiSlice.reducerPath]: playersApiSlice.reducer,
    [squadsApiSlice.reducerPath]: squadsApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, playersApiSlice.middleware, squadsApiSlice.middleware), 
  
});

export default store;
