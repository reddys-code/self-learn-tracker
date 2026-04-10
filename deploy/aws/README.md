# AWS deployment notes

## Recommended architecture

- React frontend served from Express in one container
- Express API + Socket.IO in the same container
- MongoDB Atlas or Amazon DocumentDB for persistent data
- ECS/Fargate for hosting
- S3 for large brochures and downloadable materials
- CloudFront + Route 53 + ACM for public delivery

## Fastest path

### 1. Create MongoDB
Use either:
- MongoDB Atlas
- Amazon DocumentDB

### 2. Build the container
```bash
docker build -t education-portal .
```

### 3. Push to ECR
Create an ECR repository, authenticate Docker, and push the image.

### 4. Run on ECS/Fargate
Configure environment variables:
- `PORT`
- `NODE_ENV=production`
- `MONGO_URI`
- `CLIENT_URL`
- `JWT_SECRET`

### 5. Add storage strategy for assets
The app includes a local uploader for convenience, but ECS task storage is ephemeral.
For production, route uploaded files to S3 and store the returned URLs in course metadata.

## Production recommendation for uploads

Replace the built-in upload endpoint with this flow:
1. frontend requests a presigned S3 URL from the API
2. frontend uploads the file directly to S3
3. frontend saves the returned S3 URL into brochure/download/material fields

That gives you durable storage and better scalability.
