import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Grid 
} from '@mui/material';

function Footer() {
  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'grey.50',
        py: 3,
        borderTop: 1,
        borderColor: 'grey.200'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" gutterBottom>
              Blockchain Explorer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              © 2024 Blockchain Explorer
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" gutterBottom>
              Resources
            </Typography>
            <Box>
              <Link href="#" color="inherit" sx={{ display: 'block', mb: 1 }}>
                API Documentation
              </Link>
              <Link href="#" color="inherit" sx={{ display: 'block' }}>
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
