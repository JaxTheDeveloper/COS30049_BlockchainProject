import { useState } from 'react'
import { 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  Box,
  Stack
} from '@mui/material'
import NavBar from './components/NavBar'
import Header from './components/Header'
import Footer from './components/Footer'
import WalletInfo from './components/WalletInfo'

const theme = createTheme({
  palette: {
    primary: {
      main: '#3498db',
    },
    secondary: {
      main: '#2ecc71',
    },
    error: {
      main: '#e74c3c',
    },
    background: {
      default: '#fff',
      paper: '#fff',
    },
    grey: {
      50: '#f8f9fa',
      100: '#f1f3f5',
      200: '#e7eaf3',
    },
    text: {
      primary: '#1e2022',
      secondary: '#77838f',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#fff',
          margin: 0,
          padding: 0,
        },
        '#root': {
          minHeight: '100vh',
          width: '100vw',
          margin: 0,
          padding: 0,
        },
      },
    },
  },
})

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
          margin: 0,
          padding: 0,
        }}
      >
        <Stack spacing={0} sx={{ width: '100%', height: '100vh' }}>
          <NavBar onSearch={handleSearch} />
          <Header />
          <Box 
            component="main" 
            sx={{ 
              flex: 1,
              width: '100%',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <WalletInfo loading={loading} error={error} walletData={walletData} />
          </Box>
          <Footer />
        </Stack>
      </Box>
    </ThemeProvider>
  )
}

export default App
