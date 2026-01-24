/**
 * Auth Service
 * Business logic for authentication operations
 */

const shared = require('../../shared');
const { database, password, jwt, ApiError, logger } = shared;

/**
 * Register a new user
 * @param {Object} db - Database pool
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user (without password)
 */
async function registerUser(db, userData) {
    const { email, password: plainPassword, username, firstName, lastName } = userData;

    // Hash password
    const passwordHash = await password.hashPassword(plainPassword);

    // Insert user into database
    const query = `
    INSERT INTO users (email, password_hash, username, first_name, last_name)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, username, first_name, last_name, is_verified, is_active, created_at
  `;

    try {
        const result = await database.query(db, query, [
            email,
            passwordHash,
            username,
            firstName || null,
            lastName || null,
        ]);

        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            // Unique violation
            if (error.constraint === 'users_email_key') {
                throw new ApiError('Email already exists', 400);
            } else if (error.constraint === 'users_username_key') {
                throw new ApiError('Username already exists', 400);
            }
        }
        throw error;
    }
}

/**
 * Login user and generate tokens
 * @param {Object} db - Database pool
 * @param {string} email - User email
 * @param {string} plainPassword - Plain text password
 * @param {string} jwtSecret - JWT secret
 * @returns {Promise<Object>} User and tokens
 */
async function loginUser(db, email, plainPassword, jwtSecret) {
    // Find user by email
    const query = `
    SELECT id, email, password_hash, username, first_name, last_name, is_verified, is_active
    FROM users
    WHERE email = $1
  `;

    const result = await database.query(db, query, [email]);

    if (result.rows.length === 0) {
        throw new ApiError('Invalid email or password', 401);
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
        throw new ApiError('Account is deactivated', 403);
    }

    // Verify password
    const isPasswordValid = await password.comparePassword(plainPassword, user.password_hash);

    if (!isPasswordValid) {
        throw new ApiError('Invalid email or password', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = jwt.generateTokenPair(user, jwtSecret);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await database.query(
        db,
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, expiresAt]
    );

    // Remove password hash from user object
    delete user.password_hash;

    return {
        user,
        accessToken,
        refreshToken,
    };
}

/**
 * Refresh access token
 * @param {Object} db - Database pool
 * @param {string} refreshToken - Refresh token
 * @param {string} jwtSecret - JWT secret
 * @returns {Promise<Object>} New access token
 */
async function refreshAccessToken(db, refreshToken, jwtSecret) {
    // Verify refresh token
    let decoded;
    try {
        decoded = jwt.verifyToken(refreshToken, jwtSecret);
    } catch (error) {
        throw new ApiError('Invalid or expired refresh token', 401);
    }

    // Check if refresh token exists in database and is not expired
    const query = `
    SELECT rt.id, rt.user_id, rt.expires_at, u.email, u.username
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token = $1 AND rt.expires_at > NOW()
  `;

    const result = await database.query(db, query, [refreshToken]);

    if (result.rows.length === 0) {
        throw new ApiError('Invalid or expired refresh token', 401);
    }

    const tokenData = result.rows[0];

    // Generate new access token
    const user = {
        id: tokenData.user_id,
        email: tokenData.email,
        username: tokenData.username,
    };

    const accessToken = jwt.generateAccessToken(user, jwtSecret);

    return { accessToken };
}

/**
 * Logout user by invalidating refresh token
 * @param {Object} db - Database pool
 * @param {string} refreshToken - Refresh token to invalidate
 */
async function logoutUser(db, refreshToken) {
    await database.query(db, 'DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    logger.info('User logged out, refresh token invalidated');
}

/**
 * Get user by ID
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 */
async function getUserById(db, userId) {
    const query = `
    SELECT id, email, username, first_name, last_name, is_verified, is_active, created_at, updated_at
    FROM users
    WHERE id = $1
  `;

    const result = await database.query(db, query, [userId]);

    if (result.rows.length === 0) {
        throw new ApiError('User not found', 404);
    }

    return result.rows[0];
}

/**
 * Update user profile
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Updated user
 */
async function updateUserProfile(db, userId, updates) {
    const { firstName, lastName, username } = updates;

    const fieldsToUpdate = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
        fieldsToUpdate.push(`first_name = $${paramCount++}`);
        values.push(firstName);
    }

    if (lastName !== undefined) {
        fieldsToUpdate.push(`last_name = $${paramCount++}`);
        values.push(lastName);
    }

    if (username !== undefined) {
        fieldsToUpdate.push(`username = $${paramCount++}`);
        values.push(username);
    }

    if (fieldsToUpdate.length === 0) {
        throw new ApiError('No fields to update', 400);
    }

    values.push(userId);

    const query = `
    UPDATE users
    SET ${fieldsToUpdate.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, email, username, first_name, last_name, is_verified, is_active, created_at, updated_at
  `;

    try {
        const result = await database.query(db, query, values);
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505' && error.constraint === 'users_username_key') {
            throw new ApiError('Username already exists', 400);
        }
        throw error;
    }
}

/**
 * Change user password
 * @param {Object} db - Database pool
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 */
async function changePassword(db, userId, currentPassword, newPassword) {
    // Get current password hash
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await database.query(db, query, [userId]);

    if (result.rows.length === 0) {
        throw new ApiError('User not found', 404);
    }

    const { password_hash } = result.rows[0];

    // Verify current password
    const isValid = await password.comparePassword(currentPassword, password_hash);

    if (!isValid) {
        throw new ApiError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await password.hashPassword(newPassword);

    // Update password
    await database.query(db, 'UPDATE users SET password_hash = $1 WHERE id = $2', [
        newPasswordHash,
        userId,
    ]);

    logger.info('Password changed successfully', { userId });
}

module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getUserById,
    updateUserProfile,
    changePassword,
};
