import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LanguageIcon from '@mui/icons-material/Language';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CodeIcon from '@mui/icons-material/Code';

function NavBar({ onSearch }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
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

  const handleUploadContract = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: 'Please select a file to upload',
        severity: 'error'
      });
      return;
    }

    if (!contractName.trim()) {
      setSnackbar({
        open: true,
        message: 'Contract name is required',
        severity: 'error'
      });
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('contract', selectedFile);
      formData.append('name', contractName);
      if (contractAddress.trim()) {
        formData.append('address', contractAddress);
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
      
      // Reset form
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
            
            {/* Upload Contract Button */}
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
      >
        <DialogTitle>Upload Smart Contract for Analysis</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <MuiTextField
              label="Contract Name"
              fullWidth
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              required
              disabled={uploading}
            />
            
            <MuiTextField
              label="Contract Address (Optional)"
              fullWidth
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              disabled={uploading}
            />
            
            <Box sx={{ mt: 1 }}>
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
                  startIcon={<UploadFileIcon />}
                  disabled={uploading}
                >
                  Select Solidity File
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected: {selectedFile.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenUploadDialog(false)} 
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUploadContract} 
            variant="contained" 
            color="primary"
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : null}
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
