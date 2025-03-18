import { useState } from "react"
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
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import LanguageIcon from "@mui/icons-material/Language"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import Dashboard from "./Dashboard"

function NavBar({ onSearch }) {
  const [searchValue, setSearchValue] = useState("")
  const [filter, setFilter] = useState("all")
  const [showDashboard, setShowDashboard] = useState(false)
  const [files, setFiles] = useState([])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (searchValue.trim()) {
      onSearch(searchValue.trim())
    }
  }

  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files)
    setFiles(uploadedFiles)
    setShowDashboard(true)
  }

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid #e7eaf3",
          boxShadow: "none",
        }}
      >
        {/* Top Navigation */}
        <Container maxWidth={false} sx={{ maxWidth: "1400px !important" }}>
          <Toolbar sx={{ py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <img src="/swinburne_logo.png" alt="Logo" style={{ height: "32px" }} />
              <Typography
                variant="h6"
                sx={{
                  color: "#1e2022",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                }}
              >
                Assignment 01
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={2}
              sx={{
                ml: "auto",
                alignItems: "center",
              }}
            >
              <Button
                variant="outlined"
                startIcon={<LanguageIcon />}
                sx={{
                  color: "#77838f",
                  borderColor: "#e7eaf3",
                  "&:hover": {
                    borderColor: "#3498db",
                    bgcolor: "transparent",
                  },
                }}
              >
                EN
              </Button>

              <Button
                variant="outlined"
                startIcon={<HelpOutlineIcon />}
                sx={{
                  color: "#77838f",
                  borderColor: "#e7eaf3",
                  "&:hover": {
                    borderColor: "#3498db",
                    bgcolor: "transparent",
                  },
                }}
              >
                Help
              </Button>

              <Button
                variant="contained"
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  bgcolor: "#3498db",
                  "&:hover": {
                    bgcolor: "#2980b9",
                  },
                }}
              >
                Connect Wallet
              </Button>
            </Stack>
          </Toolbar>
        </Container>

        <Divider />

        {/* Search Bar */}
        <Container maxWidth={false} sx={{ maxWidth: "1400px !important" }}>
          <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                width: "100%",
                maxWidth: 800,
                mx: "auto",
                display: "flex",
                gap: 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FormControl
                sx={{
                  minWidth: 120,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#fff",
                    borderRight: "1px solid #e7eaf3",
                  },
                }}
              >
                <Select value={filter} onChange={(e) => setFilter(e.target.value)} size="small">
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
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#fff",
                  },
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

              {/* File Upload Button */}
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={{
                  bgcolor: "#3498db",
                  "&:hover": {
                    bgcolor: "#2980b9",
                  },
                }}
              >
                Upload
                <input type="file" hidden multiple onChange={handleFileUpload} accept=".sol,.json" />
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Smart Contract Analysis Dashboard */}
      {showDashboard && (
        <Box sx={{ mt: 2 }}>
          <Dashboard files={files} />
        </Box>
      )}
    </>
  )
}

export default NavBar
