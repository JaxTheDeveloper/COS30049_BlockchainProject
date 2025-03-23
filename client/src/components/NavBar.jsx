import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  TextField,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  Box,
  FormControl,
  Container,
  Button,
  Typography,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LanguageIcon from '@mui/icons-material/Language';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CodeIcon from '@mui/icons-material/Code';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';

function NavBar({ onSearch, onContractAnalysisComplete }) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState('all');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [contractName, setContractName] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [uploadTab, setUploadTab] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      const cleanAddress = searchValue.trim().toLowerCase();
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
        // If not a valid address, show error in the search field
        setSearchValue('');
        return;
      }
      
      onSearch(cleanAddress);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.sol')) {
      setSelectedFile(file);
    } else {
      setSnackbar({
        open: true,
        message: 'Please select a valid Solidity (.sol) file',
        severity: 'error'
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setUploadTab(newValue);
    setSelectedFile(null);
    setContractAddress('');
  };

  const handleUploadContract = async () => {
    if (!contractName.trim()) {
      setSnackbar({
        open: true,
        message: 'Contract name is required',
        severity: 'error'
      });
      return;
    }

    if (uploadTab === 0 && !selectedFile) {
      setSnackbar({
        open: true,
        message: 'Please select a file to upload',
        severity: 'error'
      });
      return;
    }

    if (uploadTab === 1 && !contractAddress.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a contract address',
        severity: 'error'
      });
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('name', contractName);

      if (uploadTab === 0) {
        formData.append('contract', selectedFile);
      } else {
        formData.append('address', contractAddress.trim());
      }

      const response = await fetch('http://localhost:5000/api/upload-contract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload contract');
      }

      setSnackbar({
        open: true,
        message: `Contract uploaded successfully! ID: ${data.contractId}`,
        severity: 'success'
      });
      
      if (onContractAnalysisComplete && data.contractId) {
        onContractAnalysisComplete(data.contractId);
        navigate(`/contract/${data.contractId}`);
      }
      
      setOpenUploadDialog(false);
      setContractName('');
      setContractAddress('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error uploading contract',
        severity: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <AppBar 
      position="sticky" 
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid #e7eaf3',
        boxShadow: 'none'
      }}
    >
      {/* Top Navigation */}
      <Container maxWidth={false} sx={{ maxWidth: '1400px !important' }}>
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img 
              src="/swinburne_logo.png" 
              alt="Logo" 
              style={{ height: '32px' }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#1e2022',
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              Assignment 02
            </Typography>
          </Box>

          <Stack 
            direction="row" 
            spacing={2} 
            sx={{ 
              ml: 'auto',
              alignItems: 'center'
            }}
          >
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/history')}
              sx={{
                color: '#77838f',
                borderColor: '#e7eaf3',
                '&:hover': {
                  borderColor: '#3498db',
                  bgcolor: 'transparent'
                }
              }}
            >
              Contract History
            </Button>

            <Button
              variant="outlined"
              startIcon={<LanguageIcon />}
              sx={{
                color: '#77838f',
                borderColor: '#e7eaf3',
                '&:hover': {
                  borderColor: '#3498db',
                  bgcolor: 'transparent'
                }
              }}
            >
              EN
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<HelpOutlineIcon />}
              sx={{
                color: '#77838f',
                borderColor: '#e7eaf3',
                '&:hover': {
                  borderColor: '#3498db',
                  bgcolor: 'transparent'
                }
              }}
            >
              Help
            </Button>

            <Button
              variant="contained"
              startIcon={<AccountBalanceWalletIcon />}
              sx={{
                bgcolor: '#3498db',
                '&:hover': {
                  bgcolor: '#2980b9'
                }
              }}
            >
              Connect Wallet
            </Button>
          </Stack>
        </Toolbar>
      </Container>

      <Divider />

      {/* Search Bar */}
      <Container maxWidth={false} sx={{ maxWidth: '1400px !important' }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              width: '100%',
              maxWidth: 800,
              mx: 'auto',
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FormControl 
              sx={{ 
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#fff',
                  borderRight: '1px solid #e7eaf3'
                }
              }}
            >
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                size="small"
              >
                <MenuItem value="all">All Filters</MenuItem>
                <MenuItem value="addresses">Addresses</MenuItem>
                <MenuItem value="tokens">Tokens</MenuItem>
                <MenuItem value="blocks">Blocks</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              size="small"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by Address / Txn Hash / Block / Token"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#fff'
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<CodeIcon />}
              onClick={() => setOpenUploadDialog(true)}
              sx={{
                whiteSpace: 'nowrap',
                minWidth: 'auto',
                px: 2
              }}
            >
              Analyze Contract
            </Button>
          </Box>
        </Toolbar>
      </Container>

      {/* Upload Contract Dialog */}
      <Dialog 
        open={openUploadDialog} 
        onClose={() => !uploading && setOpenUploadDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(119, 131, 143, 0.1)'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            borderBottom: '1px solid #e7eaf3',
            px: 3,
            py: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#1e2022',
            textAlign: 'center',
            position: 'relative',
            mb: 0
          }}
        >
          <IconButton
            aria-label="close"
            onClick={() => !uploading && setOpenUploadDialog(false)}
            disabled={uploading}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#77838f',
              '&:hover': {
                color: '#3498db',
                bgcolor: 'transparent'
              },
              '&.Mui-disabled': {
                color: '#c0c6cc'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          Upload Smart Contract for Analysis
        </DialogTitle>

        <Box sx={{ 
          px: 3, 
          bgcolor: '#f8f9fa',
          borderBottom: '1px solid #e7eaf3'
        }}>
          <Tabs 
            value={uploadTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                py: 2,
                color: '#77838f',
                fontSize: '0.95rem',
                textTransform: 'none',
                '&.Mui-selected': {
                  color: '#3498db',
                  fontWeight: 500
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '1.25rem',
                  mr: 1
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3498db',
                height: '3px',
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab 
              label="Upload File" 
              icon={<UploadFileIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Contract Address" 
              icon={<AccountBalanceWalletIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ px: 3, py: 3, bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mb: 1.5,
                  color: '#1e2022',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                Contract Name
              </Typography>
              <MuiTextField
                fullWidth
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="Enter contract name"
                required
                disabled={uploading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3498db',
                    }
                  }
                }}
              />
            </Box>

            {uploadTab === 0 && (
              <Box>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    mb: 1.5,
                    color: '#1e2022',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <UploadFileIcon sx={{ color: '#3498db', fontSize: 20 }} />
                  Upload Solidity Contract File
                </Typography>
                <input
                  accept=".sol"
                  style={{ display: 'none' }}
                  id="contract-file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <label htmlFor="contract-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadFileIcon sx={{ color: '#3498db' }} />}
                    disabled={uploading}
                    fullWidth
                    sx={{
                      color: '#3498db',
                      borderColor: '#3498db',
                      bgcolor: 'rgba(52, 152, 219, 0.05)',
                      '&:hover': {
                        borderColor: '#2980b9',
                        bgcolor: 'rgba(52, 152, 219, 0.1)',
                        color: '#2980b9'
                      },
                      py: 1.5,
                      fontWeight: 500
                    }}
                  >
                    Select Solidity File
                  </Button>
                </label>
                {selectedFile && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 1.5,
                      color: '#77838f',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <UploadFileIcon sx={{ fontSize: 20 }} />
                    {selectedFile.name}
                  </Typography>
                )}
              </Box>
            )}

            {uploadTab === 1 && (
              <Box>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    mb: 1.5,
                    color: '#1e2022',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <AccountBalanceWalletIcon sx={{ color: '#3498db', fontSize: 20 }} />
                  Enter Contract Address
                </Typography>
                <MuiTextField
                  fullWidth
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  disabled={uploading}
                  helperText="Enter the deployed contract address"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fff',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3498db',
                      }
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: 3, 
          py: 2,
          borderTop: '1px solid #e7eaf3',
          bgcolor: '#fff'
        }}>
          <Button 
            onClick={() => setOpenUploadDialog(false)} 
            disabled={uploading}
            sx={{
              color: '#77838f',
              '&:hover': {
                bgcolor: 'transparent',
                color: '#3498db'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUploadContract} 
            variant="contained" 
            color="primary"
            disabled={uploading || (uploadTab === 0 && !selectedFile) || (uploadTab === 1 && !contractAddress.trim())}
            startIcon={uploading ? <CircularProgress size={20} /> : null}
            sx={{
              bgcolor: '#3498db',
              '&:hover': {
                bgcolor: '#2980b9'
              },
              '&.Mui-disabled': {
                bgcolor: '#e7eaf3',
                color: '#77838f'
              }
            }}
          >
            {uploading ? 'Uploading...' : 'Upload & Analyze'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppBar>
  );
}

export default NavBar;
