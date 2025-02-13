// import modules
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const neo4j = require('neo4j-driver');
const axios = require('axios');

dotenv.config();

// Clean up environment variables by removing quotes and spaces
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY?.replace(/["'\s]/g, '') || '';
const DB_URI = process.env.DB_URI?.replace(/["'\s]/g, '') || '';
const DB_USER = process.env.DB_USER?.replace(/["'\s]/g, '') || '';
const DB_PASSWORD = process.env.DB_PASSWORD?.replace(/["'\s]/g, '') || '';
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

// enable CORS and JSON parsing
app.use(express.json());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Set up Neo4j driver
const driverGetter = async () => {
    try {
        const driver = neo4j.driver(DB_URI, neo4j.auth.basic(DB_USER, DB_PASSWORD));
        await driver.verifyConnectivity();
        console.log('Neo4j Connection established');
        return driver;
    } catch(err) {
        console.error('Neo4j Connection error:', err);
        throw err;
    }
};

// Initialize driver
let driver;
(async () => {
    try {
        driver = await driverGetter();
    } catch (error) {
        console.error('Failed to initialize Neo4j driver:', error);
        process.exit(1); // Exit if we can't connect to the database
    }
})();

// Helper function to fetch wallet data from Etherscan
async function getEtherscanData(address) {
    try {
        // Get balance with retry mechanism
        let balanceResponse;
        let retries = 3;
        while (retries > 0) {
            try {
                balanceResponse = await axios.get(ETHERSCAN_API_URL, {
                    params: {
                        module: 'account',
                        action: 'balance',
                        address: address,
                        tag: 'latest',
                        apikey: ETHERSCAN_API_KEY
                    },
                    timeout: 5000 // 5 second timeout
                });
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }

        // Get transactions with retry mechanism
        let txListResponse;
        retries = 3;
        while (retries > 0) {
            try {
                txListResponse = await axios.get(ETHERSCAN_API_URL, {
                    params: {
                        module: 'account',
                        action: 'txlist',
                        address: address,
                        startblock: 0,
                        endblock: 99999999,
                        page: 1,
                        offset: 10,
                        sort: 'desc',
                        apikey: ETHERSCAN_API_KEY
                    },
                    timeout: 5000
                });
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Handle API errors
        if (balanceResponse.data.message === 'NOTOK' || txListResponse.data.message === 'NOTOK') {
            throw new Error('Etherscan API rate limit exceeded. Please try again later.');
        }

        // Process balance
        const balance = balanceResponse.data.result
            ? (parseFloat(balanceResponse.data.result) / 1e18).toFixed(6)
            : '0.000000';

        // Process transactions
        const transactions = txListResponse.data.result && Array.isArray(txListResponse.data.result)
            ? txListResponse.data.result.map(tx => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: (parseFloat(tx.value) / 1e18).toFixed(6),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                gasPrice: tx.gasPrice,
                gasUsed: tx.gasUsed,
                isError: tx.isError === '1'
            }))
            : [];

        return {
            address,
            balance,
            transactionCount: transactions.length,
            recentTransactions: transactions
        };

    } catch (error) {
        console.error('Etherscan API Error:', error.message);
        throw new Error(`Failed to fetch wallet data: ${error.message}`);
    }
}

// Add this function to fetch market data
async function getMarketData() {
    try {
        // Fetch ETH price and market data from CoinGecko
        const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
            params: {
                ids: 'ethereum',
                vs_currencies: 'usd',
                include_market_cap: true,
                include_24hr_vol: true,
                include_last_updated_at: true
            }
        });

        const ethData = response.data.ethereum;

        // Fetch total transactions from Etherscan
        const txCountResponse = await axios.get(ETHERSCAN_API_URL, {
            params: {
                module: 'proxy',
                action: 'eth_blockNumber',
                apikey: ETHERSCAN_API_KEY
            }
        });

        const blockNumber = parseInt(txCountResponse.data.result, 16);

        return {
            price: ethData.usd.toFixed(2),
            marketCap: (ethData.usd_market_cap / 1e9).toFixed(1), // Convert to billions
            transactions: '1,234.56 M', // This is a placeholder, as real-time tx count requires premium API
            lastBlock: blockNumber,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error fetching market data:', error);
        throw error;
    }
}

// API endpoint for wallet information
app.get("/api/wallet/:address", async (req, res) => {
    const { address } = req.params;
    
    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ 
            error: 'Invalid Ethereum address format'
        });
    }
    
    try {
        if (!driver) {
            throw new Error('Database connection not available');
        }

        // Get wallet data from Etherscan
        const walletData = await getEtherscanData(address);
        
        // Store in Neo4j
        const session = driver.session();
        try {
            // Store wallet data
            await session.run(
                `MERGE (w:Wallet {address: $address})
                 SET w.balance = $balance,
                     w.transactionCount = $transactionCount,
                     w.lastUpdated = datetime()`,
                {
                    address: walletData.address,
                    balance: walletData.balance,
                    transactionCount: walletData.transactionCount
                }
            );

            // Store transactions
            if (walletData.recentTransactions.length > 0) {
                for (const tx of walletData.recentTransactions) {
                    await session.run(
                        `MATCH (w:Wallet {address: $address})
                         MERGE (tx:Transaction {hash: $hash})
                         SET tx.from = $from,
                             tx.to = $to,
                             tx.value = $value,
                             tx.timestamp = $timestamp,
                             tx.gasPrice = $gasPrice,
                             tx.gasUsed = $gasUsed,
                             tx.isError = $isError
                         MERGE (w)-[:HAS_TRANSACTION]->(tx)`,
                        {
                            address: walletData.address,
                            ...tx
                        }
                    );
                }
            }

            // Send response
            res.json({
                ...walletData,
                lastUpdated: new Date().toISOString()
            });

        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || 'Internal server error'
        });
    }
});

// Add this endpoint to get market data
app.get("/api/market-data", async (req, res) => {
    try {
        const session = driver.session();
        try {
            // Try to get cached data first
            const result = await session.run(
                `MATCH (m:MarketData)
                 RETURN m
                 ORDER BY m.lastUpdated DESC
                 LIMIT 1`
            );

            let marketData;
            const now = new Date();
            const cachedData = result.records[0]?.get('m')?.properties;

            // If no cached data or cache is older than 5 minutes, fetch new data
            if (!cachedData || now - new Date(cachedData.lastUpdated) > 5 * 60 * 1000) {
                marketData = await getMarketData();

                // Store new data in Neo4j
                await session.run(
                    `CREATE (m:MarketData {
                        price: $price,
                        marketCap: $marketCap,
                        transactions: $transactions,
                        lastBlock: $lastBlock,
                        lastUpdated: datetime()
                    })`,
                    marketData
                );
            } else {
                marketData = cachedData;
            }

            res.json(marketData);
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch market data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});