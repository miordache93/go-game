import mongoose from 'mongoose';

/**
 * MongoDB connection configuration
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/go-game';
    
    // MongoDB connection options
    const options: mongoose.ConnectOptions = {
      // Use the new URL parser
      autoIndex: true,
      // Automatically create indexes in development
      autoCreate: process.env.NODE_ENV === 'development',
    };

    // Connect to MongoDB
    await mongoose.connect(mongoUri, options);

    console.log('✅ MongoDB connected successfully');

    // Connection event handlers
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Export mongoose for use in other files
export { mongoose };