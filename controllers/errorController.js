// require AppError
const AppError = require('../utils/appError');

const handleCastErrorDB = error => {
    const message = `Invalid ${error.path}: ${error.value}.`;
    // transform the error into operational
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = error => {
    const value = error.keyValue.name;
    const message = `Duplicate field value: "${value}". Please use a different value.`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = error => {
    // Loop the error object to create the error string
    // Object.values returns an array which can be mapped
    const errors = Object.values(error.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

// We don't pass error since it is not used
const handleJWTError = () => new AppError(`Invalid token, Please log in`, 401);
// We don't pass error since it is not used
const handleJWTExpiredError = () =>
    new AppError(`Expired token, Please log in`, 401);

const sendErrorDevelopment = (error, req, res) => {
    // req.originalUrl gets the complete url without the host
    // Check if the url starts with /api
    if (req.originalUrl.startsWith('/api')) {
        return res.status(error.statusCode).json({
            status: error.status,
            error,
            message: error.message,
            stack: error.stack,
        });
    }

    console.error('ERROR', error);
    // Render an error template
    return res.status(error.statusCode).render('error', {
        title: 'Something went wrong',
        message: error.message,
    });
};

const sendErrorProduction = (error, req, res) => {
    // It the error is operational send the actual error message if not send a generic message
    const errorMessage = error.isOperational
        ? error.message
        : 'Please try again later.';

    !error.isOperational && console.error('ERROR', error);

    // Check if the url starts with /api
    if (req.originalUrl.startsWith('/api')) {
        return res.status(error.statusCode).json({
            status: error.status,
            message: errorMessage,
        });
    }

    // Render an error template
    return res.status(error.statusCode).render('error', {
        title: 'Something went wrong',
        message: errorMessage,
    });
};

// Global Error Handling Function
module.exports = (error, req, res, next) => {
    // default error status code
    error.statusCode = error.statusCode || 500;
    // default error status
    error.status = error.status || 'fail';

    // Distinguish errors from development and production
    if (process.env.NODE_ENV === 'development') {
        sendErrorDevelopment(error, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        // create a copy of the error object can't use {...error}
        // since some important properties are enumerable and the
        // spread operator doesn't copy them
        let errorCopy = Object.create(error);
        // Handle invalid IDs
        if (errorCopy.name === 'CastError') {
            errorCopy = handleCastErrorDB(errorCopy);
        }
        // Handle duplicate database fields
        if (errorCopy.code === 11000) {
            errorCopy = handleDuplicateFieldsDB(errorCopy);
        }
        // Handle Mongoose Validation Errors
        if (error.name === 'ValidationError') {
            errorCopy = handleValidationErrorDB(errorCopy);
        }
        if (error.name === 'JsonWebTokenError') {
            errorCopy = handleJWTError(errorCopy);
        }
        if (error.name === 'TokenExpiredError') {
            errorCopy = handleJWTExpiredError(errorCopy);
        }
        sendErrorProduction(errorCopy, req, res);
    }
};
