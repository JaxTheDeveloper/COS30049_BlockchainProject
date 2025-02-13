import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Blockchain Explorer</h4>
          <p>© 2024 Blockchain Explorer</p>
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
