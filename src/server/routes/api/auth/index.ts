import { Router } from 'express';
import { body } from 'express-validator';
import { checkForValidationErrors } from '../../../middleware/validate';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import {
    loginController,
    logoutController,
    meController,
    changePasswordController,
    forgotPasswordController,
    verifyCodeController,
    resetPasswordController,
} from './auth.controller';

const router = Router();

router.post(
    '/login',
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    body('recaptchaToken').notEmpty().withMessage('reCAPTCHA token is required.'),
    checkForValidationErrors,
    loginController
);

router.post('/logout', isLoggedIn, logoutController);

router.get('/me', isLoggedIn, meController);

router.post(
    '/change-password',
    isLoggedIn,
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
    checkForValidationErrors,
    changePasswordController
);

router.post(
    '/forgot-password',
    body('identifier').notEmpty().withMessage('Email or phone number is required.'),
    checkForValidationErrors,
    forgotPasswordController
);

router.post(
    '/verify-code',
    body('identifier').notEmpty().withMessage('Email or phone number is required.'),
    body('code').notEmpty().withMessage('Code is required.'),
    checkForValidationErrors,
    verifyCodeController
);

router.post(
    '/reset-password',
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    checkForValidationErrors,
    resetPasswordController
);

export default router;
