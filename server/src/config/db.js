import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) {
    console.log('[db] No MONGO_URI supplied. Using JSON/file fallback mode.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[db] Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('[db] MongoDB connection failed. Falling back to JSON/file mode.', error.message);
    return false;
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
