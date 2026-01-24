/**
 * JWT Utility
 * Handles JWT token generation, verification, and refresh
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token
 * @param {Object} payload - Token payload (user data)
 * @param {string} secret - JWT secret
 * @returns {string} JWT access token
 */
function generateAccessToken(payload, secret) {
    try {
        return jwt.sign(payload, secret, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
            issuer: 'focushub',
        });
    } catch (error) {
        logger.error('Error generating access token', error);
        throw new Error('Failed to generate access token');
    }
}

/**
 * Generate refresh token
 * @param {Object} payload - Token payload (user data)
 * @param {string} secret - JWT secret
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload, secret) {
    try {
        return jwt.sign(payload, secret, {
            expiresIn: REFRESH_TOKEN_EXPIRY,
            issuer: 'focushub',
        });
    } catch (error) {
        logger.error('Error generating refresh token', error);
        throw new Error('Failed to generate refresh token');
    }
}

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @param {string} secret - JWT secret
 * @returns {Object} { accessToken, refreshToken }
 */
function generateTokenPair(user, secret) {
    const payload = {
        userId: user.id,
        email: user.email,
        username: user.username,
    };

    return {
        accessToken: generateAccessToken(payload, secret),
        refreshToken: generateRefreshToken(payload, secret),
    };
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - JWT secret
 * @returns {Object} Decoded token payload
 */
function verifyToken(token, secret) {
    try {
        return jwt.verify(token, secret, { issuer: 'focushub' });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        } else {
            logger.error('Error verifying token', error);
            throw new Error('Token verification failed');
        }
    }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Error decoding token', error);
        return null;
    }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyToken,
    decodeToken,
    extractTokenFromHeader,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
};
