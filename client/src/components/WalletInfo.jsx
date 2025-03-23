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
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TimelineIcon from '@mui/icons-material/Timeline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import TransactionGraph from './TransactionGraph';
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

function WalletInfo({ loading, error, walletData, marketData, transactionHistory }) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalContracts: 0,
    totalVulnerabilities: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    analyzed: 0,
    pending: 0
  });

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

  const formatDate = (dateString) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      return `${diffDays} days ago`;
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 25)}...`;
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

  // For debugging
  console.log('Transaction History:', transactionHistory);
  console.log('Wallet Data:', walletData);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Add function to fetch graph data
  const fetchGraphData = async (address) => {
    if (!address) return;
    
    try {
      setGraphLoading(true);
      setGraphError(null);
      
      const response = await fetch(`http://localhost:5000/api/graph/wallet-graph/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch graph data');
      }
      
      const data = await response.json();
      setGraphData(data);
    } catch (err) {
      console.error('Graph data fetch error:', err);
      setGraphError(err.message);
    } finally {
      setGraphLoading(false);
    }
  };

  // Fetch graph data when wallet address changes
  useEffect(() => {
    if (walletData?.address) {
      fetchGraphData(walletData.address);
    }
  }, [walletData?.address]);

  // Add console logs to debug data flow
  useEffect(() => {
    if (walletData?.address && activeTab === 1) {
      setGraphLoading(true);
      fetch(`http://localhost:5000/api/graph/wallet-graph/${walletData.address}`)
        .then(res => res.json())
        .then(data => {
          console.log('Graph data received:', data);
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

  useEffect(() => {
    if (walletData?.contracts) {
      const newMetrics = {
        totalContracts: walletData.contracts.length,
        totalVulnerabilities: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        analyzed: 0,
        pending: 0
      };

      walletData.contracts.forEach(contract => {
        if (contract.vulnerabilities) {
          contract.vulnerabilities.forEach(vuln => {
            newMetrics.totalVulnerabilities++;
            switch (vuln.severity.toLowerCase()) {
              case 'high':
                newMetrics.highSeverity++;
                break;
              case 'medium':
                newMetrics.mediumSeverity++;
                break;
              case 'low':
                newMetrics.lowSeverity++;
                break;
            }
          });
        }
        if (contract.status === 'completed') {
          newMetrics.analyzed++;
        } else {
          newMetrics.pending++;
        }
      });

      setMetrics(newMetrics);
    }
  }, [walletData]);

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon />;
      case 'pending':
        return <PendingIcon />;
      case 'failed':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  if (loading || error || !walletData) {
    return null; // Handle these states in parent component
  }

  return (
    <Container 
      maxWidth={false}
      sx={{ 
        py: 4,
        maxWidth: '1400px !important',
        textAlign: 'center'
      }}
    >
      {loading && (
        <Box 
          display="flex" 
          justifyContent="center" 
          p={4}
          sx={{
            color: '#77838f',
            fontSize: '1rem'
          }}
        >
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
            borderRadius: 2,
            color: '#c53030',
            '& .MuiAlert-message': {
              fontSize: '0.9rem'
            }
          }}
        >
          {error}
        </Alert>
      )}

      {walletData && (
        <Paper 
          elevation={0}
          sx={{
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            overflow: 'hidden'
          }}
        >
          <Box p={3}>
            <Typography 
              variant="h5" 
              sx={{
                mb: 0,
                p: '1rem 1.5rem',
                bgcolor: '#f8f9fa',
                borderBottom: '1px solid #e7eaf3',
                fontSize: '1.25rem',
                color: '#1e2022',
                textAlign: 'center'
              }}
            >
              Wallet Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              {/* Overview Section */}
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={0}
                  sx={{
                    p: 3,
                    border: '1px solid #e7eaf3',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, color: '#1e2022' }}>
                    Overview
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ETH BALANCE
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#1e2022' }}>
                        {walletData.balance} ETH
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        ETH VALUE
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#1e2022' }}>
                        ${formatEthValue(walletData.balance)} 
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          (@ ${formatEthPrice(marketData?.price)}/ETH)
                        </Typography>
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        TOKEN BALANCE
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#1e2022' }}>
                        {walletData.tokenBalance || '0'} TOKENS
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        TOKEN VALUE
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#1e2022' }}>
                        ${walletData.tokenValue || '0'} 
                        <Typography 
                          component="span" 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          (@ ${marketData?.tokenPrice || '0'}/TOKEN)
                        </Typography>
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* More Info Section */}
              <Grid item xs={12} md={8}>
                <Paper 
                  elevation={0}
                  sx={{
                    p: 3,
                    border: '1px solid #e7eaf3',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, color: '#1e2022' }}>
                    More Info
                  </Typography>

                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        PRIVATE NAME TAGS
                      </Typography>
                      <Button
                        startIcon={<AddIcon />}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: '#3498db',
                          borderColor: '#3498db',
                          '&:hover': {
                            borderColor: '#2980b9',
                            bgcolor: 'transparent'
                          }
                        }}
                      >
                        Add
                      </Button>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        TRANSACTIONS SENT
                      </Typography>
                      <Stack direction="row" spacing={4} alignItems="center">
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Latest:
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: '#3498db',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            {formatDate(walletData.lastTransaction)}
                            <ArrowForwardIcon fontSize="small" />
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            First:
                          </Typography>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: '#3498db',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            {formatDate(walletData.firstTransaction)}
                            <ArrowForwardIcon fontSize="small" />
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    {walletData.fundedBy && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          FUNDED BY
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: '#3498db',
                            wordBreak: 'break-all'
                          }}
                        >
                          {walletData.fundedBy}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* Transactions Section with Tabs */}
      {walletData?.recentTransactions && (
        <Paper 
          elevation={0}
          sx={{
            border: '1px solid #e7eaf3',
            borderRadius: 2,
            overflow: 'hidden',
            mt: 4
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

          {/* Transactions Tab Content */}
          {activeTab === 0 && (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Hash</TableCell>
                    <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>From</TableCell>
                    <TableCell align="center" sx={{ color: '#77838f', fontWeight: 500 }}>Type</TableCell>
                    <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>To</TableCell>
                    <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Value</TableCell>
                    <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {walletData.recentTransactions.length > 0 ? (
                    walletData.recentTransactions.map((tx) => (
                      <TableRow 
                        key={`${tx.hash}-${tx.timestamp}`}
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}
                            >
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#3498db',
                                  '&:hover': { color: '#2980b9' }
                                }}
                              >
                                {tx.hash.substring(0, 16)}...
                              </Typography>
                              <OpenInNewIcon sx={{ fontSize: 16, color: '#77838f' }} />
                            </Link>
                            <Tooltip title="Copy hash">
                              <IconButton 
                                size="small"
                                onClick={() => handleCopy(tx.hash)}
                                sx={{ 
                                  ml: 1,
                                  color: '#77838f',
                                  '&:hover': { color: '#3498db' }
                                }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%'
                          }}>
                            <Link
                              href={getEtherscanLink('address', tx.from)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textDecoration: 'none',
                                color: '#3498db',
                                '&:hover': { color: '#2980b9' },
                                maxWidth: 'calc(100% - 40px)', // Leave space for the copy button
                              }}
                            >
                              <Typography 
                                variant="body2"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {tx.from}
                              </Typography>
                            </Link>
                            <Tooltip title="Copy address">
                              <IconButton 
                                size="small"
                                onClick={() => handleCopy(tx.from)}
                                sx={{ 
                                  color: '#77838f',
                                  '&:hover': { color: '#3498db' },
                                  ml: 1
                                }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%'
                          }}>
                            <Link
                              href={getEtherscanLink('address', tx.to)}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textDecoration: 'none',
                                color: '#3498db',
                                '&:hover': { color: '#2980b9' },
                                maxWidth: 'calc(100% - 40px)', // Leave space for the copy button
                              }}
                            >
                              <Typography 
                                variant="body2"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {tx.to}
                              </Typography>
                            </Link>
                            <Tooltip title="Copy address">
                              <IconButton 
                                size="small"
                                onClick={() => handleCopy(tx.to)}
                                sx={{ 
                                  color: '#77838f',
                                  '&:hover': { color: '#3498db' },
                                  ml: 1
                                }}
                              >
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {tx.value} ETH
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(tx.timestamp)}
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
      )}

      {/* Contract History Section */}
      {walletData?.contracts && walletData.contracts.length > 0 && (
        <Paper 
          elevation={0}
          sx={{
            border: '1px solid #e7eaf3',
            borderRadius: 2,
            overflow: 'hidden',
            mt: 4
          }}
        >
          <Box sx={{ borderBottom: '1px solid #e7eaf3', p: 3 }}>
            <Typography variant="h6" sx={{ color: '#1e2022' }}>
              Contract History
            </Typography>
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                  <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Contract Address</TableCell>
                  <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Status</TableCell>
                  <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Vulnerabilities</TableCell>
                  <TableCell sx={{ color: '#77838f', fontWeight: 500 }}>Last Analyzed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {walletData.contracts.map((contract, index) => (
                  <TableRow 
                    key={`${contract.address}-${index}`}
                    sx={{ 
                      '&:hover': { 
                        bgcolor: '#f8f9fa' 
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                          href={getEtherscanLink('address', contract.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#3498db',
                              '&:hover': { color: '#2980b9' }
                            }}
                          >
                            {contract.address.substring(0, 16)}...
                          </Typography>
                          <OpenInNewIcon sx={{ fontSize: 16, color: '#77838f' }} />
                        </Link>
                        <Tooltip title="Copy address">
                          <IconButton 
                            size="small"
                            onClick={() => handleCopy(contract.address)}
                            sx={{ 
                              ml: 1,
                              color: '#77838f',
                              '&:hover': { color: '#3498db' }
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={getStatusIcon(contract.status)}
                        label={contract.status}
                        size="small"
                        color={getStatusColor(contract.status)}
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {contract.vulnerabilities?.map((vuln, index) => (
                          <Chip
                            key={`${contract.address}-vuln-${index}`}
                            label={`${vuln.severity} (${vuln.count})`}
                            size="small"
                            color={getSeverityColor(vuln.severity)}
                            sx={{ fontWeight: 500 }}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(contract.lastAnalyzed)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
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