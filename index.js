require('dotenv').config();
console.log("✅ Attempting to load env file from current directory");
console.log("📦 __dirname:", __dirname);
// console.log("📄 PRODUCTION_URL =", process.env.MONGODB_URI);

const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

const connectdb = require('./utils/db');
const scheduledTasks = require('./cron/scheduledTasks');

app.use(cors());
app.use(bodyParser.json());

app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.static("public"));
// app.use(express.static(path.join(__dirname, './public')));

app.get("/", async (req, res) => {
    res.json({ message: "test Welcome to Vishal Enterprise" });
});

require("./router/admin.routes")(app);
// require("./router/super_admin.routes")(app);
require("./router/user.routes")(app);
// require("./router/party.routes")(app);

const helperController = require('./helper/');
app.post("/api/upload-image", helperController.uploadFile);
app.post('/api/upload-multiple-image', helperController.uploadMutipleFiles);
app.post('/api/upload-excel', helperController.uploadExcelFiles);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.use('/xlsx-formats', express.static(path.join(__dirname, 'xlsx-formats')));
app.use('/xlsx', express.static(path.join(__dirname, 'xlsx')))



connectdb().then(() => {
    app.listen(port, () => console.log(`server is running on port  ${port}!`))
});