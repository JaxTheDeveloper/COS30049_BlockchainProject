// import modules
const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const axios = require("axios");
const mysql = require("mysql2/promise");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const util = require("util");
const execPromise = util.promisify(exec);
const crypto = require("crypto");

// config dotenv
dotenv.config();

// get etherscan api key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_API_URL = "https://api.etherscan.io/api";

// get coingecko api url
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
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
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('pending', 'analyzing', 'completed', 'failed') DEFAULT 'pending'
            )
        `);

        // Create analysis_reports table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS analysis_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contract_id INT NOT NULL,
                report_json JSON,
                vulnerability_count INT DEFAULT 0,
                high_severity_count INT DEFAULT 0,
                medium_severity_count INT DEFAULT 0,
                low_severity_count INT DEFAULT 0,
                completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contract_id) REFERENCES contracts(id)
            )
        `);

        console.log("MySQL tables initialized successfully");
    } catch (error) {
        console.error("Error initializing MySQL tables:", error);
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
            txListResponse.data.message === "NOTOK"
        ) {
            throw new Error(
                "Etherscan API rate limit exceeded. Please try again later."
            );
        }

        // Process balance
        const balance = balanceResponse.data.result
            ? (parseFloat(balanceResponse.data.result) / 1e18).toFixed(6)
            : "0.000000";

        // Process transactions
        const transactions =
            txListResponse.data.result &&
            Array.isArray(txListResponse.data.result)
                ? txListResponse.data.result.map((tx) => ({
                      hash: tx.hash,
                      from: tx.from,
                      to: tx.to,
                      value: (parseFloat(tx.value) / 1e18).toFixed(6),
                      timestamp: new Date(
                          parseInt(tx.timeStamp) * 1000
                      ).toISOString(),
                      gasPrice: tx.gasPrice,
                      gasUsed: tx.gasUsed,
                      isError: tx.isError === "1",
                  }))
                : [];

        return {
            address,
            balance,
            transactionCount: transactions.length,
            recentTransactions: transactions,
        };
    } catch (error) {
        console.error("Etherscan API Error:", error.message);
        throw new Error(`Failed to fetch wallet data: ${error.message}`);
    }
}

async function getMarketData() {
    try {
        // Fetch ETH price and market data from CoinGecko
        const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
            params: {
                ids: "ethereum",
                vs_currencies: "usd",
                include_market_cap: true,
                include_24hr_vol: true,
                include_last_updated_at: true,
            },
        });

        const ethData = response.data.ethereum;

        // Fetch total transactions from Etherscan
        const txCountResponse = await axios.get(ETHERSCAN_API_URL, {
            params: {
                module: "proxy",
                action: "eth_blockNumber",
                apikey: ETHERSCAN_API_KEY,
            },
        });

        const blockNumber = parseInt(txCountResponse.data.result, 16);

        return {
            price: ethData.usd.toFixed(2),
            marketCap: (ethData.usd_market_cap / 1e9).toFixed(1), // Convert to billions
            transactions: "1,234.56 M", // This is a placeholder, as real-time tx count requires premium API
            lastBlock: blockNumber,
            lastUpdated: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Error fetching market data:", error);
        throw error;
    }
}

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

        // Get wallet data from Etherscan
        const walletData = await getEtherscanData(address);

        const session = neo4jDriver.session();
        try {
            // Store/update main wallet data
            await session.run(
                `MERGE (w:Address {address: $address})
                 SET w.balance = $balance,
                     w.transactionCount = $transactionCount`,
                {
                    address: walletData.address,
                    balance: walletData.balance,
                    transactionCount: walletData.transactionCount,
                }
            );

            // Process each transaction
            for (const tx of walletData.recentTransactions) {
                // Ensure both addresses exist

                console.log(
                    "balace:",
                    (await getEtherscanData(tx.from)).balance
                );

                await session.run(
                    `MERGE (from:Address {address: $fromAddress})
                     ON CREATE SET from.transactionCount = "$fromTransactionCount", from.balance = "$fromBalance"
                     MERGE (to:Address {address: $toAddress})
                     ON CREATE SET to.transactionCount = "$toTransactionCount", to.balance = "$toBalance"`,
                    {
                        fromAddress: tx.from,
                        // fromTransactionCount: getEtherscanData(tx.from, 1, 0).transactionCount,
                        // fromBalance: getEtherscanData(tx.from, 1, 0).balance,
                        fromTransactionCount: 100,
                        fromBalance: 100,
                        toAddress: tx.to,
                        // toTransactionCount: getEtherscanData(tx.to, 1, 0).transactionCount,
                        // toBalance: getEtherscanData(tx.to, 1, 0).balance,
                        toTransactionCount: 100,
                        toBalance: 100,
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
                                value: tx.value,
                                timeStamp: tx.timeStamp,
                                gasPrice: tx.gasPrice,
                                gasUsed: tx.gasUsed,
                                functionName: tx.functionName || "",
                                blockNumber: tx.blockNumber,
                                type: "out",
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
                                value: tx.value,
                                timeStamp: tx.timeStamp,
                                gasPrice: tx.gasPrice,
                                gasUsed: tx.gasUsed,
                                functionName: tx.functionName || "",
                                blockNumber: tx.blockNumber,
                                type: "in",
                            },
                        }
                    );
                }
            }

            // delete lonely nodes
            await session.run(
                `
                MATCH (a:Address)
                 WHERE NOT (a)-[:HAS_TRANSACTION]-() 
                 DETACH DELETE a;
                `
            );

            // Return the same response format
            return res.json({
                address: walletData.address,
                balance: walletData.balance,
                transactionCount: walletData.transactionCount,
                recentTransactions: walletData.recentTransactions,
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

// handling contract uploads
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

            // Calculate SHA256 hash of the contract contents
            const fileContent = fs.readFileSync(req.file.path, "utf8");
            const hash = crypto
                .createHash("sha256")
                .update(fileContent)
                .digest("hex");

            // Insert contract info into MySQL
            const [result] = await mysqlPool.query(
                `INSERT INTO contracts (name, address, filename, filepath, contract_hashcode, status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
                [
                    name,
                    address || null,
                    req.file.originalname,
                    req.file.path,
                    hash,
                ]
            );

            const contractId = result.insertId;

            // Start Slither analysis in the background
            runSlitherAnalysis(contractId, req.file.path);

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

// Function to run Slither analysis with timeout
async function runSlitherAnalysis(contractId, filePath) {
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

        // Run Slither with JSON output - use double quotes for Windows paths
        const command = `slither "${filePath}" --json "${outputPath}"`;
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
