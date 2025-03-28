import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Stack,
  TablePagination,
  Container,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

function ContractHistory() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [metrics, setMetrics] = useState({
    totalContracts: 0,
    totalVulnerabilities: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    analyzed: 0,
    pending: 0
  });

  // Add polling interval state
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    // Initial load
    loadContractHistory();

    // Set up polling every 5 seconds
    const interval = setInterval(() => {
      loadContractHistory(false); // Pass false to indicate this is a background refresh
    }, 5000);

    setPollingInterval(interval);

    // Cleanup polling on component unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const loadContractHistory = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await fetch('http://localhost:5000/api/contracts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contract history');
      }

      setContracts(data);
      
      // Calculate metrics
      const newMetrics = {
        totalContracts: data.length,
        totalVulnerabilities: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        analyzed: 0,
        pending: 0
      };

      data.forEach(contract => {
        if (contract.vulnerabilities) {
          newMetrics.totalVulnerabilities += contract.vulnerabilities.total;
          newMetrics.highSeverity += contract.vulnerabilities.high;
          newMetrics.mediumSeverity += contract.vulnerabilities.medium;
          newMetrics.lowSeverity += contract.vulnerabilities.low;
        }
        if (contract.status === 'completed') {
          newMetrics.analyzed++;
        } else {
          newMetrics.pending++;
        }
      });

      setMetrics(newMetrics);
    } catch (err) {
      console.error('Error loading contract history:', err);
      setError(err.message || 'Error loading contract history');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

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

  const formatVulnerabilityCount = (vulnerabilities) => {
    if (!vulnerabilities) return [];
    
    const counts = {
      high: vulnerabilities.high || 0,
      medium: vulnerabilities.medium || 0,
      low: vulnerabilities.low || 0
    };

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([severity, count]) => ({
        severity: severity.charAt(0).toUpperCase() + severity.slice(1),
        count
      }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ color: '#1e2022', fontWeight: 600, mb: 1 }}>
          Contract History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and analyze your uploaded smart contracts
        </Typography>
      </Box>

      {/* Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Contracts
            </Typography>
            <Typography variant="h4" sx={{ color: '#1e2022', fontWeight: 600 }}>
              {metrics.totalContracts}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total Vulnerabilities
            </Typography>
            <Typography variant="h4" sx={{ color: '#1e2022', fontWeight: 600 }}>
              {metrics.totalVulnerabilities}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              High Severity Issues
            </Typography>
            <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 600 }}>
              {metrics.highSeverity}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            height: '100%', 
            p: 3,
            borderRadius: 2,
            border: '1px solid #e7eaf3',
            bgcolor: '#fff',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Analysis Status
            </Typography>
            <Typography variant="h4" sx={{ color: '#1e2022', fontWeight: 600 }}>
              {metrics.analyzed}/{metrics.totalContracts}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Contracts Table */}
      <TableContainer component={Paper} sx={{ 
        borderRadius: 2,
        border: '1px solid #e7eaf3',
        overflow: 'hidden'
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8f9fa' }}>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022', width: '70px' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Contract Name</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Upload Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Vulnerabilities</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#1e2022', width: '150px', bgcolor: '#e6f7ff' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((contract) => (
                <TableRow 
                  key={contract.id}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: '#f8f9fa',
                      '& .action-button': {
                        opacity: 1
                      }
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#77838f', fontFamily: 'monospace' }}>
                      {contract.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e2022' }}>
                      {contract.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(contract.upload_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(contract.status)}
                      label={contract.status}
                      color={getStatusColor(contract.status)}
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        '& .MuiChip-icon': { 
                          fontSize: 16,
                          mr: 0.5 
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {formatVulnerabilityCount(contract.vulnerabilities).map((vuln, index) => (
                        <Chip
                          key={`${contract.id}-${vuln.severity}`}
                          icon={<SecurityIcon sx={{ fontSize: 16 }} />}
                          label={`${vuln.severity} (${vuln.count})`}
                          color={getSeverityColor(vuln.severity)}
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            '& .MuiChip-icon': { mr: 0.5 }
                          }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        whiteSpace: 'pre-wrap',
                        bgcolor: '#f8f9fa',
                        p: 1,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        color: '#1e2022',
                        border: '1px solid #e7eaf3'
                      }}
                    >
                      {contract.description}
                    </Typography>
                    {contract.affectedLines && (
                      <Box sx={{ mt: 2 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#77838f',
                            mb: 0.5,
                            fontWeight: 500 
                          }}
                        >
                          Affected Code Location:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                            whiteSpace: 'pre',
                            bgcolor: '#f8f9fa',
                            p: 1,
                            borderRadius: 1,
                            fontSize: '0.875rem',
                            color: '#1e2022',
                            border: '1px solid #e7eaf3'
                          }}
                        >
                          Lines: {contract.affectedLines}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#f0f9ff', padding: '16px', border: '1px solid #e1e4e8' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="medium"
                      fullWidth
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(`/contract/${contract.id}`)}
                      disabled={contract.status !== 'completed'}
                      sx={{
                        fontWeight: 600,
                        borderRadius: 1,
                        textTransform: 'none',
                        padding: '8px 16px',
                        boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11)',
                        mb: 1
                      }}
                    >
                      View Report
                    </Button>
                    {contract.status === 'failed' && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="medium"
                        fullWidth
                        onClick={() => {
                          fetch(`http://localhost:5000/api/contract/${contract.id}/reset`, {
                            method: 'POST'
                          })
                          .then(() => loadContractHistory())
                          .catch(err => console.error('Failed to reset analysis:', err));
                        }}
                        sx={{
                          fontWeight: 500,
                          borderRadius: 1,
                          textTransform: 'none'
                        }}
                      >
                        Retry Analysis
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #e7eaf3',
          bgcolor: '#fff'
        }}>
          <TablePagination
            component="div"
            count={contracts.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              '.MuiTablePagination-select': {
                borderRadius: 1,
                '&:focus': {
                  bgcolor: 'transparent'
                }
              },
              '.MuiTablePagination-selectIcon': {
                color: '#77838f'
              }
            }}
          />
        </Box>
      </TableContainer>
    </Container>
  );
}

export default ContractHistory; 