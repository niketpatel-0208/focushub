/* eslint-disable camelcase */

exports.up = (pgm) => {
    // Create refresh_tokens table
    pgm.createTable('refresh_tokens', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'CASCADE',
        },
        token: {
            type: 'varchar(500)',
            notNull: true,
            unique: true,
        },
        expires_at: {
            type: 'timestamp',
            notNull: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    // Create indexes
    pgm.createIndex('refresh_tokens', 'user_id');
    pgm.createIndex('refresh_tokens', 'token');
    pgm.createIndex('refresh_tokens', 'expires_at');
};

exports.down = (pgm) => {
    pgm.dropTable('refresh_tokens', { cascade: true });
};
