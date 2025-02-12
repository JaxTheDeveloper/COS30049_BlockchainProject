// import modules
const express = require('express');
const app = express();
const dotenv = require('dotenv');

// enable cross-origin resource sharing
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Set up Neo4j driver
const driverGetter = async () => {
    // URI examples: 'neo4j://localhost', 'neo4j+s://xxx.databases.neo4j.io'
    const URI = process.env.DB_URI;
    const USER = process.env.DB_USER;
    const PASSWORD = process.env.DB_PASSWORD;
    let driver
    try {
      driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
      const serverInfo = await driver.getServerInfo()
      console.log('Connection established')
      console.log(serverInfo)
      return driver;
    } catch(err) {
      console.log(`Connection error\n${err}\nCause: ${err.cause}`)
    }
};

// api endpoint definitions

app.get("/api", (req, res) => {
    console.log("fetching data!")
    res.json({"users": ["userOne", "userTwo", "userThree", "userFour"]})
})

app.listen(5000, () => {
    console.log("server is running on port 5000!")
})