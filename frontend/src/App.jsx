import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';

// Import Components
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer'; 
//import LoginPopup from './components/LoginPopup/LoginPopup'; 
import Chat from './components/Chat/Chat';
// Import Pages
import Home from './pages/Home/Home';
import Cart from './pages/Cart/Cart';
import PlaceOrder from './pages/PlaceOrder/PlaceOrder';
import Verify from './pages/Verify/Verify';
import MyOrders from './pages/MyOrders/MyOrders';

// Import Authentication Pages
import Login from './components/auth/Login/Login';
import Register from './components/auth/Register/Register';

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      {/* Conditionally render LoginPopup */}
      {showLogin && <LoginPopup setShowLogin={setShowLogin} />}

      <div className="app">
        <Navbar setShowLogin={setShowLogin} />

        {/* Define Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/myorders" element={<MyOrders />} />
          <Route path='/chat' element={<Chat />} />
        </Routes>

        {/* Footer Component */}
        <Footer />
      </div>
    </>
  );
};

export default App;
