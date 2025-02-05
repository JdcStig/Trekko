import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/bootstrap.custom.css';
import './assets/styles/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import SquadManagementScreen from './screens/SquadManagementScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { Provider } from 'react-redux';
import store from './store';
import PrivateRoute from './components/PrivateRoute';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';


console.log("Google Client ID Loaded:", process.env.REACT_APP_GOOGLE_CLIENT_ID);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {/* Public Routes */}
      <Route path="/LoginScreen" element={<LoginScreen />} />
      <Route path="/RegisterScreen" element={<RegisterScreen />} />

      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/SquadManagementScreen" element={<SquadManagementScreen />} />
        <Route path="/UserManagementScreen" element={<UserManagementScreen />} />
      </Route>
    </Route>
  )
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
