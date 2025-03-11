// import modules
const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
const neo4j = require("neo4j-driver");
const axios = require("axios");
const mysql = require("mysql2/promise");

// config dotenv
dotenv.config();

// get etherscan api key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_API_URL = "https://api.etherscan.io/api";

// get coingecko api url
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";

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
    return rows
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
app.post("/api/upload-contract", async (req, res) => {});

// get contract report
app.get("/api/report/:reportId", async (req, res) => {});

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
