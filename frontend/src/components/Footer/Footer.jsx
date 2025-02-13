import React from 'react'
import './Footer.css'
import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <div className='footer' id='footer'>
        <div className="footer-content">
            <div className="footer-content-left">
              <img src={assets.logo} alt=""/>
              <p> Discover the freshest farm-to-table experience with AgriFresh! 🌿🥕 We connect farmers directly with customers, offering a diverse selection of farm-fresh fruits, vegetables, and organic produce. Enjoy the goodness of nature, handpicked for quality and taste. Whether you're a farmer looking to reach more customers or a buyer seeking the best produce, AgriFresh brings the market to your fingertips—fresh, reliable, and straight from the source!

</p>
<div className="footer-social-icons">
  <img src={assets.facebook_icon} alt="" />
  <img src={assets.twitter_icon} alt="" />
  <img src={assets.linkedin_icon} alt="" />
</div>
            </div>
            <div className="footer-content-center">
              <h2>COMPANY</h2>
              <ul>
                <li>Home</li>
                <li>About us</li>
                <li>Delivery</li>
                <li>Privacy policy</li>
              </ul>
            </div>
            <div className="footer-content-right">
            <h2>GET IN TOUCH</h2>
            <ul>
              <li>+1-9384-3575-12</li>
              <li>contact@AgriFresh.com</li>
            </ul>
        </div>
        </div>
        <hr />
        <p className="footer-copyright">Copyright 2024 AgriFresh.com -All Right Reserved.</p>
      
    </div>
  )
}

export default Footer
