import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Snackbar,
  Link,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TimelineIcon from '@mui/icons-material/Timeline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import TransactionGraph from './TransactionGraph';

function WalletInfo({ loading, error, walletData, marketData }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
  };

  const getEtherscanLink = (type, value) => {
    const baseUrl = 'https://etherscan.io';
    switch (type) {
      case 'transaction':
        return `${baseUrl}/tx/${value}`;
      case 'address':
        return `${baseUrl}/address/${value}`;
      default:
        return baseUrl;
    }
  };

  const formatDate = (timestamp) => {
    try {
      console.log('Raw timestamp:', timestamp); // Debug log
      const now = new Date();
      // Convert UNIX timestamp from seconds to milliseconds
      const date = new Date(parseInt(timestamp) * 1000);

      if (isNaN(date.getTime())) {
        console.log('Invalid date from timestamp:', timestamp); // Debug log
        return 'Invalid date';
      }

      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) {
        return `${diffSecs} secs ago`;
      } else if (diffMins < 60) {
        return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 30) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric'
        });
      }
    } catch (e) {
      console.error('Date formatting error:', e, 'Timestamp:', timestamp);
      return 'Invalid date';
    }
  };

  const formatEthValue = (balance) => {
    if (!balance || !marketData?.price) return '0.00';
    const value = parseFloat(balance) * parseFloat(marketData.price);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatEthPrice = (price) => {
    if (!price) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const getTransactionType = (tx, walletAddress) => {
    if (!walletAddress) return 'OUT';
    const from = tx.from.toLowerCase();
    const wallet = walletAddress.toLowerCase();
    return from === wallet ? 'OUT' : 'IN';
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  useEffect(() => {
    if (walletData?.address && activeTab === 1) {
      setGraphLoading(true);
      fetch(`http://localhost:5000/api/graph/wallet-graph/${walletData.address}`)
        .then(res => res.json())
        .then(data => {
          setGraphData(data);
        })
        .catch(err => {
          console.error('Error fetching graph data:', err);
        })
        .finally(() => {
          setGraphLoading(false);
        });
    }
  }, [walletData?.address, activeTab]);

  return (
    <Container maxWidth={false} sx={{ maxWidth: '1400px !important', py: 4 }}>
      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            bgcolor: '#fff5f5',
            border: '1px solid #feb2b2',
            borderRadius: 2
          }}
        >
          {error}
        </Alert>
      )}

      {walletData && (
        <>
          {/* Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Address Card */}
            <Grid item xs={12}>
              <Paper 
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid #e7eaf3',
                  borderRadius: 2,
                  bgcolor: '#fff'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 32, color: '#3498db' }} />
                  <Box>
                    <Typography variant="h6" sx={{ color: '#1e2022', mb: 0.5 }}>
                      Address
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '1rem',
                          color: '#2d3748'
                        }}
                      >
                        {walletData.address}
                      </Typography>
                      <Tooltip title="Copy address">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopy(walletData.address)}
                          sx={{ color: '#718096' }}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View on Etherscan">
                        <IconButton 
                          size="small"
                          component="a"
                          href={getEtherscanLink('address', walletData.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ color: '#718096' }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Stack>

                {/* Additional Wallet Info */}
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  {/* Transaction History */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        TRANSACTIONS SENT
                      </Typography>
                      <Stack direction="row" spacing={4}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Latest:
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#2d3748' }}>
                            {walletData.recentTransactions?.[0]?.timeStamp ? 
                              formatDate(walletData.recentTransactions[0].timeStamp) : 
                              'N/A'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            First:
                          </Typography>
                          <Typography variant="body1" sx={{ color: '#2d3748' }}>
                            {walletData.recentTransactions?.[walletData.recentTransactions.length - 1]?.timeStamp ? 
                              formatDate(walletData.recentTransactions[walletData.recentTransactions.length - 1].timeStamp) : 
                              'N/A'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>

                  {/* Latest Block */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        LATEST BLOCK
                      </Typography>
                      {walletData.recentTransactions?.[0]?.blockNumber ? (
                        <Link
                          href={`https://etherscan.io/block/${walletData.recentTransactions[0].blockNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            textDecoration: 'none',
                            color: '#3498db',
                            '&:hover': { color: '#2980b9' },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                            #{walletData.recentTransactions[0].blockNumber}
                          </Typography>
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No transactions found
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* Funded By */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        FUNDED BY
                      </Typography>
                      {walletData.recentTransactions?.find(tx => 
                        getTransactionType(tx, walletData.address) === 'IN'
                      ) ? (
                        <Link
                          href={getEtherscanLink('address', 
                            walletData.recentTransactions.find(tx => 
                              getTransactionType(tx, walletData.address) === 'IN'
                            ).from
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            textDecoration: 'none',
                            color: '#3498db',
                            '&:hover': { color: '#2980b9' },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                            {walletData.recentTransactions.find(tx => 
                              getTransactionType(tx, walletData.address) === 'IN'
                            ).from.substring(0, 16)}...
                          </Typography>
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No incoming transactions found
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Balance Card */}
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{
                  height: '100%',
                  p: 3,
                  border: '1px solid #e7eaf3',
                  borderRadius: 2,
                  bgcolor: '#fff',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceIcon sx={{ color: '#3498db' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      BALANCE
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#2d3748', fontWeight: 600 }}>
                    {walletData.balance} ETH
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${formatEthValue(walletData.balance)}
                    <Typography 
                      component="span" 
                      variant="caption" 
                      sx={{ ml: 1, color: '#718096' }}
                    >
                      @ ${formatEthPrice(marketData?.price)}/ETH
                    </Typography>
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            {/* Transaction Count Card */}
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{
                  height: '100%',
                  p: 3,
                  border: '1px solid #e7eaf3',
                  borderRadius: 2,
                  bgcolor: '#fff',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon sx={{ color: '#3498db' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      TRANSACTIONS
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#2d3748', fontWeight: 600 }}>
                    {walletData.transactionCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total transactions
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            {/* Token Balance Card */}
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{
                  height: '100%',
                  p: 3,
                  border: '1px solid #e7eaf3',
                  borderRadius: 2,
                  bgcolor: '#fff',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon sx={{ color: '#3498db' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      TOKEN BALANCE
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ color: '#2d3748', fontWeight: 600 }}>
                    {walletData.tokenBalance || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unique tokens
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Transactions Section */}
          <Paper 
            elevation={0}
            sx={{
              border: '1px solid #e7eaf3',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#fff'
            }}
          >
            <Box sx={{ borderBottom: '1px solid #e7eaf3' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                sx={{
                  px: 3,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    minHeight: '64px',
                    fontSize: '1rem'
                  }
                }}
              >
                <Tab 
                  icon={<ListAltIcon />} 
                  iconPosition="start" 
                  label="Transactions" 
                />
                <Tab 
                  icon={<TimelineIcon />} 
                  iconPosition="start" 
                  label="Graph View" 
                />
              </Tabs>
            </Box>

            {/* Section Title and Description */}
            <Box 
              sx={{ 
                p: 4,
                borderBottom: '1px solid #e7eaf3',
                background: 'linear-gradient(to right, #f8f9fa, #ffffff)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <Box 
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2
                }}
              >
                {activeTab === 0 ? (
                  <ListAltIcon sx={{ color: '#3498db', fontSize: 40 }} />
                ) : (
                  <TimelineIcon sx={{ color: '#3498db', fontSize: 40 }} />
                )}
                <Typography 
                  variant="h4" 
                  sx={{ 
                    color: '#2d3748',
                    fontWeight: 600,
                    letterSpacing: '-0.5px'
                  }}
                >
                  {activeTab === 0 ? 'Transaction History' : 'Transaction Network Graph'}
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  maxWidth: '800px',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '4px',
                    backgroundColor: '#3498db',
                    borderRadius: '2px'
                  }
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#718096',
                    fontWeight: 400,
                    lineHeight: 1.5
                  }}
                >
                  {activeTab === 0 ? (
                    'Explore the complete transaction history for this address. Track all incoming and outgoing transfers, monitor transaction values, and analyze patterns over time.'
                  ) : (
                    'Discover the interconnected network of transactions. This interactive visualization helps you understand transaction flows and identify key relationships between addresses.'
                  )}
                </Typography>
              </Box>
              {activeTab === 0 && (
                <Box sx={{ mt: 3, display: 'flex', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="IN" 
                      size="small"
                      sx={{ 
                        bgcolor: '#e8f5e9',
                        color: '#2ecc71',
                        fontWeight: 500,
                        minWidth: '60px'
                      }}
                    />
                    <Typography variant="body2" color="#718096">Incoming Transfers</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="OUT" 
                      size="small"
                      sx={{ 
                        bgcolor: '#fff5f5',
                        color: '#e74c3c',
                        fontWeight: 500,
                        minWidth: '60px'
                      }}
                    />
                    <Typography variant="body2" color="#718096">Outgoing Transfers</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Transactions Tab Content */}
            {activeTab === 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell sx={{ color: '#718096', fontWeight: 500 }}>Hash</TableCell>
                      <TableCell sx={{ color: '#718096', fontWeight: 500 }}>From</TableCell>
                      <TableCell align="center" sx={{ color: '#718096', fontWeight: 500 }}>Type</TableCell>
                      <TableCell sx={{ color: '#718096', fontWeight: 500 }}>To</TableCell>
                      <TableCell sx={{ color: '#718096', fontWeight: 500 }}>Value</TableCell>
                      <TableCell sx={{ color: '#718096', fontWeight: 500 }}>Age</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {walletData.recentTransactions?.length > 0 ? (
                      walletData.recentTransactions.map((tx) => (
                        <TableRow 
                          key={tx.hash}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: '#f8f9fa' 
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Link
                                href={getEtherscanLink('transaction', tx.hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  textDecoration: 'none',
                                  color: '#3498db',
                                  '&:hover': { color: '#2980b9' },
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}
                              >
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {tx.hash.substring(0, 16)}...
                                </Typography>
                                <OpenInNewIcon sx={{ fontSize: 16 }} />
                              </Link>
                              <Tooltip title="Copy hash">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleCopy(tx.hash)}
                                  sx={{ color: '#718096' }}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={getEtherscanLink('address', tx.from)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textDecoration: 'none',
                                color: '#3498db',
                                '&:hover': { color: '#2980b9' }
                              }}
                            >
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {tx.from.substring(0, 16)}...
                              </Typography>
                            </Link>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={getTransactionType(tx, walletData.address)}
                              size="small"
                              sx={{ 
                                bgcolor: getTransactionType(tx, walletData.address) === 'IN' 
                                  ? '#e8f5e9' 
                                  : '#fff5f5',
                                color: getTransactionType(tx, walletData.address) === 'IN' 
                                  ? '#2ecc71' 
                                  : '#e74c3c',
                                fontWeight: 500,
                                minWidth: '60px'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={getEtherscanLink('address', tx.to)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textDecoration: 'none',
                                color: '#3498db',
                                '&:hover': { color: '#2980b9' }
                              }}
                            >
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {tx.to.substring(0, 16)}...
                              </Typography>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {tx.value} ETH
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(tx.timeStamp)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography color="text.secondary">
                            No transactions found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Graph View Tab Content */}
            {activeTab === 1 && (
              <Box sx={{ p: 3, minHeight: 600 }}>
                {graphLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}>
                    <CircularProgress />
                  </Box>
                ) : !graphData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}>
                    <Typography color="text.secondary">No graph data available</Typography>
                  </Box>
                ) : (
                  <TransactionGraph 
                    data={graphData} 
                    walletAddress={walletData.address}
                  />
                )}
              </Box>
            )}
          </Paper>
        </>
      )}

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="Copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Container>
  );
}

export default WalletInfo; 