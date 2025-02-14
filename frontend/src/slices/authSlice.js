import { createSlice } from '@reduxjs/toolkit';
import { apiSlice } from '../slices/apiSlice'; // Ensure this is your configured API slice

const initialState = {
  userInfo: localStorage.getItem('userInfo')
    ? JSON.parse(localStorage.getItem('userInfo'))
    : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

// Thunk function to handle logout properly
export const logoutUser = () => (dispatch) => {
  // Clear user info from state and localStorage
  dispatch(logout());
  // Reset the RTK Query cache so no stale data is shown to the new user
  dispatch(apiSlice.util.resetApiState());
};
