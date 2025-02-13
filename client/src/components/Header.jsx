import React, { useState, useEffect } from 'react';
import './Header.css';

function Header() {
  const [marketData, setMarketData] = useState({
    price: '0.00',
    marketCap: '0.0',
    transactions: '0',
    lastBlock: '0'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/market-data');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch market data');
        }

        setMarketData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="stats-container">
        <div className="stat-box">
          <h3>ETHER PRICE</h3>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error-text">Error loading data</p>
          ) : (
            <p>${marketData.price} USD</p>
          )}
        </div>
        <div className="stat-box">
          <h3>MARKET CAP</h3>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error-text">Error loading data</p>
          ) : (
            <p>${marketData.marketCap}B USD</p>
          )}
        </div>
        <div className="stat-box">
          <h3>TRANSACTIONS</h3>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error-text">Error loading data</p>
          ) : (
            <p>{marketData.transactions}</p>
          )}
        </div>
        <div className="stat-box">
          <h3>LAST BLOCK</h3>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error-text">Error loading data</p>
          ) : (
            <p>#{marketData.lastBlock}</p>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
