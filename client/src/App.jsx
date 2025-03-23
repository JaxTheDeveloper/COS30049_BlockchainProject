import { useState, useEffect } from 'react';
import { 
  CssBaseline, 
  Box, 
  ThemeProvider, 
  createTheme,
  Container 
} from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import ContractAnalyzer from './components/ContractAnalyzer';
import ContractHistory from './components/ContractHistory';
import WalletInfo from './components/WalletInfo';
import Header from './components/Header';

// custom theme, color pallette and css baseline
const theme = createTheme({
  palette: {
    primary: {
      main: '#3498db',
    },
    secondary: {
      main: '#2ecc71',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8f9fa',
        },
      },
    },
  },
});

// Wrap the main app content to use useLocation
function AppContent() {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [contractLoading, setContractLoading] = useState(false);
  const location = useLocation();

  // Add effect to handle contract route
  useEffect(() => {
    const fetchContractData = async (contractId) => {
      try {
        console.log('[DEBUG] Fetching contract data for ID:', contractId);
        setContractLoading(true);
        setError(null);
        
        const response = await fetch(`http://localhost:5000/api/contract/${contractId}/report`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch contract data');
        }
        
        console.log('[DEBUG] Received contract data:', data);
        setContractData(data);
      } catch (err) {
        console.error('[DEBUG] Error fetching contract data:', err);
        setError(err.message);
      } finally {
        setContractLoading(false);
      }
    };

    // Check if we're on a contract route
    const match = location.pathname.match(/\/contract\/(\d+)/);
    if (match) {
      const contractId = match[1];
      console.log('[DEBUG] Contract route detected, ID:', contractId);
      fetchContractData(contractId);
    } else {
      // Reset contract data when not on contract route
      setContractData(null);
      setContractLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/market-data');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch market data');
        }

        setMarketData(data);
      } catch (err) {
        console.error('Error fetching market data:', err);
      }
    };

    fetchMarketData();
    // Refresh market data every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (address) => {
    try {
      setLoading(true);
      setError(null);
      setWalletData(null);
      // Reset contract data when searching for wallets
      setContractData(null);

      console.log('Searching for address:', address);
      const response = await fetch(`http://localhost:5000/api/wallet/${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch wallet data');
      }

      console.log('Received wallet data:', data);
      setWalletData(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContractAnalysis = async (contractId) => {
    if (!contractId) return;
    
    try {
      setContractLoading(true);
      setContractData(null);
      
      // Fetch contract data using the report endpoint
      const response = await fetch(`http://localhost:5000/api/contract/${contractId}/report`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contract data');
      }
      
      console.log('[DEBUG] Contract analysis data:', data);
      setContractData(data);
      
      // Reset wallet data when viewing contract analysis
      setWalletData(null);
    } catch (err) {
      console.error('[DEBUG] Contract analysis error:', err);
      setError(err.message || 'Error analyzing contract');
    } finally {
      setContractLoading(false);
    }
  };

  // Only show Header on home page with no wallet data
  const shouldShowHeader = location.pathname === '/' && !walletData && !loading && !error;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Box sx={{ width: '100%' }}>
        <NavBar 
          onSearch={handleSearch} 
          onContractAnalysisComplete={handleContractAnalysis}
        />
        {shouldShowHeader && <Header />}
      </Box>
      
      <Container 
        maxWidth={false} 
        sx={{ 
          width: '100%',
          maxWidth: '1400px !important',
          px: { xs: 2, sm: 3 }
        }}
      >
        <Box component="main" sx={{ flex: 1, width: '100%', my: 3 }}>
          <Routes>
            <Route 
              path="/" 
              element={
                <WalletInfo 
                  loading={loading} 
                  error={error} 
                  walletData={walletData} 
                  marketData={marketData} 
                />
              } 
            />
            <Route path="/history" element={<ContractHistory />} />
            <Route 
              path="/contract/:contractId" 
              element={
                <ContractAnalyzer 
                  loading={contractLoading} 
                  contractData={contractData} 
                  error={error}
                />
              } 
            />
          </Routes>
        </Box>
      </Container>
      
      <Box sx={{ width: '100%', mt: 'auto' }}>
        <Footer />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
