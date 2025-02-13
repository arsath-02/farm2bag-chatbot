import React, { useState, useContext } from 'react';
import './Navbar.css';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';
import FarmerDashboard from '../FarmerDashboard/FarmerDashboard'; // Import FarmerDashboard

const Navbar = ({ setShowLogin }) => {
  const [menu, setMenu] = useState("home");
  const [isDashboardVisible, setIsDashboardVisible] = useState(false); // State for modal visibility
  const { getTotalCartAmount, token, setToken, userType } = useContext(StoreContext);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    setToken("");
    navigate("/");
  };

  const toggleDashboard = () => {
    setIsDashboardVisible(!isDashboardVisible); // Toggle the modal visibility
  };

  return (
    <div className="navbar">
      <Link to='/'><img src={assets.logo} alt="Logo" className="logo" /></Link>
      <ul className="navbar-menu">
        <Link to='/' onClick={() => setMenu("home")} className={menu === "home" ? "active" : ""}>Home</Link>
        <a href='#explore-menu' onClick={() => setMenu("menu")} className={menu === "menu" ? "active" : ""}>Category</a>
        <a href='#app-download' onClick={() => setMenu("mobile-app")} className={menu === "mobile-app" ? "active" : ""}>Mobile App</a>
        <a href='#footer' onClick={() => setMenu("contact-us")} className={menu === "contact-us" ? "active" : ""}>Contact Us</a>
      </ul>
      <div className="navbar-right">
        <img src={assets.search_icon} alt="Search" className="navbar-search-icon" />
        <div className="navbar-cart-icon">
          <Link to='/cart'><img src={assets.basket_icon} alt="Cart" /></Link>
          <div className={getTotalCartAmount() === 0 ? "" : "dot"}></div>
        </div>
        {!token ? (
          <button onClick={() => navigate('/auth/login')}>Sign In</button>
        ) : (
          <div className='navbar-profile'>
            <img src={assets.profile_icon} alt='Profile' onClick={toggleDashboard} />
            <ul className="nav-profile-dropdown">
              {userType === "farmer" ? (
                <li onClick={toggleDashboard}>
                  <img src={assets.dashboard_icon} alt='Farmer Dashboard' />
                  <p>Farmer Dashboard</p>
                </li>
              ) : (
                <li onClick={() => navigate('/customer-dashboard')}>
                  <p>Customer Dashboard</p>
                </li>
              )}
            
              <hr />
              <li onClick={logout}>
                <img src={assets.logout_icon} alt='Logout' />
                <p>Logout</p>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Render Farmer Dashboard Modal */}
      {isDashboardVisible && <FarmerDashboard isVisible={isDashboardVisible} toggleVisibility={setIsDashboardVisible} />}
    </div>
  );
};

export default Navbar;
