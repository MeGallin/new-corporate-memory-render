# Your Corporate Memory - API

## Overview

This is the backend API for the "Your Corporate Memory" application. It is a Node.js application built with the Express framework, using MongoDB as the database with the Mongoose ODM. It provides a RESTful API for managing users, memories, and other application data.

## Features

*   **User Authentication:** Secure user registration and login using JSON Web Tokens (JWT). Includes password hashing with `bcryptjs`.
*   **Google OAuth:** Allows users to register and log in using their Google accounts.
*   **Password Management:** Functionality for users to request password resets via email.
*   **Memory Management:** Full CRUD (Create, Read, Update, Delete) operations for user-specific "memories".
*   **Reminders:** A daily cron job (`node-cron`) checks for memories with upcoming due dates and sends email reminders to users.
*   **Image Uploads:** Supports uploading user profile pictures and images for memories to Cloudinary.
*   **Admin Functionality:** A protected admin panel allows administrators to:
    *   View all users and their associated memories.
    *   Toggle user admin and suspended statuses.
    *   Delete users and all their associated data.
*   **Contact Form:** An endpoint to handle contact form submissions and send an email notification.
*   **Page Hit Counter:** Tracks unique IP address visits to the site.

## API Endpoints

The base URL for all endpoints is `/api`.

*   **`AdminRoute.js`**
    *   `GET /admin/user-details-memories`: Get all user and memory data (Admin only).
    *   `PUT /admin/user-is-admin/:id`: Toggle a user's admin status (Admin only).
    *   `PUT /admin/user-is-suspended/:id`: Toggle a user's suspended status (Admin only).
    *   `DELETE /admin/user-memories-delete/:id`: Delete a user and their memories (Admin only).
*   **`ConfirmationLinkRoute.js`**
    *   `GET /confirm-email/:token`: Endpoint for email confirmation link.
*   **`ContactFormRoute.js`**
    *   `POST /contact-form`: Submit the contact form.
*   **`MemoriesRoute.js`**
    *   `GET /memories`: Get all memories for the logged-in user.
    *   `POST /create-memory`: Create a new memory.
    *   `PUT /edit-memory/:id`: Update a specific memory.
    *   `DELETE /delete-memory/:id`: Delete a specific memory.
    *   `DELETE /delete-memory-tag/:id`: Delete a tag from a memory.
    *   `DELETE /delete-memory-image/:id`: Delete an image from a memory.
*   **`MemoryUploadImageRoutes.js`**
    *   `POST /memory-upload-image`: Upload an image for a memory.
*   **`PageHitsRoute.js`**
    *   `GET /page-hits`: Get the page hit count.
*   **`UserProfileImageRoutes.js`**
    *   `POST /user-profile-upload-image`: Upload a user profile image.
*   **`UserRoutes.js`**
    *   `POST /register`: Register a new user.
    *   `POST /login`: Log in a user.
    *   `POST /google-login`: Log in a user with Google.
    *   `GET /user-details`: Get details for the logged-in user.
    *   `PUT /user/:id`: Update user details.
    *   `DELETE /user-profile-image-delete/:id`: Delete a user's profile image.
    *   `POST /forgot-password`: Request a password reset email.
    *   `PUT /resetpassword/:token`: Reset a user's password.

## Data Models

*   **`UserModel`**: Stores user information including name, email, hashed password, admin/confirmation/suspension status, profile image details, and IP address history.
*   **`MemoriesModel`**: Stores memory details, including title, content, due date information, completion status, priority, tags, and associated images. It is linked to a `User`.
*   **`MemoryImageModel`**: Stores details about images uploaded for memories, including the Cloudinary URL and ID.
*   **`UserProfileImageModel`**: Stores details about user profile images.
*   **`PageHitsModel`**: Stores unique IP addresses for tracking page hits.

## Environment Variables

Create a `config.env` file in the root of the `api` directory with the following variables:

```
PORT=
MAILER_PW=
MAILER_HOST=
MAILER_USER=
MAILER_FROM=
MAILER_BCC=
MAILER_LOCAL_URL=
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRE=
RESET_PASSWORD_LOCAL_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_SECRET=
```

## Setup and Installation

1.  Navigate to the `api` directory.
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create the `config.env` file as described above.
4.  Run the server:
    *   For production: `npm start`
    *   For development with auto-reloading: `npm run server`

## Project Structure

```
/api
├───config/         # Database configuration
├───controllers/    # Route handling logic
├───middleWare/     # Custom middleware (e.g., authentication)
├───models/         # Mongoose data models (schemas)
├───routes/         # API route definitions
├───utils/          # Utility/helper functions
└───server.js       # Main application entry point
```