// import modules
const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const { toInteger } = neo4j.int; // Import toInteger function from neo4j.int
const axios = require("axios");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const util = require("util");
const execPromise = util.promisify(exec);
const crypto = require("crypto");
const NodeCache = require("node-cache");
const os = require('os');
// i dont know
// config dotenv
dotenv.config();

// get etherscan api key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_API_URL = "https://api.etherscan.io/api";

// get coingecko api url
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

// Use disk storage instead of memory storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename to remove spaces and special characters
        const sanitizedFilename = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        cb(null, Date.now() + "-" + sanitizedFilename);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept only Solidity files
        if (path.extname(file.originalname) !== ".sol") {
            return cb(new Error("Only Solidity (.sol) files are allowed"));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
});

// enable cross-origin resource sharing
app.use(cors());
app.use(express.json());

console.log("======ATTEPTING DB CONNECTIONS======");
// Set up Neo4j driver
const neo4jDriverGetter = async () => {
    // URI examples: 'neo4j://localhost', 'neo4j+s://xxx.databases.neo4j.io'
    const URI = process.env.DB_URI;
    const USER = process.env.DB_USER;
    const PASSWORD = process.env.DB_PASSWORD;
    let neo4jDriver;
    try {
        neo4jDriver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
        const serverInfo = await neo4jDriver.getServerInfo();
        await neo4jDriver.verifyConnectivity();
        console.log("Neo4js Connection established");
        console.log(serverInfo);
        return neo4jDriver;
    } catch (err) {
        console.log(`Connection error\n${err}\nCause: ${err.cause}`);
    }
};

let neo4jDriver;
(async () => {
    try {
        neo4jDriver = await neo4jDriverGetter();
    } catch (error) {
        console.error("Failed to initialize Neo4j driver:", error);
        process.exit(1); // exit if we can't connect to the database
    }
})();

var mysqlPool = mysql.createPool({
    connectionLimit: 100, //important, may increase later
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    debug: false,
});

// Initialize MySQL tables if they don't exist
async function initializeMySQLTables() {
    try {
        // Create contracts table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS contracts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address VARCHAR(42),
                filename VARCHAR(255) NOT NULL,
                filepath VARCHAR(255) NOT NULL,
                contract_hashcode VARCHAR(64),
                status ENUM('pending', 'analyzing', 'completed', 'failed') DEFAULT 'pending',
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create analysis_reports table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS analysis_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contract_id INT NOT NULL,
                report_json LONGTEXT NOT NULL,
                vulnerability_count INT DEFAULT 0,
                high_severity_count INT DEFAULT 0,
                medium_severity_count INT DEFAULT 0,
                low_severity_count INT DEFAULT 0,
                completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
            )
        `);

        // Create upload_history table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS upload_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contract_hash VARCHAR(64) NOT NULL,
                upload_date TIMESTAMP
            )
        `);

        // Create AI recommendations table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT NOT NULL,
                contract_id INT NOT NULL,
                recommendation TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (report_id) REFERENCES analysis_reports(id) ON DELETE CASCADE,
                FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
            )
        `);

        console.log("MySQL tables initialized successfully");
    } catch (err) {
        console.error("Error initializing MySQL tables:", err);
    }
}

// Check for stuck analyses on server start
async function checkStuckAnalyses() {
    try {
        // Find contracts stuck in 'analyzing' state
        const [stuckContracts] = await mysqlPool.query(
            `SELECT id, filepath FROM contracts WHERE status = 'analyzing'`
        );

        if (stuckContracts.length > 0) {
            console.log(
                `Found ${stuckContracts.length} stuck analyses. Resetting...`
            );

            for (const contract of stuckContracts) {
                console.log(
                    `Resetting analysis for contract ID ${contract.id}`
                );

                // Update status to pending
                await mysqlPool.query(
                    `UPDATE contracts SET status = 'pending' WHERE id = ?`,
                    [contract.id]
                );

                // Start analysis again
                runSlitherAnalysis(contract.id, contract.filepath);
            }
        }
    } catch (error) {
        console.error("Error checking for stuck analyses:", error);
    }
}

// Call this function after initializing MySQL tables
(async () => {
    try {
        await initializeMySQLTables();
        await checkStuckAnalyses();
    } catch (error) {
        console.error(
            "Failed to initialize MySQL tables or check stuck analyses:",
            error
        );
    }
})();

// template mysql interaction function
function handle_database(req, res) {
    mysqlPool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            res.json({ code: 100, status: "Error in connection database" });
            return;
        }

        console.log("Connected to database at thread " + connection.threadId);

        connection.query("show databases", function (err, rows) {
            connection.release();
            if (!err) {
                res.json(rows);
            }
        });

        connection.on("error", function (err) {
            res.json({ code: 100, status: "Error in connection database" });
            return;
        });
    });
}

console.log("======DB CONNECTION COMPLETE======");

// api endpoint definitions

async function getMySQLServerInfo() {
    const query = "select @@hostname";
    const [rows] = await mysqlPool.query(query);
    return rows;
}

app.get("/test-mysql-connection", async (req, res) => {
    const mysqlInfo = await getMySQLServerInfo();
    res.json({ mysqlInfo: mysqlInfo });
    return;
});

app.get("/test-neo4j-connection", async (req, res) => {
    const serverInfo = await neo4jDriver.getServerInfo();
    res.json(serverInfo);
    return;
});

// Add at the top with other constants
const COINGECKO_RATE_LIMIT = 30000; // 30 seconds cooldown between requests
let lastCoinGeckoCall = 0;

// Initialize cache with 5 minutes TTL
const marketDataCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Add this helper function for rate limiting
async function makeRateLimitedRequest(url, params, headers) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCoinGeckoCall;

    if (timeSinceLastCall < COINGECKO_RATE_LIMIT) {
        const waitTime = COINGECKO_RATE_LIMIT - timeSinceLastCall;
        console.log(`Waiting ${waitTime}ms before next CoinGecko API call...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastCoinGeckoCall = Date.now();
    return axios.get(url, { params, headers });
}

async function getMarketData() {
    try {
        console.log("\n=== Market Data Fetch Started ===");

        // Check cache first
        const cachedData = marketDataCache.get("marketData");
        if (cachedData) {
            console.log("✓ Returning cached market data");
            return cachedData;
        }
        console.log("Cache miss, fetching fresh data...");

        let ethData, gasPriceData, priceHistoryData;

        // 1. Fetch basic ETH data from CoinGecko
        try {
            console.log("\n1. Fetching basic ETH data from CoinGecko...");
            const response = await makeRateLimitedRequest(
                `${COINGECKO_API_URL}/simple/price`,
                {
                    ids: "ethereum",
                    vs_currencies: "usd",
                    include_market_cap: true,
                    include_24hr_vol: true,
                    include_24hr_change: true,
                    include_last_updated_at: true,
                },
                {
                    Accept: "application/json",
                    "User-Agent": "Mozilla/5.0",
                }
            );
            ethData = response.data.ethereum;
            console.log("✓ Basic ETH data fetched successfully");
            console.log("  Price:", ethData.usd);
            console.log("  Market Cap:", ethData.usd_market_cap);
            console.log("  24h Volume:", ethData.usd_24h_vol);
        } catch (error) {
            console.error("✗ Failed to fetch basic ETH data:", error.message);
            if (error.response) {
                console.error("  Status:", error.response.status);
                console.error("  Response:", error.response.data);
            }
            throw error;
        }

        // 2. Fetch gas price from Etherscan
        try {
            console.log("\n2. Fetching gas price from Etherscan...");
            const gasPriceResponse = await axios.get(ETHERSCAN_API_URL, {
                params: {
                    module: "gastracker",
                    action: "gasoracle",
                    apikey: ETHERSCAN_API_KEY,
                },
            });
            gasPriceData = gasPriceResponse.data.result;
            console.log("✓ Gas price fetched successfully");
            console.log("  Safe Gas Price:", gasPriceData.SafeGasPrice);
        } catch (error) {
            console.error("✗ Failed to fetch gas price:", error.message);
            console.log("  Continuing with default gas price...");
            gasPriceData = { SafeGasPrice: "0" };
        }

        // 3. Fetch price history from CoinGecko with chunked requests
        try {
            console.log("\n3. Fetching price history from CoinGecko...");

            // Fetch 30 days of data to get a good trend
            const response = await makeRateLimitedRequest(
                `${COINGECKO_API_URL}/coins/ethereum/market_chart`,
                {
                    vs_currency: "usd",
                    days: "30", // Get 30 days of data
                },
                {
                    Accept: "application/json",
                    "User-Agent": "Mozilla/5.0",
                }
            );

            priceHistoryData = response.data;
            console.log("✓ Price history fetched successfully");
            console.log("  Total data points:", priceHistoryData.prices.length);

            // Sample the data to get roughly 24 points for the graph
            const sampledPrices = samplePriceData(priceHistoryData.prices, 24);
            priceHistoryData = { prices: sampledPrices };
        } catch (error) {
            console.error("✗ Failed to fetch price history:", error.message);
            if (error.response) {
                console.error("  Status:", error.response.status);
                console.error("  Response:", error.response.data);
            }
            // Continue with empty price history rather than failing completely
            priceHistoryData = { prices: [] };
        }

        // Process and combine all data
        console.log("\nProcessing and combining data...");
        const marketData = {
            price: ethData.usd.toFixed(2),
            marketCap: (ethData.usd_market_cap / 1e9).toFixed(1),
            priceChange24h: ethData.usd_24h_change?.toFixed(2) || "0.00",
            volume24h: (ethData.usd_24h_vol / 1e6).toFixed(1),
            gasPrice: gasPriceData?.SafeGasPrice || "0",
            priceHistory: priceHistoryData.prices.map(([timestamp, price]) => ({
                timestamp,
                price: price.toFixed(2),
            })),
            transactionHistory: Array.from({ length: 24 }, (_, i) => ({
                timestamp: Date.now() - (23 - i) * 3600000,
                count: Math.floor(Math.random() * 1000000) + 500000,
            })),
            lastUpdated: new Date().toISOString(),
        };

        // Cache the result
        marketDataCache.set("marketData", marketData);
        console.log("✓ Data cached successfully");
        console.log("\n=== Market Data Fetch Completed ===\n");

        return marketData;
    } catch (error) {
        console.error("\n=== Market Data Fetch Failed ===");
        console.error("Error:", error.message);

        // Try to get cached data even if expired
        const cachedData = marketDataCache.get("marketData", true);
        if (cachedData) {
            console.log("✓ Returning expired cached data as fallback");
            return cachedData;
        }

        console.error("✗ No cached data available");
        throw error;
    }
}

// Add this helper function at the top level of the file
function samplePriceData(prices, targetPoints) {
    if (prices.length <= targetPoints) return prices;

    const interval = Math.floor(prices.length / targetPoints);
    const sampledPrices = [];

    for (let i = prices.length - 1; i >= 0; i -= interval) {
        sampledPrices.unshift(prices[i]);
        if (sampledPrices.length >= targetPoints) break;
    }

    return sampledPrices;
}

// Add this endpoint to get market data
app.get("/api/market-data", async (req, res) => {
    try {
        const session = neo4jDriver.session();
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
            const cachedData = result.records[0]?.get("m")?.properties;

            // If no cached data or cache is older than 5 minutes, fetch new data
            if (
                !cachedData ||
                now - new Date(cachedData.lastUpdated) > 5 * 60 * 1000
            ) {
                marketData = await getMarketData();

                // Store new data in Neo4j with correct parameters
                await session.run(
                    `CREATE (m:MarketData {
                        price: $price,
                        marketCap: $marketCap,
                        priceChange24h: $priceChange24h,
                        volume24h: $volume24h,
                        gasPrice: $gasPrice,
                        priceHistory: $priceHistory,
                        transactionHistory: $transactionHistory,
                        lastUpdated: datetime()
                    })`,
                    {
                        price: marketData.price,
                        marketCap: marketData.marketCap,
                        priceChange24h: marketData.priceChange24h,
                        volume24h: marketData.volume24h,
                        gasPrice: marketData.gasPrice,
                        priceHistory: JSON.stringify(marketData.priceHistory),
                        transactionHistory: JSON.stringify(
                            marketData.transactionHistory
                        ),
                    }
                );
            } else {
                // Parse stringified arrays back to objects
                marketData = {
                    ...cachedData,
                    priceHistory: JSON.parse(cachedData.priceHistory || "[]"),
                    transactionHistory: JSON.parse(
                        cachedData.transactionHistory || "[]"
                    ),
                };
            }

            res.json(marketData);
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to fetch market data" });
    }
});

// Add the graph routes directly in server.js
app.get("/api/graph/wallet-graph/:address", async (req, res) => {
    let { address } = req.params;

    console.log("\n=== Wallet Graph Request ===");
    console.log("Address:", address);

    address = address.toLowerCase();

    try {
        if (!neo4jDriver) {
            throw new Error("Database connection not available");
        }

        const session = neo4jDriver.session();
        try {
            // Clean up lonely nodes
            console.log("\n1. Cleaning lonely nodes...");
            const cleanupResult = await session.run(
                `MATCH (a:Address)
                 WHERE NOT (a)-[:HAS_TRANSACTION]-() 
                 AND a.address <> $address
                 DETACH DELETE a
                 RETURN count(a) as deletedCount`,
                { address }
            );
            console.log(
                "Deleted",
                cleanupResult.records[0].get("deletedCount"),
                "lonely nodes"
            );

            // Fetch the graph data
            console.log("\n2. Fetching graph data...");
            const result = await session.run(
                `MATCH (w:Address {address: $address})
                 
                 // Get all transactions and connected addresses
                 OPTIONAL MATCH (w)-[t:HAS_TRANSACTION]-(other:Address)
                 
                 WITH w,
                      COLLECT(DISTINCT other) as others,
                      COLLECT(DISTINCT t) as txs
                 
                 RETURN {
                     nodes: [{
                         id: w.address,
                         balance: w.balance,
                         transactionCount: w.transactionCount
                     }] + 
                     [other IN others | {
                         id: other.address,
                         balance: other.balance,
                         transactionCount: other.transactionCount
                     }],
                     edges: [tx IN txs | {
                         source: startNode(tx).address,
                         target: endNode(tx).address,
                         hash: tx.hash,
                         value: tx.value,
                         timeStamp: tx.timeStamp,
                         gasPrice: tx.gasPrice,
                         gasUsed: tx.gasUsed,
                         blockNumber: tx.blockNumber,
                         functionName: tx.functionName
                     }]
                 } as graph`,
                { address }
            );

            if (result.records.length === 0) {
                console.log("No data found for address");
                return res.json({
                    nodes: [
                        {
                            id: address,
                            balance: "0",
                            transactionCount: 0,
                        },
                    ],
                    edges: [],
                });
            }

            const graphData = result.records[0].get("graph");

            // Process the graph data to ensure proper values
            graphData.edges = graphData.edges.map(edge => {
                try {
                    // Ensure value is processed correctly
                    if (edge.value && typeof edge.value === 'string') {
                        // The value is stored as a string in Neo4j - no need to convert
                        // Just ensure it's a valid number string
                        const numValue = edge.value.replace(/[^0-9.]/g, '');
                        edge.value = numValue;
                    }
                } catch (error) {
                    console.log("Error processing edge value:", error);
                    edge.value = "0";
                }
                return edge;
            });

            // Sort edges by timestamp
            graphData.edges.sort((a, b) => b.timeStamp - a.timeStamp);

            console.log("\n3. Graph Statistics:");
            console.log("- Nodes:", graphData.nodes.length);
            console.log("- Edges:", graphData.edges.length);

            console.log("\n4. Node Details:");
            graphData.nodes.forEach((node, i) => {
                console.log(`\nNode ${i + 1}:`);
                console.log("- Address:", node.id);
                console.log("- Balance:", node.balance);
                console.log("- Transaction Count:", node.transactionCount);
            });

            console.log("\n5. Transaction Details:");
            graphData.edges.forEach((edge, i) => {
                console.log(`\nTransaction ${i + 1}:`);
                console.log("- Hash:", edge.hash);
                console.log("- From:", edge.source);
                console.log("- To:", edge.target);
                console.log("- Value:", edge.value);
                try {
                    const timestamp = edge.timeStamp
                        ? new Date(
                              parseInt(edge.timeStamp) * 1000
                          ).toISOString()
                        : "N/A";
                    console.log("- Timestamp:", timestamp);
                } catch (error) {
                    console.log(
                        "- Timestamp: Invalid (Raw value:",
                        edge.timeStamp,
                        ")"
                    );
                }
            });

            console.log("\n=== Graph Request Complete ===\n");

            res.json(graphData);
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error("\nError fetching graph data:", error);
        res.status(500).json({
            error: "Error fetching graph data",
            details: error.message,
        });
    }
});

app.get("/api/debug/graph/:address", async (req, res) => {
    const { address } = req.params;

    try {
        if (!neo4jDriver) {
            throw new Error("Database connection not available");
        }

        const session = neo4jDriver.session();
        try {
            const debug = {
                addressInfo: null,
                nodeCount: 0,
                transactionCount: 0,
                transactions: [],
                connectedAddresses: [],
            };

            // 1. Check main address
            const addressResult = await session.run(
                `MATCH (a:Address {address: $address})
                 RETURN a`,
                { address }
            );
            debug.addressInfo = addressResult.records[0]?.get("a").properties;

            // 2. Count all nodes
            const nodeCount = await session.run(
                `MATCH (n:Address) RETURN count(n) as count`
            );
            debug.nodeCount = nodeCount.records[0].get("count").toNumber();

            // 3. Get transaction details
            const txResult = await session.run(
                `MATCH (a:Address {address: $address})-[t:HAS_TRANSACTION]-(other:Address)
                 RETURN t, other.address as connectedAddress
                 ORDER BY t.timeStamp DESC`,
                { address }
            );

            debug.transactionCount = txResult.records.length;
            debug.transactions = txResult.records.map((record) => ({
                ...record.get("t").properties,
                connectedWith: record.get("connectedAddress"),
            }));

            // 4. Get connected addresses
            const connectedResult = await session.run(
                `MATCH (a:Address {address: $address})-[t:HAS_TRANSACTION]-(other:Address)
                 RETURN DISTINCT other.address as address, other.balance as balance, 
                        count(t) as transactionCount
                 ORDER BY transactionCount DESC`,
                { address }
            );

            debug.connectedAddresses = connectedResult.records.map(
                (record) => ({
                    address: record.get("address"),
                    balance: record.get("balance"),
                    transactionCount: record.get("transactionCount").toNumber(),
                })
            );

            res.json({
                timestamp: new Date().toISOString(),
                debug,
            });
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error("Debug error:", error);
        res.status(500).json({
            error: "Error during debug",
            details: error.message,
        });
    }
});

// Function to normalize source code for consistent hashing
function normalizeSourceCode(sourceCode) {
    // Remove comments
    sourceCode = sourceCode.replace(/\/\/.*/g, "");
    sourceCode = sourceCode.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove whitespace
    sourceCode = sourceCode.replace(/\s+/g, " ");
    sourceCode = sourceCode.trim();

    return sourceCode;
}

// Function to fetch contract source code from Etherscan
async function fetchContractSource(address) {
    try {
        const response = await axios.get(ETHERSCAN_API_URL, {
            params: {
                module: "contract",
                action: "getsourcecode",
                address: address,
                apikey: ETHERSCAN_API_KEY,
            },
        });

        if (response.data.status !== "1" || !response.data.result[0]) {
            throw new Error(
                response.data.message || "Failed to fetch contract source"
            );
        }

        const sourceCode = response.data.result[0].SourceCode;
        if (!sourceCode) {
            throw new Error("Contract source code not verified on Etherscan");
        }

        return sourceCode;
    } catch (error) {
        throw new Error(`Failed to fetch contract source: ${error.message}`);
    }
}

// handling contract uploads
app.post(
    "/api/upload-contract",
    upload.single("contract"),
    async (req, res) => {
        console.log("[DEBUG] Contract upload started");
        try {
            const { name, address } = req.body;
            console.log("[DEBUG] Contract name:", name);
            console.log("[DEBUG] Contract address:", address);

            if (!name) {
                console.log("[DEBUG] Contract name missing");
                return res
                    .status(400)
                    .json({ error: "Contract name is required" });
            }

            // Create uploads directory if it doesn't exist
            const uploadDir = path.join(__dirname, "uploads");
            console.log("[DEBUG] Upload directory:", uploadDir);
            if (!fs.existsSync(uploadDir)) {
                console.log("[DEBUG] Creating upload directory");
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            let contractSource;
            let filename;
            let filepath;
            let hash;

            // Handle contract upload by address
            if (address && !req.file) {
                console.log("[DEBUG] Processing contract by address");
                try {
                    // Fetch source code from Etherscan
                    contractSource = await fetchContractSource(address);
                    console.log(
                        "[DEBUG] Contract source fetched from Etherscan"
                    );

                    // Create filename and save to disk
                    filename = `${Date.now()}-${address}.sol`;
                    filepath = path.join(uploadDir, filename);
                    console.log("[DEBUG] File path:", filepath);

                    // Write source code to file
                    fs.writeFileSync(filepath, contractSource);
                    console.log("[DEBUG] Contract source written to file");

                    // Calculate hash from normalized source code
                    hash = crypto
                        .createHash("sha256")
                        .update(normalizeSourceCode(contractSource))
                        .digest("hex");
                    console.log("[DEBUG] Contract hash:", hash);
                } catch (error) {
                    console.log(
                        "[DEBUG] Error processing contract by address:",
                        error
                    );
                    return res.status(400).json({ error: error.message });
                }
            }
            // Handle file upload
            else if (req.file) {
                console.log("[DEBUG] Processing uploaded contract file");
                if (!req.file.originalname.endsWith(".sol")) {
                    console.log("[DEBUG] Invalid file type");
                    return res.status(400).json({
                        error: "Only Solidity (.sol) files are allowed",
                    });
                }

                // With disk storage, the file is already written to disk
                filepath = req.file.path;
                filename = req.file.filename;
                console.log("[DEBUG] File path:", filepath);

                // Read the file content to calculate the hash
                const fileContent = fs.readFileSync(filepath, 'utf8');
                // Calculate hash from normalized content
                hash = crypto
                    .createHash("sha256")
                    .update(normalizeSourceCode(fileContent))
                    .digest("hex");
                console.log("[DEBUG] Contract hash:", hash);
            } else {
                console.log("[DEBUG] No contract source provided");
                return res.status(400).json({
                    error: "Either a contract file or address must be provided",
                });
            }

            // Check if contract with same hash exists
            console.log("[DEBUG] Checking for existing contract");
            const [existingContracts] = await mysqlPool.query(
                "SELECT id, status FROM contracts WHERE contract_hashcode = ?",
                [hash]
            );

            let contractId;

            if (existingContracts.length > 0) {
                console.log("[DEBUG] Contract already exists");
                const existingContract = existingContracts[0];
                contractId = existingContract.id;

                // If the contract exists but failed, re-run the analysis
                if (existingContract.status === "failed") {
                    console.log(
                        "[DEBUG] Contract exists but failed, re-running analysis"
                    );
                    
                    // Check if the file still exists at the filepath stored in the database
                    const [contractDetails] = await mysqlPool.query(
                        `SELECT filepath FROM contracts WHERE id = ?`,
                        [contractId]
                    );
                    
                    let existingFilePath = contractDetails[0]?.filepath;
                    
                    // If the file doesn't exist at the stored path, use the new file
                    if (!existingFilePath || !fs.existsSync(existingFilePath)) {
                        console.log(`[DEBUG] Previous file not found or not set, using new upload at: ${filepath}`);
                        await mysqlPool.query(
                            `UPDATE contracts SET status = 'pending', filepath = ? WHERE id = ?`,
                            [filepath, contractId]
                        );
                    } else {
                        // File exists, so we can use it - this is mostly for debugging
                        console.log(`[DEBUG] Previous file found at: ${existingFilePath}, will be replaced with: ${filepath}`);
                        
                        // Update with the new file path
                        await mysqlPool.query(
                            `UPDATE contracts SET status = 'pending', filepath = ? WHERE id = ?`,
                            [filepath, contractId]
                        );
                    }
                    
                    // Start Slither analysis in the background
                    console.log(
                        "[DEBUG] Starting Slither analysis for failed contract",
                        contractId
                    );
                    runSlitherAnalysis(contractId, filepath).catch((error) => {
                        console.error(
                            "[DEBUG] Error in Slither analysis:",
                            error
                        );
                    });
                    console.log(
                        "[DEBUG] Slither analysis initiated for failed contract"
                    );
                }

                // Add to upload history with explicit timestamp
                await mysqlPool.query(
                    `INSERT INTO upload_history (contract_hash, upload_date) 
                     VALUES (?, NOW())`,
                    [hash]
                );
                console.log("[DEBUG] Added to upload history");

                // Delete the temporary file since we already have this contract
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                    console.log("[DEBUG] Temporary file deleted");
                }
            } else {
                console.log("[DEBUG] New contract, inserting into database");
                // Insert new contract
                const [result] = await mysqlPool.query(
                    `INSERT INTO contracts (name, address, filename, filepath, contract_hashcode, status) 
                    VALUES (?, ?, ?, ?, ?, 'pending')`,
                    [name, address || null, filename, filepath, hash]
                );

                contractId = result.insertId;
                console.log("[DEBUG] Contract inserted, ID:", contractId);

                // Add to upload history with explicit timestamp
                await mysqlPool.query(
                    `INSERT INTO upload_history (contract_hash, upload_date) 
                     VALUES (?, NOW())`,
                    [hash]
                );
                console.log("[DEBUG] Added to upload history");

                // Start Slither analysis in the background
                console.log(
                    "[DEBUG] Starting Slither analysis for contract",
                    contractId
                );
                runSlitherAnalysis(contractId, filepath).catch((error) => {
                    console.error("[DEBUG] Error in Slither analysis:", error);
                });
                console.log("[DEBUG] Slither analysis initiated");
            }

            console.log("[DEBUG] Sending success response");
            res.status(201).json({
                message: "Contract processed successfully",
                contractId: contractId,
                status: "pending",
                hash: hash,
            });
        } catch (error) {
            console.error("[DEBUG] Error in contract upload:", error);
            res.status(500).json({ error: "Failed to upload contract" });
        }
    }
);

// Function to run Slither analysis with timeout
async function runSlitherAnalysis(contractId, filePath) {
    console.log(`[DEBUG] Starting Slither analysis for contract ${contractId}`);
    console.log(`[DEBUG] File path: ${filePath}`);

    // Set a timeout for the entire analysis process (2 minutes)
    const analysisTimeout = setTimeout(async () => {
        console.error(
            `[DEBUG] Analysis for contract ${contractId} timed out after 2 minutes`
        );
        await mysqlPool.query(
            `UPDATE contracts SET status = 'failed' WHERE id = ?`,
            [contractId]
        );
        
        // Store timeout error information
        await mysqlPool.query(
            `INSERT INTO analysis_reports 
             (contract_id, report_json, vulnerability_count) 
             VALUES (?, ?, 0)`,
            [
                contractId,
                JSON.stringify({
                    error: "Analysis timed out after 2 minutes",
                }),
            ]
        );
    }, 2 * 60 * 1000);

    try {
        // Update status to analyzing
        console.log(
            `[DEBUG] Updating contract ${contractId} status to 'analyzing'`
        );
        await mysqlPool.query(
            `UPDATE contracts SET status = 'analyzing' WHERE id = ?`,
            [contractId]
        );

        // Verify file exists
        if (!fs.existsSync(filePath)) {
            console.error(`[DEBUG] File not found at: ${filePath}`);
            
            // Try to find the contract in the database to get updated file path
            const [contracts] = await mysqlPool.query(
                `SELECT filepath FROM contracts WHERE id = ?`,
                [contractId]
            );
            
            if (contracts.length > 0 && contracts[0].filepath && fs.existsSync(contracts[0].filepath)) {
                console.log(`[DEBUG] Found alternative file path in database: ${contracts[0].filepath}`);
                filePath = contracts[0].filepath;
            } else {
                throw new Error(`Contract file does not exist: ${filePath}`);
            }
        }

        console.log(`[DEBUG] Confirmed file exists at: ${filePath}`);

        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, "reports");
        console.log(`[DEBUG] Ensuring output directory exists: ${outputDir}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `report-${contractId}.json`);
        console.log(`[DEBUG] Output path: ${outputPath}`);

        // Run Slither with JSON output using Python
        const normalizedFilePath = path.normalize(filePath);
        const normalizedOutputPath = path.normalize(outputPath);
        const command = `python -m slither "${normalizedFilePath}" --json "${normalizedOutputPath}"`;
        console.log(`[DEBUG] Executing Slither command: ${command}`);

        // Use execPromise to properly await command completion
        try {
            const { stdout, stderr } = await execPromise(command);
            console.log(`[DEBUG] Slither stdout: ${stdout}`);
            if (stderr) console.log(`[DEBUG] Slither stderr: ${stderr}`);
        } catch (execError) {
            console.error(`[DEBUG] Slither execution error:`, execError);
            throw execError;
        }

        const reportContent = fs.readFileSync(outputPath, "utf8");
        if (!reportContent.trim()) {
            throw new Error("Slither analysis failed - empty output file");
        }

        // Parse the JSON report
        console.log(`[DEBUG] Reading Slither report from ${outputPath}`);
        const reportData = JSON.parse(reportContent);
        console.log(`[DEBUG] Successfully parsed report JSON`);

        // Count vulnerabilities
        console.log(`[DEBUG] Counting vulnerabilities`);
        const vulnerabilityCounts = countVulnerabilities(reportData);
        console.log(`[DEBUG] Vulnerability counts:`, vulnerabilityCounts);

        // Store results in MySQL
        console.log(`[DEBUG] Storing analysis results in database`);
        await mysqlPool.query(
            `INSERT INTO analysis_reports 
             (contract_id, report_json, vulnerability_count, high_severity_count, medium_severity_count, low_severity_count) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                contractId,
                JSON.stringify(reportData),
                vulnerabilityCounts.total,
                vulnerabilityCounts.high,
                vulnerabilityCounts.medium,
                vulnerabilityCounts.low,
            ]
        );
        console.log(`[DEBUG] Analysis results stored successfully`);

        // Update contract status to completed
        console.log(`[DEBUG] Updating contract status to 'completed'`);
        await mysqlPool.query(
            `UPDATE contracts SET status = 'completed' WHERE id = ?`,
            [contractId]
        );

        console.log(
            `[DEBUG] Analysis completed successfully for contract ${contractId}`
        );

        clearTimeout(analysisTimeout);
    } catch (error) {
        console.error(`[DEBUG] Fatal error in analysis:`, error);
        console.error(`[DEBUG] Error stack:`, error.stack);

        // Update contract status to failed
        console.log(`[DEBUG] Updating contract status to 'failed'`);
        await mysqlPool.query(
            `UPDATE contracts SET status = 'failed' WHERE id = ?`,
            [contractId]
        );

        // Store error information
        try {
            console.log(`[DEBUG] Storing error information in database`);
            await mysqlPool.query(
                `INSERT INTO analysis_reports 
                 (contract_id, report_json, vulnerability_count) 
                 VALUES (?, ?, 0)`,
                [
                    contractId,
                    JSON.stringify({
                        error: error.message || "Unknown error during analysis",
                        stdout: error.stdout,
                        stderr: error.stderr,
                    }),
                ]
            );
        } catch (dbError) {
            console.error(`[DEBUG] Failed to store error:`, dbError);
        }

        clearTimeout(analysisTimeout);
    }
}

// Helper function to count vulnerabilities by severity
function countVulnerabilities(reportData) {
    const counts = {
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
    };

    if (reportData && reportData.results && reportData.results.detectors) {
        reportData.results.detectors.forEach((finding) => {
            counts.total++;
            const impact = finding.impact
                ? finding.impact.toLowerCase()
                : "low";

            switch (impact) {
                case "high":
                    counts.high++;
                    break;
                case "medium":
                    counts.medium++;
                    break;
                case "low":
                    counts.low++;
                    break;
            }
        });
    }

    return counts;
}

// Get report by contract ID with improved error handling
app.get("/api/contract/:contractId/report", async (req, res) => {
    try {
        const { contractId } = req.params;
        console.log(
            `\n[DEBUG] ==================== CONTRACT REPORT REQUEST ====================`
        );
        console.log(`[DEBUG] Starting report fetch for contract ${contractId}`);

        // First get the contract and its latest report in a single query
        const [results] = await mysqlPool.query(
            `SELECT c.*, ar.report_json, ar.vulnerability_count, 
                    ar.high_severity_count, ar.medium_severity_count, 
                    ar.low_severity_count, ar.completion_date,
                    (SELECT MAX(upload_date) FROM contracts WHERE id = c.id) as last_upload_date
             FROM contracts c
             LEFT JOIN analysis_reports ar ON c.id = ar.contract_id
             WHERE c.id = ?
             ORDER BY ar.completion_date DESC
             LIMIT 1`,
            [contractId]
        );

        if (results.length === 0) {
            console.log(`[DEBUG] No contract found with ID ${contractId}`);
            return res.status(404).json({ error: "Contract not found" });
        }

        const contract = results[0];
        console.log(`[DEBUG] Contract found. Status: ${contract.status}`);
        console.log(`[DEBUG] Last upload date: ${contract.last_upload_date}`);

        // Try to read source code if available
        let sourceCode = "";
        try {
            console.log(
                `[DEBUG] Attempting to read source code for contract ${contractId}`
            );
            console.log(`[DEBUG] Contract filepath:`, contract.filepath);

            if (!contract.filepath) {
                console.log(`[DEBUG] No filepath found in contract record`);
            } else if (!fs.existsSync(contract.filepath)) {
                console.log(
                    `[DEBUG] File does not exist at path: ${contract.filepath}`
                );
            } else {
                sourceCode = fs.readFileSync(contract.filepath, "utf8");
                console.log(
                    `[DEBUG] Successfully read source code from ${contract.filepath}`
                );
                console.log(
                    `[DEBUG] Source code length: ${sourceCode.length} characters`
                );
                console.log(
                    `[DEBUG] First 100 characters: ${sourceCode.substring(
                        0,
                        100
                    )}...`
                );
            }
        } catch (error) {
            console.error(`[DEBUG] Error reading source code:`, error);
            console.error(`[DEBUG] Error stack:`, error.stack);
        }

        // If contract is still pending or analyzing, return basic info
        if (contract.status === "pending" || contract.status === "analyzing") {
            console.log(
                `[DEBUG] Contract is ${contract.status}, returning basic info`
            );
            return res.json({
                id: contract.id,
                contract_name: contract.name,
                filename: contract.filename,
                contract_address: contract.address,
                source_code: sourceCode,
                upload_date: contract.upload_date,
                last_upload_date: contract.last_upload_date,
                status: contract.status,
                risk_score: 0,
                vulnerability_summary: {
                    total: 0,
                    high_severity: 0,
                    medium_severity: 0,
                    low_severity: 0,
                },
                vulnerabilities: [],
            });
        }

        // Process report data if available
        console.log(`[DEBUG] Processing report data`);
        let vulnerabilities = [];
        let vulnerabilitySummary = {
            total: contract.vulnerability_count || 0,
            high_severity: contract.high_severity_count || 0,
            medium_severity: contract.medium_severity_count || 0,
            low_severity: contract.low_severity_count || 0,
        };
        console.log(
            `[DEBUG] Vulnerability summary from database:`,
            vulnerabilitySummary
        );

        let riskScore = 0;
        let reportData = null;

        if (contract.report_json) {
            try {
                console.log(
                    `[DEBUG] Processing report_json:`,
                    contract.report_json,
                    typeof contract.report_json
                );
                // Check if report_json is already an object (not a string)
                const report = typeof contract.report_json === 'string' 
                    ? JSON.parse(contract.report_json)
                    : contract.report_json;
                    
                if (report.results && report.results.detectors && report.results.detectors.length > 0) {
                    console.log(
                        `[DEBUG] Processing ${report.results.detectors.length} detectors`
                    );
                    vulnerabilities = report.results.detectors.map(
                        (finding) => {
                            console.log(`[DEBUG] Processing finding:`, {
                                check: finding.check,
                                impact: finding.impact,
                                elements: Array.isArray(finding.elements)
                                    ? finding.elements.length
                                    : "N/A",
                            });

                            // Categorize findings based on impact and check type
                            const category =
                                finding.impact === "Informational"
                                    ? "informational"
                                    : finding.impact === "Optimization"
                                    ? "optimization"
                                    : "vulnerability";

                            return {
                                title: finding.check,
                                description:
                                    finding.description || finding.message,
                                severity: finding.impact || "Low",
                                confidence: finding.confidence || "Medium",
                                category: category,
                                elements: finding.elements || [],
                                lines:
                                    finding.elements
                                        ?.map(
                                            (elem) =>
                                                elem.source_mapping?.lines || []
                                        )
                                        .flat() || [],
                            };
                        }
                    );

                    // Separate findings by category
                    const categorizedFindings = {
                        vulnerabilities: vulnerabilities.filter(
                            (f) => f.category === "vulnerability"
                        ),
                        informational: vulnerabilities.filter(
                            (f) => f.category === "informational"
                        ),
                        optimization: vulnerabilities.filter(
                            (f) => f.category === "optimization"
                        ),
                    };

                    // Calculate risk score based only on vulnerability findings
                    riskScore = Math.min(
                        100,
                        categorizedFindings.vulnerabilities.filter(
                            (v) => v.severity === "High"
                        ).length *
                            10 +
                            categorizedFindings.vulnerabilities.filter(
                                (v) => v.severity === "Medium"
                            ).length *
                                5 +
                            categorizedFindings.vulnerabilities.filter(
                                (v) => v.severity === "Low"
                            ).length *
                                2
                    );
                    console.log(`[DEBUG] Calculated risk score: ${riskScore}`);
                }
            } catch (error) {
                console.error(`[DEBUG] Error processing report data:`, error);
                console.log(`[DEBUG] Raw report_json:`, contract.report_json);
            }
        }

        // Prepare final response
        const responseData = {
            id: contract.id,
            contract_name: contract.name,
            filename: contract.filename,
            contract_address: contract.address,
            source_code: sourceCode,
            upload_date: contract.upload_date,
            last_upload_date: contract.last_upload_date,
            status: contract.status,
            risk_score: riskScore,
            vulnerability_summary: vulnerabilitySummary,
            findings: {
                contract_name: contract.name,
                vulnerabilities:
                    vulnerabilities.filter(
                        (f) => f.category === "vulnerability"
                    ) || [],
                informational:
                    vulnerabilities.filter(
                        (f) => f.category === "informational"
                    ) || [],
                optimization:
                    vulnerabilities.filter(
                        (f) => f.category === "optimization"
                    ) || [],
            },
        };

        console.log(`[DEBUG] Response summary:`);
        console.log(`- Status: ${responseData.status}`);
        console.log(`- Risk score: ${responseData.risk_score}`);
        console.log(`- Vulnerabilities found: ${vulnerabilities.length}`);
        console.log(
            `[DEBUG] ==================== END CONTRACT REPORT REQUEST ====================\n`
        );

        res.json(responseData);
    } catch (error) {
        console.error("[DEBUG] Error retrieving contract report:", error);
        console.error("[DEBUG] Error stack:", error.stack);
        res.status(500).json({ error: "Failed to retrieve contract report" });
    }
});

// Improved debug endpoint
app.get("/api/report/:reportId/debug", async (req, res) => {
    try {
        const { reportId } = req.params;

        console.log(`Fetching report with ID: ${reportId}`);

        // Get the report from MySQL
        const [reports] = await mysqlPool.query(
            `SELECT ar.*, c.name as contract_name, c.address as contract_address, c.filename
             FROM analysis_reports ar
             JOIN contracts c ON ar.contract_id = c.id
             WHERE ar.id = ?`,
            [reportId]
        );

        console.log(`Found ${reports.length} reports`);

        if (reports.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }

        const report = reports[0];
        console.log(
            `Report for contract: ${report.contract_name}, ID: ${report.contract_id}`
        );

        // Return the raw report for debugging
        res.json({
            reportId: report.id,
            contractId: report.contract_id,
            contractName: report.contract_name,
            rawReportString: report.report_json, // Return as string without parsing
            reportLength: report.report_json ? report.report_json.length : 0,
            vulnerabilityCounts: {
                total: report.vulnerability_count,
                high: report.high_severity_count,
                medium: report.medium_severity_count,
                low: report.low_severity_count,
            },
        });
    } catch (error) {
        console.error("Error retrieving report:", error);
        res.status(500).json({
            error: "Failed to retrieve report",
            details: error.message,
        });
    }
});

// Endpoint to reset a stuck analysis
app.post("/api/contract/:contractId/reset", async (req, res) => {
    try {
        const { contractId } = req.params;

        // Check if contract exists and is in analyzing state
        const [contracts] = await mysqlPool.query(
            `SELECT id, filepath, status FROM contracts WHERE id = ? AND status = 'analyzing'`,
            [contractId]
        );

        if (contracts.length === 0) {
            return res.status(404).json({
                error: "Contract not found or not in 'analyzing' state",
            });
        }

        const contract = contracts[0];

        // Update status to pending
        await mysqlPool.query(
            `UPDATE contracts SET status = 'pending' WHERE id = ?`,
            [contractId]
        );

        // Start analysis again
        runSlitherAnalysis(contractId, contract.filepath);

        res.json({
            message: "Analysis reset and restarted",
            contractId: contractId,
            status: "pending",
        });
    } catch (error) {
        console.error("Error resetting analysis:", error);
        res.status(500).json({ error: "Failed to reset analysis" });
    }
});

// Add this endpoint for direct file reading
app.get("/api/report-file/:contractId", async (req, res) => {
    try {
        const { contractId } = req.params;
        const reportPath = path.join(
            __dirname,
            "reports",
            `report-${contractId}.json`
        );

        console.log(`Attempting to read report file: ${reportPath}`);

        if (!fs.existsSync(reportPath)) {
            return res.status(404).json({ error: "Report file not found" });
        }

        const fileContent = fs.readFileSync(reportPath, "utf8");
        console.log(`Read ${fileContent.length} bytes from file`);

        try {
            const reportData = JSON.parse(fileContent);
            res.json({
                success: true,
                reportStructure: Object.keys(reportData),
                hasResults: !!reportData.results,
                hasDetectors:
                    reportData.results && !!reportData.results.detectors,
                detectorCount:
                    reportData.results && reportData.results.detectors
                        ? reportData.results.detectors.length
                        : 0,
            });
        } catch (parseError) {
            res.status(500).json({
                error: "Failed to parse report file",
                filePreview: fileContent.substring(0, 500) + "...",
            });
        }
    } catch (error) {
        console.error("Error reading report file:", error);
        res.status(500).json({ error: "Failed to read report file" });
    }
});

// Add this function before the endpoints
async function getEtherscanData(address, page = 1, offset = 10) {
    try {
        // Get balance with retry mechanism
        let balanceResponse;
        let retries = 3;
        while (retries > 0) {
            try {
                balanceResponse = await axios.get(ETHERSCAN_API_URL, {
                    params: {
                        module: "account",
                        action: "balance",
                        address: address,
                        tag: "latest",
                        apikey: ETHERSCAN_API_KEY,
                    },
                    timeout: 5000, // 5 second timeout
                });
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
        }

        // Get transaction count with retry mechanism
        let txCountResponse;
        retries = 3;
        while (retries > 0) {
            try {
                txCountResponse = await axios.get(ETHERSCAN_API_URL, {
                    params: {
                        module: "proxy",
                        action: "eth_getTransactionCount",
                        address: address,
                        tag: "latest",
                        apikey: ETHERSCAN_API_KEY,
                    },
                    timeout: 5000,
                });
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        // Get transactions with retry mechanism
        let txListResponse;
        retries = 3;
        while (retries > 0) {
            try {
                txListResponse = await axios.get(ETHERSCAN_API_URL, {
                    params: {
                        module: "account",
                        action: "txlist",
                        address: address,
                        startblock: 0,
                        endblock: 99999999,
                        page: page,
                        offset: offset,
                        sort: "desc",
                        apikey: ETHERSCAN_API_KEY,
                    },
                    timeout: 5000,
                });
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        // Handle API errors
        if (
            balanceResponse.data.message === "NOTOK" ||
            txListResponse.data.message === "NOTOK" ||
            txCountResponse.data.message === "NOTOK"
        ) {
            throw new Error(
                "Etherscan API rate limit exceeded. Please try again later."
            );
        }

        // Process balance
        const balance = balanceResponse.data.result
            ? (parseFloat(balanceResponse.data.result) / 1e18).toFixed(6)
            : "0.000000";

        // Process transaction count - convert hex to decimal
        const txCount = txCountResponse.data.result
            ? parseInt(txCountResponse.data.result, 16)
            : 0;

        // Process transactions
        const transactions =
            txListResponse.data.result &&
            Array.isArray(txListResponse.data.result)
                ? txListResponse.data.result.map((tx) => ({
                      hash: tx.hash,
                      from: tx.from,
                      to: tx.to,
                      value: (parseFloat(tx.value) / 1e18).toFixed(6),
                      timeStamp: tx.timeStamp,
                      gasPrice: tx.gasPrice,
                      gasUsed: tx.gasUsed,
                      isError: tx.isError === "1",
                      blockNumber: tx.blockNumber
                  }))
                : [];

        return {
            address,
            balance,
            transactionCount: txCount,
            totalFetchedTransactions: transactions.length,
            currentPage: page,
            recentTransactions: transactions,
            hasMoreTransactions: transactions.length === offset,
        };
    } catch (error) {
        console.error(`[MAIN] Etherscan API Error: ${error.message}`);
        throw new Error(`Failed to fetch wallet data: ${error.message}`);
    }
}

// Add the wallet endpoint
app.get("/api/wallet/:address", async (req, res) => {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
            error: "Invalid Ethereum address format",
        });
    }

    try {
        if (!neo4jDriver) {
            throw new Error("Database connection not available");
        }

        // Check if we already have data for this address in Neo4j
        const session = neo4jDriver.session();
        try {
            const existingWalletResult = await session.run(
                `MATCH (w:Address {address: $address})
                 OPTIONAL MATCH (w)-[r:HAS_TRANSACTION]-(other:Address)
                 RETURN w, count(r) as txCount`,
                { address }
            );
            
            const existingWallet = existingWalletResult.records[0]?.get("w");
            const storedTxCount = existingWalletResult.records[0]?.get("txCount").toNumber() || 0;
            
            // If we have recent data and some transactions, use that
            if (existingWallet && existingWallet.properties.lastUpdated && storedTxCount > 0) {
                const lastUpdated = new Date(existingWallet.properties.lastUpdated.toString());
                const now = new Date();
                const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
                
                // Only use cached data if it's less than 1 hour old
                if (hoursSinceUpdate < 1) {
                    console.log(`Using cached wallet data for ${address}`);
                    
                    // Get the transactions from Neo4j (first page only)
                    const txResult = await session.run(
                        `MATCH (w:Address {address: $address})-[r:HAS_TRANSACTION]-(other:Address)
                         RETURN r, other.address as connectedAddress
                         ORDER BY r.timeStamp DESC
                         LIMIT 10`,
                        { address }
                    );
                    
                    const transactions = txResult.records.map(record => {
                        const tx = record.get("r").properties;
                        const connectedAddress = record.get("connectedAddress");
                        
                        // Determine the from/to based on transaction type
                        const isOutgoing = tx.type === "out";
                        
                        return {
                            hash: tx.hash,
                            from: isOutgoing ? address : connectedAddress,
                            to: isOutgoing ? connectedAddress : address,
                            value: tx.value,
                            timeStamp: tx.timeStamp,
                            gasPrice: tx.gasPrice,
                            gasUsed: tx.gasUsed,
                            blockNumber: tx.blockNumber
                        };
                    });
                    
                    // Return the cached data
                    return res.json({
                        address,
                        balance: existingWallet.properties.balance,
                        transactionCount: existingWallet.properties.transactionCount 
                            ? parseInt(existingWallet.properties.transactionCount) 
                            : storedTxCount,
                        totalFetchedTransactions: transactions.length,
                        currentPage: 1,
                        recentTransactions: transactions,
                        hasMoreTransactions: transactions.length === 10,
                        fromCache: true,
                        fetchedPages: existingWallet.properties.fetchedPages || [1]
                    });
                }
            }
            
            // Get wallet data from Etherscan (first 10 transactions)
            const walletData = await getEtherscanData(address);

            // Store/update main wallet data with fetchedPages tracking
            await session.run(
                `MERGE (w:Address {address: $address})
                 SET w.balance = $balance,
                     w.transactionCount = toInteger($txCount),
                     w.lastUpdated = datetime(),
                     w.fetchedPages = CASE
                        WHEN w.fetchedPages IS NULL THEN [toInteger(1)]
                        WHEN NOT toInteger(1) IN w.fetchedPages THEN w.fetchedPages + toInteger(1)
                        ELSE w.fetchedPages
                     END`,
                {
                    address: walletData.address,
                    balance: walletData.balance,
                    txCount: parseInt(walletData.transactionCount)
                }
            );

            // Process and store transactions for each page in Neo4j
            for (let pageNum = 1; pageNum <= walletData.prefetchedPages.length; pageNum++) {
                const pageTransactions = walletData.allTransactions.filter(tx => {
                    const txIndex = walletData.allTransactions.indexOf(tx);
                    return Math.floor(txIndex / 10) + 1 === pageNum;
                });

                for (const tx of pageTransactions) {
                    // Ensure both addresses exist
                    await session.run(
                        `MERGE (from:Address {address: $fromAddress})
                         MERGE (to:Address {address: $toAddress})`,
                        {
                            fromAddress: tx.from,
                            toAddress: tx.to,
                        }
                    );

                    // Create the transaction relationship based on direction
                    if (tx.from.toLowerCase() === address.toLowerCase()) {
                        // Outgoing transaction
                        await session.run(
                            `MATCH (from:Address {address: $fromAddress})
                             MATCH (to:Address {address: $toAddress})
                             MERGE (from)-[r:HAS_TRANSACTION]->(to)
                             SET r = $txData`,
                            {
                                fromAddress: tx.from,
                                toAddress: tx.to,
                                txData: {
                                    hash: tx.hash,
                                    value: String(tx.value),
                                    timeStamp: String(tx.timeStamp),
                                    gasPrice: String(tx.gasPrice),
                                    gasUsed: String(tx.gasUsed),
                                    type: "out",
                                    blockNumber: String(tx.blockNumber),
                                    page: parseInt(pageNum)
                                },
                            }
                        );
                    } else if (tx.to.toLowerCase() === address.toLowerCase()) {
                        // Incoming transaction
                        await session.run(
                            `MATCH (from:Address {address: $fromAddress})
                             MATCH (to:Address {address: $toAddress})
                             MERGE (from)-[r:HAS_TRANSACTION]->(to)
                             SET r = $txData`,
                            {
                                fromAddress: tx.from,
                                toAddress: tx.to,
                                txData: {
                                    hash: tx.hash,
                                    value: String(tx.value),
                                    timeStamp: String(tx.timeStamp),
                                    gasPrice: String(tx.gasPrice),
                                    gasUsed: String(tx.gasUsed),
                                    type: "in",
                                    blockNumber: String(tx.blockNumber),
                                    page: parseInt(pageNum)
                                },
                            }
                        );
                    }
                }
            }

            // Get the updated fetchedPages after storing
            const updatedWalletResult = await session.run(
                `MATCH (w:Address {address: $address})
                 RETURN w.fetchedPages as fetchedPages`,
                { address }
            );
            
            const fetchedPages = updatedWalletResult.records[0]?.get("fetchedPages") || [1];

            return res.json({
                ...walletData,
                fromCache: false,
                fetchedPages
            });
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error("Error details:", error);
        res.status(500).json({
            error: "Error fetching wallet data",
            details: error.message,
        });
    }
});

// Add endpoint to fetch transactions by page
app.get("/api/wallet/:address/transactions", async (req, res) => {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const offset = parseInt(req.query.offset) || 10;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
            error: "Invalid Ethereum address format",
        });
    }

    try {
        if (!neo4jDriver) {
            throw new Error("Database connection not available");
        }

        const session = neo4jDriver.session();
        
        try {
            // First check if we have this page cached in Neo4j
            const cachedResult = await session.run(
                `MATCH (w:Address {address: $address})
                 OPTIONAL MATCH (w)-[r:HAS_TRANSACTION]-(other:Address)
                 WITH w, r, other
                 ORDER BY r.timeStamp DESC
                 SKIP toInteger($skip)
                 LIMIT toInteger($limit)
                 RETURN r, other.address as connectedAddress, 
                        count(r) as fetchedCount,
                        w.fetchedPages as fetchedPages`,
                { 
                    address, 
                    skip: parseInt((page - 1) * offset), 
                    limit: parseInt(offset)
                }
            );
            
            const fetchedPages = cachedResult.records[0]?.get("fetchedPages") || [];
            const fetchedCount = cachedResult.records.length;
            
            // If we have enough transactions for this page and we've already fetched this page before
            const parsedPage = parseInt(page);
            const pageIsCached = fetchedPages && Array.isArray(fetchedPages) && 
                                fetchedPages.some(p => parseInt(p) === parsedPage);
            
            if (fetchedCount > 0 && pageIsCached) {
                console.log(`Using cached transactions for ${address}, page ${parsedPage}`);
                
                const transactions = cachedResult.records.map(record => {
                    const tx = record.get("r").properties;
                    const connectedAddress = record.get("connectedAddress");
                    
                    // Determine the from/to based on transaction type
                    const isOutgoing = tx.type === "out";
                    
                    return {
                        hash: tx.hash,
                        from: isOutgoing ? address : connectedAddress,
                        to: isOutgoing ? connectedAddress : address,
                        value: tx.value,
                        timeStamp: tx.timeStamp,
                        gasPrice: tx.gasPrice,
                        gasUsed: tx.gasUsed,
                        blockNumber: tx.blockNumber
                    };
                });
                
                // Get total transaction count from the wallet node
                const walletInfoResult = await session.run(
                    `MATCH (w:Address {address: $address})
                     RETURN w.transactionCount as txCount`,
                    { address }
                );
                
                const txCount = walletInfoResult.records[0]?.get("txCount") 
                    ? parseInt(walletInfoResult.records[0].get("txCount"))
                    : fetchedCount;

                return res.json({
                    address,
                    transactionCount: txCount,
                    totalFetchedTransactions: fetchedCount,
                    currentPage: page,
                    recentTransactions: transactions,
                    hasMoreTransactions: fetchedCount === offset,
                    fromCache: true
                });
            }
            
            // If not in cache, fetch from Etherscan
            console.log(`Fetching transactions from Etherscan for ${address}, page ${page}`);
            const walletData = await getEtherscanData(address, page, offset);
            
            // Save the transactions to Neo4j
            for (const tx of walletData.recentTransactions) {
                // Ensure both addresses exist
                await session.run(
                    `MERGE (from:Address {address: $fromAddress})
                     MERGE (to:Address {address: $toAddress})`,
                    {
                        fromAddress: tx.from,
                        toAddress: tx.to,
                    }
                );

                // Create the transaction relationship based on direction
                if (tx.from.toLowerCase() === address.toLowerCase()) {
                    // Outgoing transaction
                    await session.run(
                        `MATCH (from:Address {address: $fromAddress})
                         MATCH (to:Address {address: $toAddress})
                         MERGE (from)-[r:HAS_TRANSACTION]->(to)
                         SET r = $txData`,
                        {
                            fromAddress: tx.from,
                            toAddress: tx.to,
                            txData: {
                                hash: tx.hash,
                                value: String(tx.value),
                                timeStamp: String(tx.timeStamp),
                                gasPrice: String(tx.gasPrice),
                                gasUsed: String(tx.gasUsed),
                                type: "out",
                                blockNumber: String(tx.blockNumber),
                                page: parseInt(page)
                            },
                        }
                    );
                } else if (tx.to.toLowerCase() === address.toLowerCase()) {
                    // Incoming transaction
                    await session.run(
                        `MATCH (from:Address {address: $fromAddress})
                         MATCH (to:Address {address: $toAddress})
                         MERGE (from)-[r:HAS_TRANSACTION]->(to)
                         SET r = $txData`,
                        {
                            fromAddress: tx.from,
                            toAddress: tx.to,
                            txData: {
                                hash: tx.hash,
                                value: String(tx.value),
                                timeStamp: String(tx.timeStamp),
                                gasPrice: String(tx.gasPrice),
                                gasUsed: String(tx.gasUsed),
                                type: "in",
                                blockNumber: String(tx.blockNumber),
                                page: parseInt(page)
                            },
                        }
                    );
                }
            }
            
            // Update the wallet node with transaction count and mark this page as fetched
            await session.run(
                `MATCH (w:Address {address: $address})
                 SET w.transactionCount = toInteger($txCount),
                     w.lastUpdated = datetime(),
                     w.fetchedPages = CASE
                        WHEN w.fetchedPages IS NULL THEN [toInteger($page)]
                        WHEN NOT toInteger($page) IN w.fetchedPages THEN w.fetchedPages + toInteger($page)
                        ELSE w.fetchedPages
                     END`,
                {
                    address,
                    txCount: parseInt(walletData.transactionCount),
                    page: parseInt(page)
                }
            );

            return res.json({
                ...walletData,
                fromCache: false
            });
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error("Error details:", error);
        res.status(500).json({
            error: "Error fetching wallet transactions",
            details: error.message,
        });
    }
});

// Then modify the upload-contract endpoint to handle in-memory files
app.post(
    "/api/upload-contract",
    upload.single("contract"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            const { name, address } = req.body;

            if (!name) {
                return res
                    .status(400)
                    .json({ error: "Contract name is required" });
            }

            // Get the contract content from memory
            const fileContent = req.file.buffer.toString('utf8');
            
            // Calculate SHA256 hash of the contract contents
            const hash = crypto
                .createHash("sha256")
                .update(fileContent)
                .digest("hex");

            // Create a temporary file path for Slither analysis
            const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${req.file.originalname}`);
            
            // Write the file content to the temporary file
            fs.writeFileSync(tempFilePath, fileContent);

            // Insert contract info into MySQL
            const [result] = await mysqlPool.query(
                `INSERT INTO contracts (name, address, filename, filepath, contract_hashcode, status) 
                VALUES (?, ?, ?, ?, ?, 'pending')`,
                [
                    name,
                    address || null,
                    req.file.originalname,
                    tempFilePath, // Use the temporary file path
                    hash,
                ]
            );

            const contractId = result.insertId;

            // Start Slither analysis in the background using the temporary file
            runSlitherAnalysis(contractId, tempFilePath, true); // Pass true to indicate it's a temp file

            res.status(201).json({
                message: "Contract uploaded successfully",
                contractId: contractId,
                status: "pending",
                hash: hash,
            });
        } catch (error) {
            console.error("Error uploading contract:", error);
            res.status(500).json({ error: "Failed to upload contract" });
        }
    }
);

// Add this function to preprocess the contract
async function preprocessContract(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace pragma solidity with a compatible version
        content = content.replace(
            /pragma solidity [\^]?[0-9]+\.[0-9]+\.[0-9]+;/g, 
            'pragma solidity 0.8.7;'
        );
        
        // Write the modified content back to the file
        fs.writeFileSync(filePath, content);
        console.log(`Preprocessed contract to use compatible Solidity version`);
    } catch (error) {
        console.error(`Error preprocessing contract: ${error.message}`);
    }
}

// Modify the runSlitherAnalysis function
async function runSlitherAnalysis(contractId, filePath, isTemporary = false) {
    // Set a timeout for the entire analysis process (2 minutes)
    const analysisTimeout = setTimeout(async () => {
        console.error(
            `Analysis for contract ${contractId} timed out after 2 minutes`
        );

        try {
            // Check current status
            const [statusResult] = await mysqlPool.query(
                `SELECT status FROM contracts WHERE id = ?`,
                [contractId]
            );

            // Only update if still analyzing
            if (
                statusResult.length > 0 &&
                statusResult[0].status === "analyzing"
            ) {
                // Update contract status to failed
                await mysqlPool.query(
                    `UPDATE contracts SET status = 'failed' WHERE id = ?`,
                    [contractId]
                );

                // Store timeout error in the analysis_reports table
                await mysqlPool.query(
                    `INSERT INTO analysis_reports 
                     (contract_id, report_json, vulnerability_count) 
                     VALUES (?, ?, 0)`,
                    [
                        contractId,
                        JSON.stringify({
                            error: "Analysis timed out after 2 minutes",
                        }),
                    ]
                );
            }
            
            // Clean up temporary file if needed
            if (isTemporary && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(
                `Error handling timeout for contract ${contractId}:`,
                error
            );
        }
    }, 2 * 60 * 1000); // 2 minutes

    try {
        // Update status to analyzing
        await mysqlPool.query(
            `UPDATE contracts SET status = 'analyzing' WHERE id = ?`,
            [contractId]
        );

        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, "reports");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `report-${contractId}.json`);

        console.log(`Running Slither analysis on contract ID ${contractId}...`);
        console.log(`File path: ${filePath}`);
        console.log(`Output path: ${outputPath}`);

        // Preprocess the contract to use compatible Solidity version
        await preprocessContract(filePath);
        
        // Run Slither with JSON output - use double quotes for Windows paths
        const command = `python -m slither "${filePath}" --json "${outputPath}"`;
        console.log(`Executing command: ${command}`);

        try {
            const { stdout, stderr } = await execPromise(command, {
                timeout: 1.5 * 60 * 1000,
            }); // 1.5 minute timeout for the command
            console.log("Slither stdout:", stdout);
            if (stderr) console.log("Slither stderr (warnings/info):", stderr);
        } catch (execError) {
            // Check if it's a timeout error
            if (execError.killed && execError.signal === "SIGTERM") {
                throw new Error("Slither analysis timed out");
            }

            // Slither returns non-zero exit code when it finds vulnerabilities
            // This is actually a successful analysis, not an error
            console.log("Slither found vulnerabilities (expected behavior)");
            console.log("Slither stdout:", execError.stdout);
            console.log("Slither stderr (findings):", execError.stderr);
        }

        // Read the JSON report with better error handling
        let reportData;
        try {
            const reportContent = fs.readFileSync(outputPath, "utf8");
            console.log(`Read ${reportContent.length} bytes from report file`);
            console.log(
                `Report preview: ${reportContent.substring(0, 200)}...`
            );

            reportData = JSON.parse(reportContent);
        } catch (readError) {
            console.error(
                `Error reading or parsing report file: ${readError.message}`
            );
            throw new Error(
                `Failed to read or parse Slither report: ${readError.message}`
            );
        }

        // Count vulnerabilities by severity
        const vulnerabilityCounts = countVulnerabilities(reportData);

        // Store results in MySQL with better error handling
        try {
            const reportJson = JSON.stringify(reportData);
            console.log(`Serialized report is ${reportJson.length} bytes`);

            await mysqlPool.query(
                `INSERT INTO analysis_reports 
                 (contract_id, report_json, vulnerability_count, high_severity_count, medium_severity_count, low_severity_count) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    contractId,
                    reportJson,
                    vulnerabilityCounts.total,
                    vulnerabilityCounts.high,
                    vulnerabilityCounts.medium,
                    vulnerabilityCounts.low,
                ]
            );
        } catch (dbError) {
            console.error(
                `Error storing report in database: ${dbError.message}`
            );
            throw new Error(
                `Failed to store report in database: ${dbError.message}`
            );
        }

        // Update contract status to completed
        await mysqlPool.query(
            `UPDATE contracts SET status = 'completed' WHERE id = ?`,
            [contractId]
        );

        console.log(`Analysis completed for contract ID ${contractId}`);

        // Clean up the temporary file if needed
        if (isTemporary && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Temporary file ${filePath} deleted`);
        }

        // Clear the timeout since we completed successfully
        clearTimeout(analysisTimeout);
    } catch (error) {
        console.error(`Error analyzing contract ${contractId}:`, error);
        console.error(`Error stack: ${error.stack}`);

        // If there was stderr output from the command, log it
        if (error.stderr) {
            console.error(`Command stderr: ${error.stderr}`);
        }

        // Update contract status to failed
        await mysqlPool.query(
            `UPDATE contracts SET status = 'failed' WHERE id = ?`,
            [contractId]
        );

        // Store error information in the analysis_reports table
        try {
            await mysqlPool.query(
                `INSERT INTO analysis_reports 
                 (contract_id, report_json, vulnerability_count) 
                 VALUES (?, ?, 0)`,
                [
                    contractId,
                    JSON.stringify({
                        error: error.message || "Unknown error during analysis",
                    }),
                ]
            );
        } catch (dbError) {
            console.error("Failed to store analysis error:", dbError);
        }

        // Clean up the temporary file if needed
        if (isTemporary && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Temporary file ${filePath} deleted after error`);
        }

        // Clear the timeout since we've handled the error
        clearTimeout(analysisTimeout);
    }
}

// Helper function to count vulnerabilities by severity
function countVulnerabilities(reportData) {
    const counts = {
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
    };

    if (reportData && reportData.results && reportData.results.detectors) {
        reportData.results.detectors.forEach((finding) => {
            counts.total++;

            if (finding.impact && finding.impact.toLowerCase() === "high") {
                counts.high++;
            } else if (
                finding.impact &&
                finding.impact.toLowerCase() === "medium"
            ) {
                counts.medium++;
            } else {
                counts.low++;
            }
        });
    }

    return counts;
}

// get contract report
app.get("/api/report/:reportId", async (req, res) => {
    try {
        const { reportId } = req.params;

        // Get the report from MySQL
        const [reports] = await mysqlPool.query(
            `SELECT ar.*, c.name as contract_name, c.address as contract_address, c.filename
             FROM analysis_reports ar
             JOIN contracts c ON ar.contract_id = c.id
             WHERE ar.id = ?`,
            [reportId]
        );

        if (reports.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }

        const report = reports[0];

        // Parse the JSON report
        const reportJson = JSON.parse(report.report_json);

        // Format the response
        const response = {
            id: report.id,
            contractId: report.contract_id,
            contractName: report.contract_name,
            contractAddress: report.contract_address,
            filename: report.filename,
            completionDate: report.completion_date,
            vulnerabilitySummary: {
                total: report.vulnerability_count,
                highSeverity: report.high_severity_count,
                mediumSeverity: report.medium_severity_count,
                lowSeverity: report.low_severity_count,
            },
            findings: reportJson.results.detectors.map((finding) => ({
                name: finding.check,
                description: finding.description,
                impact: finding.impact,
                confidence: finding.confidence,
                elements: finding.elements,
            })),
        };

        res.json(response);
    } catch (error) {
        console.error("Error retrieving report:", error);
        res.status(500).json({ error: "Failed to retrieve report" });
    }
});

// Get all contracts
app.get("/api/contracts", async (req, res) => {
    try {
        const [contracts] = await mysqlPool.query(
            `SELECT c.*, 
                    IFNULL(ar.vulnerability_count, 0) as vulnerability_count,
                    IFNULL(ar.high_severity_count, 0) as high_severity_count
             FROM contracts c
             LEFT JOIN analysis_reports ar ON c.id = ar.contract_id
             ORDER BY c.upload_date DESC`
        );

        res.json(contracts);
    } catch (error) {
        console.error("Error retrieving contracts:", error);
        res.status(500).json({ error: "Failed to retrieve contracts" });
    }
});

// Get contract status
app.get("/api/contract/:contractId/status", async (req, res) => {
    try {
        const { contractId } = req.params;

        const [contracts] = await mysqlPool.query(
            `SELECT id, name, status, upload_date FROM contracts WHERE id = ?`,
            [contractId]
        );

        if (contracts.length === 0) {
            return res.status(404).json({ error: "Contract not found" });
        }

        res.json(contracts[0]);
    } catch (error) {
        console.error("Error retrieving contract status:", error);
        res.status(500).json({ error: "Failed to retrieve contract status" });
    }
});

// Get report by contract ID with improved error handling
app.get("/api/contract/:contractId/report", async (req, res) => {
    try {
        const { contractId } = req.params;
        console.log(`Retrieving report for contract ID: ${contractId}`);

        // Get the report from MySQL
        const [reports] = await mysqlPool.query(
            `SELECT ar.*, c.name as contract_name, c.address as contract_address, c.filename, c.status
             FROM contracts c
             LEFT JOIN analysis_reports ar ON c.id = ar.contract_id
             WHERE c.id = ?
             ORDER BY ar.completion_date DESC
             LIMIT 1`,
            [contractId]
        );

        console.log(
            `Found ${reports.length} reports for contract ID ${contractId}`
        );

        if (reports.length === 0) {
            return res.status(404).json({ error: "Contract not found" });
        }

        const report = reports[0];
        console.log(
            `Contract status: ${report.status}, Report ID: ${
                report.id || "none"
            }`
        );

        // If no report exists yet or contract is still being analyzed
        if (!report.id || report.status === "analyzing") {
            return res.json({
                contractId: contractId,
                contractName: report.contract_name,
                contractAddress: report.contract_address,
                filename: report.filename,
                status: report.status,
                message:
                    report.status === "analyzing"
                        ? "Analysis in progress"
                        : report.status === "failed"
                        ? "Analysis failed"
                        : "Analysis pending",
            });
        }

        // Parse the JSON report with better error handling
        let reportJson;
        try {
            if (!report.report_json) {
                console.error("Report JSON is empty for report ID:", report.id);
                throw new Error("Report JSON is empty");
            }

            // Check if report_json is already an object (MySQL JSON type behavior)
            if (typeof report.report_json === "object") {
                console.log(
                    "Report JSON is already an object, no parsing needed"
                );
                reportJson = report.report_json;
            } else {
                // Log the raw report for debugging
                console.log(`Report JSON length: ${report.report_json.length}`);
                console.log(
                    "Raw report JSON preview:",
                    report.report_json.substring(0, 200) + "..."
                );
                reportJson = JSON.parse(report.report_json);
            }

            console.log("Successfully processed report JSON");
        } catch (error) {
            console.error("Error processing report JSON:", error);

            // Handle the case where report_json might be an object but not in the expected format
            if (typeof report.report_json === "object") {
                console.log(
                    "Report JSON structure:",
                    Object.keys(report.report_json)
                );
                return res.json({
                    id: report.id,
                    contractId: report.contract_id,
                    contractName: report.contract_name,
                    status: "completed",
                    error: "Report has unexpected structure",
                    reportStructure: Object.keys(report.report_json),
                });
            }

            return res.json({
                id: report.id,
                contractId: report.contract_id,
                contractName: report.contract_name,
                status: "failed",
                error: "Invalid report format: " + error.message,
            });
        }

        // Check if the report contains an error
        if (reportJson.error) {
            console.log("Report contains error:", reportJson.error);
            return res.json({
                id: report.id,
                contractId: report.contract_id,
                contractName: report.contract_name,
                status: "failed",
                error: reportJson.error,
            });
        }

        console.log("Report structure keys:", Object.keys(reportJson));

        // Format the response for a successful report
        try {
            const response = {
                id: report.id,
                contractId: report.contract_id,
                contractName: report.contract_name,
                contractAddress: report.contract_address,
                filename: report.filename,
                status: report.status,
                completionDate: report.completion_date,
                vulnerabilitySummary: {
                    total: report.vulnerability_count || 0,
                    highSeverity: report.high_severity_count || 0,
                    mediumSeverity: report.medium_severity_count || 0,
                    lowSeverity: report.low_severity_count || 0,
                },
                findings:
                    reportJson.results && reportJson.results.detectors
                        ? reportJson.results.detectors.map((finding) => ({
                              name: finding.check,
                              description: finding.description,
                              impact: finding.impact,
                              confidence: finding.confidence,
                              elements: finding.elements,
                          }))
                        : [],
            };

            console.log("Successfully created response object");
            res.json(response);
        } catch (formatError) {
            console.error("Error formatting response:", formatError);
            console.error("Error stack:", formatError.stack);
            throw formatError; // Re-throw to be caught by the outer catch
        }
    } catch (error) {
        console.error("Error retrieving report:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: "Failed to retrieve report" });
    }
});

// Improved debug endpoint
app.get("/api/report/:reportId/debug", async (req, res) => {
    try {
        const { reportId } = req.params;

        console.log(`Fetching report with ID: ${reportId}`);

        // Get the report from MySQL
        const [reports] = await mysqlPool.query(
            `SELECT ar.*, c.name as contract_name, c.address as contract_address, c.filename
             FROM analysis_reports ar
             JOIN contracts c ON ar.contract_id = c.id
             WHERE ar.id = ?`,
            [reportId]
        );

        console.log(`Found ${reports.length} reports`);

        if (reports.length === 0) {
            return res.status(404).json({ error: "Report not found" });
        }

        const report = reports[0];
        console.log(
            `Report for contract: ${report.contract_name}, ID: ${report.contract_id}`
        );

        // Return the raw report for debugging
        res.json({
            reportId: report.id,
            contractId: report.contract_id,
            contractName: report.contract_name,
            rawReportString: report.report_json, // Return as string without parsing
            reportLength: report.report_json ? report.report_json.length : 0,
            vulnerabilityCounts: {
                total: report.vulnerability_count,
                high: report.high_severity_count,
                medium: report.medium_severity_count,
                low: report.low_severity_count,
            },
        });
    } catch (error) {
        console.error("Error retrieving report:", error);
        res.status(500).json({
            error: "Failed to retrieve report",
            details: error.message,
        });
    }
});

// Endpoint to reset a stuck analysis
app.post("/api/contract/:contractId/reset", async (req, res) => {
    try {
        const { contractId } = req.params;

        // Check if contract exists and is in analyzing state
        const [contracts] = await mysqlPool.query(
            `SELECT id, filepath, status FROM contracts WHERE id = ? AND status = 'analyzing'`,
            [contractId]
        );

        if (contracts.length === 0) {
            return res.status(404).json({
                error: "Contract not found or not in 'analyzing' state",
            });
        }

        const contract = contracts[0];

        // Update status to pending
        await mysqlPool.query(
            `UPDATE contracts SET status = 'pending' WHERE id = ?`,
            [contractId]
        );

        // Start analysis again
        runSlitherAnalysis(contractId, contract.filepath);

        res.json({
            message: "Analysis reset and restarted",
            contractId: contractId,
            status: "pending",
        });
    } catch (error) {
        console.error("Error resetting analysis:", error);
        res.status(500).json({ error: "Failed to reset analysis" });
    }
});

// Add this endpoint for direct file reading
app.get("/api/report-file/:contractId", async (req, res) => {
    try {
        const { contractId } = req.params;
        const reportPath = path.join(
            __dirname,
            "reports",
            `report-${contractId}.json`
        );

        console.log(`Attempting to read report file: ${reportPath}`);

        if (!fs.existsSync(reportPath)) {
            return res.status(404).json({ error: "Report file not found" });
        }

        const fileContent = fs.readFileSync(reportPath, "utf8");
        console.log(`Read ${fileContent.length} bytes from file`);

        try {
            const reportData = JSON.parse(fileContent);
            res.json({
                success: true,
                reportStructure: Object.keys(reportData),
                hasResults: !!reportData.results,
                hasDetectors:
                    reportData.results && !!reportData.results.detectors,
                detectorCount:
                    reportData.results && reportData.results.detectors
                        ? reportData.results.detectors.length
                        : 0,
            });
        } catch (parseError) {
            res.status(500).json({
                error: "Failed to parse report file",
                filePreview: fileContent.substring(0, 500) + "...",
            });
        }
    } catch (error) {
        console.error("Error reading report file:", error);
        res.status(500).json({ error: "Failed to read report file" });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Internal server error",
        details:
            process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});