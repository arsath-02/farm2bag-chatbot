import React from 'react';
import './ExploreMenu.css';
import { assets } from '../../assets/assets'; // Ensure this path is correct

// Corrected menu list with proper asset references
const menu_list = [
  {
    menu_name: "Fruits",
    menu_image: assets.pomegranate, // Ensure assets.pomegranate exists in assets.js
  },
  {
    menu_name: "Vegetables",
    menu_image: assets.beetroot, // Ensure assets.vegetables_image exists in assets.js
  },
];

const ExploreMenu = ({ category, setCategory }) => {
  return (
    <div className="explore-menu" id="explore-menu">
      <h1>Explore Products</h1>
      <p className="explore-menu-text">
      Explore a bountiful selection of farm-fresh fruits and vegetables, sourced directly from trusted farmers. Enjoy the freshest, highest-quality produce, handpicked to bring natural goodness straight to your table. Whether you're a farmer or a customer, AgriFresh connects you to the best of nature, ensuring freshness in every bite!
      </p>
      <div className="explore-menu-list">
        {menu_list.map((item, index) => (
          <div
            key={index}
            onClick={() => setCategory((prev) => (prev === item.menu_name ? "All" : item.menu_name))}
            className="explore-menu-list-item"
          >
            <img className={category === item.menu_name ? "active" : ""} src={item.menu_image} alt={item.menu_name} />
            <p>{item.menu_name}</p>
          </div>
        ))}
      </div>
      <hr />
    </div>
  );
};

export default ExploreMenu;
