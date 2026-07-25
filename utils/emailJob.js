// utils/emailJob.js

const sendEmail = require("./sendEmail");

const emailQueue = [];

let processing = false;

const processQueue = async () => {
  if (processing) return;

  processing = true;

  while (emailQueue.length > 0) {
    const job = emailQueue.shift();

    try {
      await sendEmail(job);

      console.log(
        `Email sent successfully to: ${job.to}`
      );

    } catch (err) {
      console.error(
        `Email failed for ${job.to}:`,
        err.message
      );
    }
  }

  processing = false;
};

const addEmailJob = (emailData) => {
  emailQueue.push(emailData);

  setImmediate(() => {
    processQueue();
  });
};

module.exports = addEmailJob;