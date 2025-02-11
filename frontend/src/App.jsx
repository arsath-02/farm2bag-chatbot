import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Register from './components/auth/Register/Register';
import Login from './components/auth/Login/Login';
import Chat from './components/Chat/Chat';
import FarmerPage from './components/FarmerDashboard/FarmerDashboard';


function App() {
  return (
    <Routes>
      <Route path="/auth/register" element={<Register />} />
      <Route path="/auth/login" element={<Login />} />
      
      <Route path='/chat' element={<Chat />} />
      <Route path='/farmer' element={<FarmerPage />} />
      

    </Routes>
  );
}

export default App;
