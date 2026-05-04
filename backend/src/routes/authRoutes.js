import express from 'express';
const router = express.Router();
import {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    refreshToken,
    getRegistrationRoles
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import upload from '../utils/upload.js';

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/roles', getRegistrationRoles);

// Protected routes
router.use(authenticate);
router.get('/profile', getProfile);
router.put('/profile', upload.single('avatar'), updateProfile);
router.put('/change-password', changePassword);

export default router;