import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoute from './api/routes/authRoute.js';
import UserRoute from './api/routes/userRoute.js';
import friendRequestRoute from './api/routes/friendRequestRoute.js';
import messageRoute from './api/routes/messageRoute.js';
import notificationRoute from './api/routes/notificationRoute.js';
import groupChatRoute from './api/routes/groupChatRoute.js';
dotenv.config();
const app=express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
     origin: function (origin, callback) { 
        if (!origin) return callback(null, true);
        return callback(null, true);
    },
    credentials: true   
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authLimiter, authRoute);
app.use('/api/users',UserRoute);
app.use('/api/friend-requests', friendRequestRoute);
app.use('/api/messages', messageRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/group-chats', groupChatRoute);

export default app;