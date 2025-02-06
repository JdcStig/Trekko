import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/bootstrap.custom.css';
import './assets/styles/index.css';
import App from './App';
import PlayerManagementScreen from './screens/PlayerManagementScreen';
import TeamManagementScreen from './screens/TeamManagementScreen';
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


const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {/* Public Routes */}
      <Route path="/LoginScreen" element={<LoginScreen />} />
      <Route path="/RegisterScreen" element={<RegisterScreen />} />

      {/* Protected Routes */}
      <Route element={<PrivateRoute />}>
        <Route path="/PlayerManagementScreen" element={<PlayerManagementScreen />} />
        <Route path="/TeamManagementScreen" element={<TeamManagementScreen />} />
        <Route path="/" element={<TeamManagementScreen />} />
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

