const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Let the client get a checkout session
router.get('/checkout-session/:tourID', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
    .route('/')
    .get(bookingController.getAllBookings)
    .post(bookingController.createBooking);

router
    .route('/:id')
    .get(bookingController.getBooking)
    .patch(bookingController.updateBooking)
    .delete(bookingController.deleteBooking);

// Adding the stripe route with the express.raw() middleware
app.post(
    '/webhook-checkout',
    express.raw({ type: 'application/json' }),
    bookingController.webhookCheckout
);

module.exports = router;
