import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = () => {
  // Extracting userInfo from the Redux store
  const { userInfo } = useSelector((state) => state.auth);

  // If userInfo exists/ is logged in, render the child components (Outlet)
  return userInfo ? <Outlet /> 
  :
   // Otherwise, redirect to the LoginScreen 
  <Navigate to="/LoginScreen" replace />;
};

export default PrivateRoute;
