// Require path
const path = require('path');
// Require express
const express = require('express');
// Require morgan
const morgan = require('morgan');
// Require express rate limit
const rateLimit = require('express-rate-limit');
// Require helmet
const helmet = require('helmet');
// Require express-mongo-sanitize
const mongoSanitize = require('express-mongo-sanitize');
// Require xss-clean
const xss = require('xss-clean');
// Require hpp
const hpp = require('hpp');
// Require cookie parser
const cookieParser = require('cookie-parser');
// Require compression
const compression = require('compression');
// Require cors
const cors = require('cors');

// Importing AppError class
const AppError = require('./utils/appError');
// Importing Global Error Handling Function
const globalErrorHandler = require('./controllers/errorController');
// Importing the routers
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
// Import Booking controller for stripe checkout function
const bookingController = require('./controllers/bookingController');

// Run express and save it in app
const app = express();

// Enable trust proxy
app.enable('trust proxy');

// Set the template view engine
app.set('view engine', 'pug');
// Define the path of the view templates
app.set('views', path.join(__dirname, 'views'));

/*
// GLOBAL MIDDLEWARE
*/

// Implement CORS
// Sets the Allow-Control-Allow-Origin header to * (everything)
app.use(cors());

// OPTIONS is another http method that we can respond to.
// Enable pre-flight to handle DELETE, PUT and PATCH methods.
app.options('*', cors());

// Use built-in middleware to serve static files
// app.use(express.static(`${__dirname}/public`));
// Use path.join to prevent bugs
app.use(express.static(path.join(__dirname, 'public')));

// Add helmet at the beginning of the global middleware stack so the headers are sure to be set
// Set security HTTP headers
const host = '127.0.0.1';
const nodemonPort = '8000';

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            'script-src': [
                "'self'",
                'https://*.tiles.mapbox.com',
                'https://api.mapbox.com',
                'https://events.mapbox.com',
                'https://cdn.jsdelivr.net',
                `http://${host}:${nodemonPort}/`,
                `https://js.stripe.com/`,
            ],
            'worker-src': ["'self'", 'blob:'],
            'child-src': ["'self'", 'blob:', `https://js.stripe.com/`],
            'img-src': ["'self'", 'data:', 'blob:'],
            'connect-src': [
                'https://*.tiles.mapbox.com',
                'https://api.mapbox.com',
                'https://events.mapbox.com',
                'https://cdn.jsdelivr.net',
                `http://${host}:${nodemonPort}/`,
                'ws://127.0.0.1:*/',
                'https://enigmatic-bayou-81118.herokuapp.com/',
            ],
        },
    })
);

if (process.env.NODE_ENV === 'development') {
    // Morgan middleware
    app.use(morgan('dev'));
}

// Create limiter to limit requests from the same API
// Adapt the number of requests according to your application for some of them
// 100 is not enough to be usable
const limiter = rateLimit({
    max: 100, // number of requests
    windowMS: 60 * 60 * 1000, // window in milliseconds, in this case 1 hour,
    message: 'Too many requests from this IP, try again later',
});

// Apply the limiter only to the endpoint
app.use('/api', limiter);

// Adding the stripe route before body parser because we need the body as raw, NOT as json.
app.post(
    '/webhook-checkout',
    express.raw({ type: 'application/json' }),
    bookingController.webhookCheckout
);

// Body parser
// Use middleware to add the data from the body to the request object and limit the size to 10kb
// Reading the data from the body into req.body
app.use(express.json({ limit: '10kb' }));
// Use urlencoded to parse data from form
app.use(
    express.urlencoded({
        extended: true,
        limit: '10kb',
    })
);
// Use cookie parser to parse the data from the cookie
app.use(cookieParser());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS (Cross-Site-Scripting)
app.use(xss());

// Prevent parameter pollution, use it by the end because it cleans the query string
// Whitelisting some parameters
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price',
        ],
    })
);

// Use the compression middleware near the end stack.
app.use(compression());

// Test middleware
app.use((req, res, next) => {
    // Add a property to the request object
    req.requestTime = new Date().toISOString();
    // console.log('cookies:', req.cookies);
    next();
});

// Mounting the router into the route as middleware for views
app.use('/', viewRouter);
// Mounting the router into the route as middleware for tours
app.use('/api/v1/tours', tourRouter);
// Mounting the router into the route as middleware for users
app.use('/api/v1/users', userRouter);
// Mounting the router into the route as middleware for reviews
app.use('/api/v1/reviews', reviewRouter);
// Mounting the router into the route as middleware for bookings
app.use('/api/v1/bookings', bookingRouter);
// This middleware will be reached if our routers couldn't handle a route
// Has to be the last part of our middleware routes
app.all('*', (req, res, next) => {
    // Create a new AppError object from the class
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Using Global Error Handling Middleware
app.use(globalErrorHandler);

// Export app
module.exports = app;
