// Import pug
const pug = require('pug');
// Import nodemailer
const nodemailer = require('nodemailer');
// Import html to text
const htmlToText = require('html-to-text');

// Create email class that will handle emails for different scenarios
class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = `Miguel Garcia <${
            process.env.NODE_ENV === 'production'
                ? process.env.SENDGRID_EMAIL_FROM
                : this.from
        }>`;
    }

    // Method that creates transports for different environments and abstracts the logic
    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            // Setup transporter for sendgrid
            const transport = nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD,
                },
            });

            return transport;
        }

        // Create nodemailer transporter
        const transport = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        return transport;
    }

    async sendEmail(template, subject) {
        // Create HTML for email based on a pug template and pass data to it
        const html = pug.renderFile(
            `${__dirname}/../views/email/${template}.pug`,
            {
                firstName: this.firstName,
                url: this.url,
                subject,
            }
        );
        // Define the email options
        const mailOptions = {
            from:
                process.env.NODE_ENV === 'production'
                    ? process.env.SENDGRID_EMAIL_FROM
                    : this.from,
            // Options object parameter properties
            to: this.to,
            subject,
            html,
            // Simple text without html tags
            text: htmlToText.convert(html, { wordwrap: 100 }),
        };

        // Create transport and send email
        this.newTransport();
        // Send the email with the sendMail nodemailer function
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcomeEmail() {
        // Welcome pug template and subject line
        await this.sendEmail('welcome', 'Welcome to the Natours Family');
    }

    async sendPasswordReset() {
        await this.sendEmail(
            'passwordReset',
            'Your password reset token is valid only for 10 minutes'
        );
    }
}

module.exports = Email;
