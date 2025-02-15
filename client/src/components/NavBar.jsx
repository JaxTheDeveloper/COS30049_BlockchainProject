import React, { useState } from 'react';
import { 
  AppBar,
  Toolbar,
  TextField,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Box,
  FormControl
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

function NavBar({ onSearch }) {
  const [searchValue, setSearchValue] = useState('');
  const [filter, setFilter] = useState('all');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      console.log('Submitting search for:', searchValue);
      onSearch(searchValue.trim());
    }
  };

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            width: '100%',
            maxWidth: 800,
            margin: '0 auto',
            display: 'flex',
            gap: 1
          }}
        >
          <FormControl sx={{ minWidth: 120 }}>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
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
            sx={{ bgcolor: 'background.paper' }}
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
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
