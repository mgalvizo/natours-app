// Require mongoose
const mongoose = require('mongoose');
// Import dotenv
const dotenv = require('dotenv');
// Specify the path of the configuration file
dotenv.config({ path: './config.env' });

// Has to be before requiring the main application
process.on('uncaughtException', error => {
    console.log(error.name, error.message);
    console.log('Uncaught Exception, shutting down...');
    process.exit(1);
});

// Import app
const app = require('./app');

// connection string
const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

// Mongoose connection function to remote DB
mongoose.connect(DB).then(() => {
    console.log('DB connection successful');
});

const host = '127.0.0.1';
const port = process.env.PORT || 3000;

// Start a server
const server = app.listen(port, () => {
    // console.log(`App running on http://${host}:${port}/`);
    console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', error => {
    console.log(error.name, error.message);
    console.log('Unhandled Rejection, shutting down...');
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED. shutting down...');
    server.close(() => {
        console.log('Process terminated');
    });
});
