import React from 'react';
import './WalletInfo.css';

function WalletInfo({ loading, error, walletData }) {
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <main className="main-content">
      {loading && <div className="loading">Loading wallet information...</div>}
      
      {error && (
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {walletData && (
        <div className="wallet-info">
          <h2>Wallet Information</h2>
          <div className="info-card">
            <p>
              <strong>Address:</strong>
              <span className="address">{walletData.address}</span>
            </p>
            <p>
              <strong>Balance:</strong>
              <span>{walletData.balance} ETH</span>
            </p>
            <p>
              <strong>Transaction Count:</strong>
              <span>{walletData.transactionCount}</span>
            </p>
            <p>
              <strong>Last Updated:</strong>
              <span>{formatDate(walletData.lastUpdated)}</span>
            </p>
          </div>

          <h3>Recent Transactions</h3>
          <div className="transactions-list">
            {walletData.recentTransactions.length > 0 ? (
              walletData.recentTransactions.map((tx) => (
                <div key={tx.hash} className={`transaction-item ${tx.isError ? 'error' : 'success'}`}>
                  <p>
                    <strong>Hash:</strong>
                    <span className="hash">{formatAddress(tx.hash)}</span>
                  </p>
                  <p>
                    <strong>From:</strong>
                    <span className="address">{formatAddress(tx.from)}</span>
                  </p>
                  <p>
                    <strong>To:</strong>
                    <span className="address">{formatAddress(tx.to)}</span>
                  </p>
                  <p>
                    <strong>Value:</strong>
                    <span>{tx.value} ETH</span>
                  </p>
                  <p>
                    <strong>Time:</strong>
                    <span>{formatDate(tx.timestamp)}</span>
                  </p>
                  <p>
                    <strong>Status:</strong>
                    <span className={tx.isError ? 'error-text' : 'success-text'}>
                      {tx.isError ? 'Failed' : 'Success'}
                    </span>
                  </p>
                </div>
              ))
            ) : (
              <p className="no-transactions">No transactions found</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default WalletInfo; 