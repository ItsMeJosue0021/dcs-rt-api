const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./databaseConfig');

const pool = mysql.createPool(getDatabaseConfig());

module.exports = pool;
