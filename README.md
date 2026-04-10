# Education Portal MERN App

A reusable education module built on MERN-style architecture for AWS-friendly hosting.

## What it does

- Public course catalog and brochure pages
- Role-based login and first-run admin bootstrap
- Admin course builder for creating and editing courses dynamically
- Brochure PDF, course downloads, and day-level material links
- Built-in file uploader that stores assets under `server/public/uploads`
- Per-course day tracker for learners
- Real-time admin dashboard with charts and live activity via Socket.IO
- User management with course assignment controls
- MongoDB support with JSON-file fallback for local/demo mode

## Portal routes

### Public
- `/` — catalog landing page
- `/courses/:courseRef` — public brochure page for a course
- `/login`
- `/setup`

### Authenticated portal
- `/portal` — learner dashboard
- `/portal/courses` — assigned course catalog
- `/portal/courses/:courseRef` — learner tracker for one course

### Admin
- `/portal/admin` — live reporting dashboard
- `/portal/admin/courses` — course builder and curriculum editor
- `/portal/users` — user management and course assignments

## Data model

### Course
A course contains:
- brochure metadata
- course downloads
- weeks
- day grid
- day sections
- day materials

### Progress
Progress is stored per:
- user
- course
- day number

## Storage modes

### MongoDB mode
Set `MONGO_URI` and the app uses MongoDB via Mongoose.

### Fallback mode
If `MONGO_URI` is missing, the server uses JSON files in `server/storage`.

## Environment

### Server `.env`
```bash
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/education_portal
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-a-strong-random-secret
JWT_EXPIRES_IN=7d
```

### Client `.env`
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

## Workspace setup with pnpm

The repo is configured as a pnpm workspace.

### Install
```bash
pnpm install
```

### Run locally
```bash
pnpm dev
```

### Build
```bash
pnpm build
```

### Seed default courses
```bash
pnpm seed
```

## Upload workflow

The built-in admin uploader accepts a file from the browser, converts it to base64, and stores it in:
- `server/public/uploads/brochures`
- `server/public/uploads/course-images`
- `server/public/uploads/course-downloads`
- `server/public/uploads/day-materials`

This is convenient for small and medium files. For production at scale, move file storage to S3 and keep the metadata in MongoDB.

## AWS-friendly deployment path

Recommended:
- Frontend + API in one container for simple deployment
- MongoDB Atlas or Amazon DocumentDB for database
- ECS/Fargate for compute
- S3 for large downloadable materials
- CloudFront for CDN and HTTPS fronting later

See `deploy/aws/README.md`.
