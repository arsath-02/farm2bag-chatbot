import React, { useContext } from 'react';
import './FoodDisplay.css';
import { StoreContext } from '../../context/StoreContext';
import FoodItem from '../FoodItem/FoodItem';
import { assets } from '../../assets/assets';

const FoodDisplay = ({ category }) => {
  const { food_list } = useContext(StoreContext);

  // Filter food list based on the selected category
  const filteredFoodList = food_list.filter(
    (item) => category === 'All' || category.trim().toLowerCase() === item.category.trim().toLowerCase()
  );

  // Images categorized as fruits and vegetables
  const allImages = [
    { category: "Fruits", name: "Apple", price: 90, image: assets.apple },
    { category: "Fruits", name: "Banana", price: 18, image: assets.banana },
    { category: "Fruits", name: "Mango", price: 14, image: assets.mango },
    { category: "Fruits", name: "Orange", price: 12, image: assets.orange },
    { category: "Fruits", name: "Papaya", price: 20, image: assets.papaya },
    { category: "Fruits", name: "Pineapple", price: 15, image: assets.pineapple },
    { category: "Fruits", name: "Pomegranate", price: 14, image: assets.pomegranate },
    { category: "Fruits", name: "Watermelon", price: 14, image: assets.watermelon },
    { category: "Vegetables", name: "Beetroot", price: 14, image: assets.beetroot },
    { category: "Vegetables", name: "Carrots", price: 14, image: assets.carrots },
    { category: "Vegetables", name: "Cauliflower", price: 14, image: assets.cauliflower },
    { category: "Vegetables", name: "Green Chilli", price: 14, image: assets.greenchilli },
    { category: "Vegetables", name: "Onion", price: 14, image: assets.onion },
    { category: "Vegetables", name: "Potato", price: 14, image: assets.potato },
    { category: "Vegetables", name: "Tomato", price: 14, image: assets.tomato }
  ];

  // Filter images based on the selected category
  const filteredImages = category === 'All' 
    ? allImages 
    : allImages.filter((item) => item.category === category);

  return (
    <div className="food-display" id="food-display">
      <h2>Top Products for You</h2>
      <div className="food-display-list">
        {filteredFoodList.map((item) => (
          <FoodItem
            key={item._id}
            id={item._id}
            name={item.name}
            description={item.description}
            price={item.price}
            image={item.image}
          />
        ))}
      </div>

      {/* Display additional images with name and price */}
      <h3>Fresh Picks for You</h3>
      <div className="additional-images">
        {filteredImages.map((item, index) => (
          <div key={index} className="additional-image-item">
            <img src={item.image} alt={item.name} />
            <p className="additional-item-name">{item.name}</p>
            <p className="additional-item-price">Price: {item.price}/kg</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoodDisplay;
