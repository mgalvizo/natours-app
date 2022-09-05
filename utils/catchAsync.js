// Wrapper function that catches async errors
// Creates layers so the inner function is run, but an outer function is
// returned and asigned to the const variable that Express will then call.
// Since it is an async funcion it will return a promise, in case it is rejected
// the catch method will catch the error and pass it to next(), finally next()
// will be handled with the global error handling middleware
// We receive a function as a parameter
module.exports = fn => (req, res, next) => {
    // Run the function
    // We have to add the next parameter to pass the error and that error
    // can be handled with the global error handling middleware
    fn(req, res, next).catch(next);
};
