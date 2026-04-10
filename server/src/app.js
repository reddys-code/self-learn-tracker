import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
dotenv.config();
const clientDistPath = path.resolve(__dirname, '../../client/dist');

app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(',').map((item) => item.trim()).filter(Boolean) || '*',
    credentials: false,
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));

app.use('/images', express.static(path.resolve(__dirname, '../public/images')));
app.use('/downloads', express.static(path.resolve(__dirname, '../public/downloads')));
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', courseRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api/')
      || req.path.startsWith('/images/')
      || req.path.startsWith('/downloads/')
      || req.path.startsWith('/uploads/')
    ) {
      return next();
    }
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
