const cron = require('node-cron');
const { expireWelder } = require('../controllers/erp/QualifiedWelder/qualifiedWelder.controller');
const { syncPunchLogs, processDailyAttendance } = require('../controllers/punch_machine.controller');

cron.schedule('5 0 * * *', () => {
    expireWelder();
    console.log('Running expired welder update job every day at 12:05 AM');
});

// cron.schedule('*/5 7-21 * * *', () => {
//     syncPunchLogs();
//     console.log('Running punch log sync every 5 min between 7 AM and 9 PM');
// });

// cron.schedule('*/1 7-21 * * *', async () => {
//     const now = new Date();
//     try {
//         await processDailyAttendance();
//         console.log(`✅ Punch sync ran at ${now.toLocaleTimeString()}`);
//     } catch (err) {
//         console.error(`❌ Error in punch sync at ${now.toLocaleTimeString()}`, err);
//     }
// });

// Runs every 4 minutes all day
// cron.schedule('*/4 * * * *', () => {
//     syncPunchLogs();
//     console.log('Running punch log sync every 4 min');
// });

// cron.schedule('*/5 * * * *', async () => {
//     const now = new Date();
//     try {
//         await processDailyAttendance();
//         console.log(`✅ Punch sync ran at ${now.toLocaleTimeString()}`);
//     } catch (err) {
//         console.error(`❌ Error in punch sync at ${now.toLocaleTimeString()}`, err);
//     }
// });
