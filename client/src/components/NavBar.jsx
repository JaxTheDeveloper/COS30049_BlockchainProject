import React, { useState } from 'react';
import './NavBar.css';

function NavBar({ onSearch }) {
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      console.log('Submitting search for:', searchValue);
      onSearch(searchValue.trim());
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-wrapper">
            <select className="search-filter">
              <option value="all">All Filters</option>
              <option value="addresses">Addresses</option>
              <option value="tokens">Tokens</option>
              <option value="blocks">Blocks</option>
            </select>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by Address / Txn Hash / Block / Token"
              className="search-input"
            />
            <button type="submit" className="search-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </nav>
  );
}

export default NavBar;
