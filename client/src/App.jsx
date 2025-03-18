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
          <NavBar onSearch={handleSearch} />
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
            <WalletInfo loading={loading} error={error} walletData={walletData} marketData={marketData} />
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
