// Require stripe
const Stripe = require('stripe');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('../controllers/handlerFactory');

// Pass the secret key to stripe function
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // Get the currently booked tour
    const tour = await Tour.findById(req.params.tourID);
    // Check if the tour exists
    if (!tour) {
        return next(new AppError('There is no tour with that id', 404));
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        // The URL to which Stripe should send customers when payment or setup is complete.
        // The query string is not a secure method because anyone that knows the url structure
        // can access the url without paying (This is a temporary workaround)
        // success_url: `${req.protocol}://${req.get('host')}/currentUserTours/?tour=${
        //     req.params.tourID
        // }&user=${req.user.id}&price=${tour.price}`,
        success_url: `${req.protocol}://${req.get('host')}/currentUserTours`,
        // The URL the customer will be directed to if they decide to cancel payment and return to your website.
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        // We have access to the user's email because this is after the protect middleware
        customer_email: req.user.email,
        // A unique string to reference the Checkout Session. This can be a customer ID, a cart ID, or similar,
        // and can be used to reconcile the session with your internal systems.
        client_reference_id: req.params.tourID,
        // A list of items the customer is purchasing. Use this parameter to pass one-time or recurring Prices.
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${tour.name} tour`,
                        description: tour.summary,
                        // live images hosted in the internet
                        images: [
                            `${req.protocol}://${req.get('host')}/img/tours/${
                                tour.imageCover
                            }`,
                        ],
                    },
                    // Price in cents
                    unit_amount: tour.price * 100,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
    });
    // Create checkout session as response
    res.status(200).json({
        status: 'success',
        session,
    });
});

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//     // Get the data from the query string
//     const { tour, user, price } = req.query;

//     if (!tour && !user && !price) {
//         return next();
//     }

//     await Booking.create({ tour, user, price });

//     // Remove the query string from the success url and redirec to "/"
//     // Creates a request to the "/" route, since we are hitting that route
//     // for a second time tour, user and price won't be defined so the next middleware will run
//     // which is loading the overview page
//     res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = catchAsync(async session => {
    // Get the tour id
    const tour = session.client_reference_id;
    // Get the user id
    const user = (await User.findOne({ email: session.customer_email })).id;
    // Price in dollars
    price = session.line_items[0].price_data.unit_amount / 100;

    await Booking.create({ tour, user, price });
});

exports.webhookCheckout = catchAsync(async (req, res, next) => {
    // Read the signature from the headers
    const signature = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_ENDPOINT_SECRET
        );
    } catch (error) {
        res.status(400).send(`Webhook Error: ${error.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            // Then define and call a function to handle the event checkout.session.completed
            createBookingCheckout(session);
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({
        received: true,
    });
});

exports.createBooking = factory.createOne(Booking);

exports.getBooking = factory.getOne(Booking);

exports.getAllBookings = factory.getAll(Booking);

exports.updateBooking = factory.updateOne(Booking);

exports.deleteBooking = factory.deleteOne(Booking);
