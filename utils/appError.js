// The class handles only Operational Errors
// Extend the built-in error object
class AppError extends Error {
    // This are the parameters passed to an object created from the class
    // or instance of the class
    constructor(message, statusCode) {
        // Call the parent constructor with message because the built-in
        // error object only supports that parameter
        // We don't set this.message = message because we are already sending the message
        // property in super()
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        // To identify if it is an operational or programming error
        this.isOperational = true;

        // Create stack property on a target object
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
