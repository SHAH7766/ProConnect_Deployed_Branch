# ProConnect Admin Server

Separate admin API and control panel for managing ProConnect users and providers.

## Run

```bash
cd Admin_Server
npm install
npm run dev
```

Open:

```txt
http://localhost:8081
```

The server loads environment variables from `Admin_Server/.env` first and then falls back to `../Server/.env`, so it can reuse your existing `DATABASE_URL` and `SECRET_KEY`.

Use `ADMIN_PORT=8081` if you want to change the admin server port. The admin server ignores the main app's `PORT` value so it does not accidentally run on the same port as `Server`.

## Database Timeout

If you see:

```txt
MongooseError: Operation `users.findOne()` buffering timed out after 10000ms
```

MongoDB is not connected when the admin panel tries to query users. Check that `DATABASE_URL` is correct, your internet connection is available, and your MongoDB Atlas network access allows your current IP address.

## Admin Login

Use a user account whose `role` is `admin`. In the current ProConnect app, the first registered user is created as admin.

## API

- `POST /api/admin/login`
- `GET /api/admin/me`
- `GET /api/admin/summary`
- `GET /api/admin/accounts`
- `GET /api/admin/users`
- `GET /api/admin/providers`
- `PUT /api/admin/providers/:id/activate`
- `PUT /api/admin/providers/:id/deactivate`
- `DELETE /api/admin/users/:id`
- `DELETE /api/admin/providers/:id`
