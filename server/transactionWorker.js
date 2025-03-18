const { workerData, parentPort } = require('worker_threads');
const axios = require('axios');

// Add this at the top of the file
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

// Function to fetch transactions from Etherscan
async function fetchTransactions(address, page, offset, apiUrl, apiKey) {
    try {
        console.log(`[WORKER ${process.pid}] Fetching transactions for ${address}, page ${page}, offset ${offset}`);
        
        // Add some delay to avoid rate limiting - more sophisticated with exponential backoff
        const delayTime = Math.min(1000 * (page % 5) + Math.floor(Math.random() * 1000), 5000);
        await new Promise(resolve => setTimeout(resolve, delayTime));
        
        let response;
        let retries = 0;
        let success = false;
        
        // Implement retry logic with exponential backoff
        while (!success && retries < MAX_RETRIES) {
            try {
                response = await axios.get(apiUrl, {
                    params: {
                        module: "account",
                        action: "txlist",
                        address: address,
                        startblock: 0,
                        endblock: 99999999,
                        page: page,
                        offset: offset,
                        sort: "desc",
                        apikey: apiKey,
                    },
                    timeout: 15000, // 15 second timeout for background tasks
                });
                
                // Check for API errors
                if (response.data.message === "NOTOK") {
                    // If we hit rate limit, wait longer before retry
                    if (response.data.result.includes("rate limit")) {
                        const waitTime = (retries + 1) * RETRY_DELAY;
                        console.log(`[WORKER ${process.pid}] Rate limited, waiting ${waitTime/1000} seconds before retry`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        retries++;
                        continue;
                    } else {
                        throw new Error(`Etherscan API error: ${response.data.result}`);
                    }
                }
                
                success = true;
            } catch (error) {
                retries++;
                const waitTime = retries * RETRY_DELAY;
                console.log(`[WORKER ${process.pid}] Fetch attempt ${retries}/${MAX_RETRIES} failed: ${error.message}. Waiting ${waitTime/1000} seconds.`);
                
                if (retries >= MAX_RETRIES) {
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        // Process transactions
        const transactions = 
            response.data.result && 
            Array.isArray(response.data.result)
                ? response.data.result.map((tx) => ({
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
        
        // Debug output for transactions
        console.log(`[WORKER ${process.pid}] Found ${transactions.length} transactions for ${address} on page ${page}`);
        
        // Log transaction details (first 3 and last 3 for large batches)
        if (transactions.length > 0) {
            const logLimit = Math.min(3, transactions.length);
            console.log(`[WORKER ${process.pid}] First ${logLimit} transactions:`);
            
            for (let i = 0; i < logLimit; i++) {
                const tx = transactions[i];
                console.log(`[WORKER ${process.pid}] TX #${i+1}: Hash=${tx.hash.substring(0, 10)}... | From=${tx.from.substring(0, 10)}... | To=${tx.to ? tx.to.substring(0, 10) : 'null'}... | Value=${tx.value} ETH`);
            }
            
            // If there are more than 6 transactions, show the last 3 as well
            if (transactions.length > 6) {
                console.log(`[WORKER ${process.pid}] ... ${transactions.length - 6} more transactions ...`);
                console.log(`[WORKER ${process.pid}] Last 3 transactions:`);
                
                for (let i = transactions.length - 3; i < transactions.length; i++) {
                    const tx = transactions[i];
                    console.log(`[WORKER ${process.pid}] TX #${i+1}: Hash=${tx.hash.substring(0, 10)}... | From=${tx.from.substring(0, 10)}... | To=${tx.to ? tx.to.substring(0, 10) : 'null'}... | Value=${tx.value} ETH`);
                }
            }
        }
        
        // Check if there are more transactions to fetch
        const hasMoreTransactions = transactions.length === offset;
        
        return {
            transactions,
            hasMoreTransactions,
            nextPage: page + 1,
            page: page,
            offset: offset
        };
    } catch (error) {
        console.error(`[WORKER ${process.pid}] Error fetching transactions: ${error.message}`);
        return {
            transactions: [],
            hasMoreTransactions: false,
            error: error.message,
            page: page
        };
    }
}

// Process the task
async function processTask() {
    if (workerData.task === 'fetchTransactions') {
        const { address, page, offset, apiUrl, apiKey } = workerData;
        console.log(`[WORKER ${process.pid}] Starting task: fetch transactions for ${address}, page ${page}`);
        
        const result = await fetchTransactions(address, page, offset, apiUrl, apiKey);
        
        console.log(`[WORKER ${process.pid}] Task completed: ${result.transactions.length} transactions fetched, more data: ${result.hasMoreTransactions}`);
        
        parentPort.postMessage({
            type: 'transactions',
            address: address,
            transactions: result.transactions,
            hasMoreTransactions: result.hasMoreTransactions,
            nextPage: result.nextPage,
            error: result.error
        });
    } else {
        console.log(`[WORKER ${process.pid}] Unknown task: ${workerData.task}`);
        parentPort.postMessage({
            type: 'error',
            error: `Unknown task: ${workerData.task}`
        });
    }
}

// Start processing
processTask(); 