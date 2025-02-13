import React from 'react';
import './Header.css';
import homeImage from '../../assets/home.jpg'; // Correctly import the image

const Header = () => {
  return (
    <div className="header" style={{ backgroundImage: `url(${homeImage})` }}>
      <div className="header-contents">
        <h2>AgriFresh</h2>
        <p>
        Discover the freshest farm-to-table experience with AgriFresh! 🌿🥕 We connect farmers directly with customers, offering a diverse selection of farm-fresh fruits, vegetables, and organic produce. Enjoy the goodness of nature, handpicked for quality and taste. Whether you're a farmer looking to reach more customers or a buyer seeking the best produce, AgriFresh brings the market to your fingertips—fresh, reliable, and straight from the source!
        </p>
        <button>View Products</button>
      </div>
    </div>
  );
};

export default Header;
