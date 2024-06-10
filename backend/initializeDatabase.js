const sqlite3 = require("sqlite3");
const axios = require("axios");

const url = "https://s3.amazonaws.com/roxiler.com/product_transaction.json";

const db = new sqlite3.Database("productData.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    initializeDatabase();
  }
});

async function initializeDatabase() {
  db.run(
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      price REAL,
      description TEXT,
      category TEXT,
      image TEXT,
      sold BOOLEAN,
      dateOfSale DATETIME
    )`,
    (err) => {
      if (err) {
        console.error("Error creating table:", err.message);
      } else {
        fetchDataAndInsert();
      }
    }
  );
}

async function fetchDataAndInsert() {
  try {
    const response = await axios.get(url);
    const jsonData = response.data;

    const insertStatement = db.prepare(
      "INSERT INTO products (title, price, description, category, image, sold, dateOfSale) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    db.serialize(() => {
      jsonData.forEach((product) => {
        insertStatement.run(
          product.title,
          product.price,
          product.description,
          product.category,
          product.image,
          product.sold,
          product.dateOfSale
        );
      });
      insertStatement.finalize((err) => {
        if (err) {
          console.error("Error finalizing statement:", err.message);
        } else {
          console.log("Database initialized with seed data.");
        }

        db.close((err) => {
          if (err) {
            console.error("Error closing database:", err.message);
          } else {
            console.log("Database connection closed.");
          }
        });
      });
    });
  } catch (err) {
    console.error("Error fetching data from the URL:", err.message);
  }
}
