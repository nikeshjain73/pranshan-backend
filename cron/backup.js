require("dotenv").config();

const cron = require("node-cron");
const { exec } = require("child_process");

cron.schedule("0 * * * *", () => {
  const date = new Date().toISOString().split("T")[0];
  
  const command = `mongodump --uri="${process.env.MONGODB_URI}" --archive=./backups/backup-${date}.gz --gzip`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log("Backup failed:", error);
      return;
    }

    console.log("Backup successful");
  });
});

console.log("Backup scheduler running...");