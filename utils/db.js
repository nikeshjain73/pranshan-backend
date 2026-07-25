const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;
// const URI = process.env.DEV_MONDODB_URI;
// const URI = process.env.PRODUCTION_URL;

// Addon ERP

// const URI = process.env.ADDON_EPR;

const connectdb = async () => {
    try {
        await mongoose.connect(URI);
        console.log('connection successful to database');
    } catch (error) {
        console.log('database connection failed');
        console.log(error);
        process.exit(0);
    }
}

module.exports = connectdb;