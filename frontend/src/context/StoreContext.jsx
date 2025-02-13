import axios from "axios";
import { createContext, useState, useEffect } from "react";

export const StoreContext = createContext(null);

const StoreContextProvider = ({ children }) => {
  const url = "http://localhost:4000";

  const [cartItems, setCartItems] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [food_list, setFoodList] = useState([]);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(localStorage.getItem("userType") || "customer");

  // Fetch user details if token exists
  const fetchUserDetails = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${url}/auth/user`, { headers: { token } });
      if (response.status === 200) {
        setUser(response.data.data);
        setUserType(response.data.data.role || "customer"); // Assuming "role" determines if it's farmer or customer
        localStorage.setItem("userType", response.data.data.role || "customer");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // Fetch food list from API
  const fetchFoodList = async () => {
    try {
      const response = await axios.get(`${url}/api/food/list`);
      setFoodList(response.data.data);
    } catch (error) {
      console.error("Error fetching food list:", error);
    }
  };

  // Load cart data from API
  const loadCartData = async () => {
    if (!token) return;
    try {
      const response = await axios.post(`${url}/api/cart/get`, {}, { headers: { token } });
      setCartItems(response.data.cartData || {});
    } catch (error) {
      console.error("Error loading cart:", error);
    }
  };

  // Add item to cart
  const addToCart = async (itemId) => {
    setCartItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));

    if (token) {
      try {
        await axios.post(`${url}/api/cart/add`, { itemId }, { headers: { token } });
      } catch (error) {
        console.error("Error adding to cart:", error);
      }
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });

    if (token) {
      try {
        await axios.post(`${url}/api/cart/remove`, { itemId }, { headers: { token } });
      } catch (error) {
        console.error("Error removing from cart:", error);
      }
    }
  };

  // Calculate total cart amount
  const getTotalCartAmount = () => {
    return Object.keys(cartItems).reduce((total, itemId) => {
      const item = food_list.find((product) => product._id === itemId);
      return item ? total + item.price * cartItems[itemId] : total;
    }, 0);
  };

  // Sync token with localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("token", token);
    if (!token) {
      setUser(null);
      setUserType("customer");
      localStorage.removeItem("userType");
    }
  }, [token]);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      await fetchFoodList();
      if (token) {
        await loadCartData();
        await fetchUserDetails();
      }
    }
    loadData();
  }, [token]);

  const contextValue = {
    food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    url,
    token,
    setToken,
    user,
    setUser,
    userType,
    setUserType,
  };

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>;
};

export default StoreContextProvider;
