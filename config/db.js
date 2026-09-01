import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });
import mongoose from 'mongoose';

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  });

  console.log('MongoDB Connected');
};
mongoose.set('strictQuery', false);
export default connectDB;
