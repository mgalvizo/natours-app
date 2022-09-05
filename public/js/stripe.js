/* eslint-disable */
'use strict';

import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async tourID => {
    try {
        // Get stripe object only on the particular tour details page where the script tag exists
        // to avoid "stripe" is undefined error
        const stripe = Stripe(
            'pk_test_51LdPfMJqKyX2cOs7JNkhgjVI2yIsJx2mLcwiiw8bwlze2unSwCvxhNASssAmOIlyqsLduV945WzHoQ2iICd5NxhP009Sp7x9Xg'
        );
        // Get checkout session from endpoint
        const session = await axios({
            method: 'GET',
            url: `/api/v1/bookings/checkout-session/${tourID}`,
        });

        // console.log(session);

        // Create checkout form and change the credit card
        await stripe.redirectToCheckout({ sessionId: session.data.session.id });
    } catch (error) {
        // console.log(error)
        showAlert('error', error);
    }
};
