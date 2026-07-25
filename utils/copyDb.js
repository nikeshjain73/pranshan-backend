// const { MongoClient } = require('mongodb');

// const sourceUri = 'mongodb+srv://infinate:ZEHVE7lZG3qahPYV@infinatepa.h5pvp9c.mongodb.net/payrole-system'; // DEV URL
// const destinationUri = 'mongodb+srv://VishalTestProject:ybi1zHDFrtWsjCyQ@vishaltestproject.6v8uc.mongodb.net/'; // TEST URL

// const destinationUri = 'mongodb+srv://addonwebtech:Kem7UAddon%40DUv1V%23webVgKJxoG@vishalpms.zvvhc.mongodb.net/'   // Production URL

// const destinationUri = 'mongodb+srv://addonwebtech:SBSSsOTEvSZpMg7U@addondemoerpdb.aerov.mongodb.net/'   // Addon ERP URL

// async function copyDatabase() {
//     const sourceClient = new MongoClient(sourceUri, { useNewUrlParser: true, useUnifiedTopology: true });
//     const destinationClient = new MongoClient(destinationUri, { useNewUrlParser: true, useUnifiedTopology: true });

//     try {
//         await sourceClient.connect();
//         await destinationClient.connect();

//         console.log('Connected to both source and destination databases');

//         const sourceDb = sourceClient.db('payrole-system');
//         const destinationDb = destinationClient.db('payrole-system');

//         const collections = await sourceDb.listCollections().toArray();

//         console.log(collections, 'COllection');

//         for (const collectionInfo of collections) {
//             const collectionName = collectionInfo.name;
//             console.log(`Copying collection: ${collectionName}`);
//             const documents = await sourceDb.collection(collectionName).find().toArray();
//             if (documents.length > 0) {
//                 await destinationDb.collection(collectionName).insertMany(documents);
//                 console.log(`Successfully copied ${documents.length} documents from ${collectionName}`);
//             } else {
//                 console.log(`No documents to copy in collection: ${collectionName}`);
//             }
//         }

//         console.log('Database copy completed successfully!');
//     } catch (error) {
//         console.error('Error during database copy:', error);
//     } finally {
//         await sourceClient.close();
//         await destinationClient.close();
//     }
// }

// copyDatabase().catch(console.error);