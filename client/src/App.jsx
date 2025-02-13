import { useState } from 'react'
import './App.css'
import NavBar from './components/NavBar'
import Header from './components/Header'
import Footer from './components/Footer'
import WalletInfo from './components/WalletInfo'

function App() {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (address) => {
    try {
      setLoading(true);
      setError(null);
      setWalletData(null);

      console.log('Searching for address:', address);
      const response = await fetch(`http://localhost:5000/api/wallet/${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch wallet data');
      }

      console.log('Received wallet data:', data);
      setWalletData(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Error fetching wallet data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <NavBar onSearch={handleSearch} />
      <Header />
      <WalletInfo loading={loading} error={error} walletData={walletData} />
      <Footer />
    </div>
  )
}

export default App
