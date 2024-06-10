const express = require("express");
const axios = require("axios");
const path = require("path");

const cors = require("cors");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { error } = require("console");
const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "productData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();


const monthMap = {
  'january': '01',
  'february': '02',
  'march': '03',
  'april': '04',
  'may': '05',
  'june': '06',
  'july': '07',
  'august': '08',
  'september': '09',
  'october': '10',
  'november': '11',
  'december': '12',
};


app.get("/transactions", async (req, res) => {
  try {
    const { month = "07", search, page = 1, perPage = 10 } = req.query;
    const offset = (page - 1) * perPage;

    let sqlQuery = `SELECT * FROM products WHERE strftime('%m', dateOfSale) = ?`;

    const params = [month.padStart(2, "0")];


    if (search) {
      sqlQuery += ` AND (title LIKE ? OR description LIKE ? OR price = ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlQuery += ` LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const output = await db.all(sqlQuery, params);
    res.json({
      page,
      perPage,
      transactions: output,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/statistics", async (req, res) => {
  try {
    const { month = "07" } = req.query;

    const totalSaleQuery = `SELECT SUM(price) AS totalSale FROM products WHERE strftime('%m', dateOfSale) = ? AND sold = 1`;
    const soldItemsQuery = `SELECT COUNT(*) AS soldItems FROM products WHERE strftime('%m', dateOfSale) = ? AND sold = 1`;
    const notSoldItemsQuery = `SELECT COUNT(*) AS notSoldItems FROM products WHERE strftime('%m', dateOfSale) = ? AND sold = 0`;

    const params = [month.padStart(2, "0")];

    const totalSale = await db.get(totalSaleQuery, params);
    const soldItems = await db.get(soldItemsQuery, params);
    const notSoldItems = await db.get(notSoldItemsQuery, params);

    res.json({
      totalSale: totalSale.totalSale,
      soldItems: soldItems.soldItems,
      notSoldItems: notSoldItems.notSoldItems,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/bar-chart", async (req, res) => {
  try {
    const { month = "07" } = req.query;
    const sqlQuery = `
    SELECT 
      CASE
        WHEN price BETWEEN 0 AND 100 THEN '0-100'
        WHEN price BETWEEN 101 AND 200 THEN '101-200'
        WHEN price BETWEEN 201 AND 300 THEN '201-300'
        WHEN price BETWEEN 301 AND 400 THEN '301-400'
        WHEN price BETWEEN 401 AND 500 THEN '401-500'
        WHEN price BETWEEN 501 AND 600 THEN '501-600'
        WHEN price BETWEEN 601 AND 700 THEN '601-700'
        WHEN price BETWEEN 701 AND 800 THEN '701-800'
        WHEN price BETWEEN 801 AND 900 THEN '801-900'
        ELSE '901+'
      END AS priceRange,
      COUNT(*) AS itemCount
    FROM products
    WHERE strftime('%m', dateOfSale) = ?
    GROUP BY priceRange
  `;

    const params = [month.padStart(2, "0")];

    const output = await db.all(sqlQuery, params);

    res.json({
      output,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/pie-chart", async (req, res) => {
  try {
    const { month = "07" } = req.query;
    const sqlQuery = `
    SELECT category, COUNT(*) AS itemCount
    FROM products
    WHERE strftime('%m', dateOfSale) = ?
    GROUP BY category
  `;
    const params = [month.padStart(2, "0")];

    const output = await db.all(sqlQuery, params);
    res.json(output);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/combined-response", async (req, res) => {
  const { month } = req.query;

  try {
    const transactionsResponse = await axios.get(
      "http://localhost:3000/transactions",
      { params: { month } }
    );
    const statisticsResponse = await axios.get(
      "http://localhost:3000/statistics",
      { params: { month } }
    );
    const barChartResponse = await axios.get(
      "http://localhost:3000/bar-chart",
      { params: { month } }
    );
    const pieChartResponse = await axios.get(
      "http://localhost:3000/pie-chart",
      { params: { month } }
    );

    res.json({
      transactions: transactionsResponse.data,
      statistics: statisticsResponse.data,
      bar_chart: barChartResponse.data,
      pie_chart: pieChartResponse.data,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch combined data" });
  }
});
