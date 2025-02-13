import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Etherscan Clone</h4>
          <p>© 2024 Etherscan Clone</p>
        </div>
        <div className="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="#">API Documentation</a></li>
            <li><a href="#">Help Center</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
