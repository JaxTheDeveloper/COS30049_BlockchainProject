import { useState } from 'react';
import { 
  CssBaseline, 
  Box, 
  ThemeProvider, 
  createTheme,
  Container 
} from '@mui/material';
import NavBar from './components/NavBar';
import Header from './components/Header';
import Footer from './components/Footer';
import WalletInfo from './components/WalletInfo';
import ContractAnalyzer from './components/ContractAnalyzer';

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

function App() {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [contractLoading, setContractLoading] = useState(false);

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
      console.error('Search error:', err);
      setError(err.message || 'Error fetching wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleContractAnalysis = async (contractId) => {
    if (!contractId) return;
    
    try {
      setContractLoading(true);
      setContractData(null);
      
      // Fetch contract data
      const response = await fetch(`http://localhost:5000/api/contract/${contractId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contract data');
      }
      
      console.log('Received contract data:', data);
      setContractData(data);
      
      // Reset wallet data when viewing contract analysis
      setWalletData(null);
    } catch (err) {
      console.error('Contract analysis error:', err);
      setError(err.message || 'Error analyzing contract');
    } finally {
      setContractLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
        </Box>
        
        <Container 
          maxWidth={false} 
          sx={{ 
            width: '100%',
            maxWidth: '1400px !important',
            px: { xs: 2, sm: 3 }
          }}
        >
          <Header />
          <Box component="main" sx={{ flex: 1, width: '100%', my: 3 }}>
            {contractData ? (
              <ContractAnalyzer loading={contractLoading} contractData={contractData} />
            ) : (
              <WalletInfo loading={loading} error={error} walletData={walletData} marketData={marketData} />
            )}
          </Box>
        </Container>
        
        <Box sx={{ width: '100%', mt: 'auto' }}>
          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
