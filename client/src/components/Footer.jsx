import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Link
} from '@mui/material';

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: '1px solid #e7eaf3',
        width: '100%'
      }}
    >
      <Container 
        maxWidth={false}
        sx={{ 
          maxWidth: '1400px !important',
          mx: 'auto'
        }}
      >
        <Grid 
          container 
          spacing={4} 
          justifyContent="center"
          sx={{
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          <Grid item xs={12} sm={6} md={4}>
            <Typography 
              variant="h6" 
              sx={{
                color: '#1e2022',
                fontWeight: 600,
                mb: 2,
                fontSize: '1.1rem'
              }}
            >
              Blockchain Explorer
            </Typography>
            <Typography 
              variant="body2" 
              sx={{
                color: '#77838f',
                fontSize: '0.9rem'
              }}
            >
              © 2024 Blockchain Explorer
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography 
              variant="h6" 
              sx={{
                color: '#1e2022',
                fontWeight: 600,
                mb: 2,
                fontSize: '1.1rem'
              }}
            >
              Resources
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link 
                href="#" 
                sx={{
                  color: '#77838f',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    color: '#3498db',
                    textDecoration: 'none'
                  }
                }}
              >
                API Documentation
              </Link>
              <Link 
                href="#" 
                sx={{
                  color: '#77838f',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  '&:hover': {
                    color: '#3498db',
                    textDecoration: 'none'
                  }
                }}
              >
                Help Center
              </Link>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Footer;
