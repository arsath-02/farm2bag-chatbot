import React from 'react';
import './FarmerDashboard.css'; // Make sure to import the CSS file

const FarmerDashboard = ({ isVisible, toggleVisibility }) => {
  const closeModal = () => {
    toggleVisibility(false); // Close the modal
  };

  if (!isVisible) return null; // Don't render anything if the modal is not visible

  return (
    <div className="farmer-dashboard-modal">
      <div className="farmer-dashboard-content">
        <div className="farmer-dashboard">
          <div className="farmer-details">
            <h2>Farmer Details</h2>
            <p><strong>Name:</strong> John Doe</p>
            <p><strong>Email:</strong> john.doe@example.com</p>
          </div>

          <div className="farmer-products">
            <h2>My Products</h2>
            {/* Add farmer product display */}
            <div className="products-list">
              {/* Example of a product */}
              <div className="product-item">
                <img src="path/to/product-image.jpg" alt="Product" />
                <p>Product Name</p>
                <p>Price: $10</p>
              </div>
            </div>
          </div>
        </div>
        <button className="close-dashboard" onClick={closeModal}>Close</button>
      </div>
    </div>
  );
};

export default FarmerDashboard;
