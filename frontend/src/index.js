// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './assets/styles/bootstrap.custom.css'
// import './assets/styles/index.css'
// import App from './App';
// import reportWebVitals from './reportWebVitals';
// import SquadManagementScreen from'./screens/SquadManagementScreen';
// import LoginScreen from'./screens/LoginScreen';
// import { Provider } from 'react-redux'; 
// import store from './store';
// import RegisterScreen from './screens/RegisterScreen';


// import {
//   createBrowserRouter,
//   createRoutesFromElements,
//   Route,
//   RouterProvider
// } from 'react-router-dom'

// const router = createBrowserRouter(
//   createRoutesFromElements(
//     <Route path="/" element={<App />}>
//     <Route index={true} path="/SquadManagementScreen" element={<SquadManagementScreen />} />
//     <Route  path="/LoginScreen" element={<LoginScreen />} />
//     <Route  path="/RegisterScreen" element={<RegisterScreen />} />
//     </Route>
//   )

// )

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(
//   <React.StrictMode>
//     <Provider store={store}>  
//       <RouterProvider router={router} />
//     </Provider>
//   </React.StrictMode>
// );


// reportWebVitals();







// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './assets/styles/bootstrap.custom.css';
import './assets/styles/index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import SquadManagementScreen from './screens/SquadManagementScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { Provider } from 'react-redux';
import store from './store';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index path="/SquadManagementScreen" element={<SquadManagementScreen />} />
      <Route path="/LoginScreen" element={<LoginScreen />} />
      <Route path="/RegisterScreen" element={<RegisterScreen />} />
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
