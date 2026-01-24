/* eslint-disable camelcase */

exports.up = (pgm) => {
    // Create users table
    pgm.createTable('users', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
            unique: true,
        },
        password_hash: {
            type: 'varchar(255)',
            notNull: true,
        },
        username: {
            type: 'varchar(100)',
            notNull: true,
            unique: true,
        },
        first_name: {
            type: 'varchar(100)',
        },
        last_name: {
            type: 'varchar(100)',
        },
        is_verified: {
            type: 'boolean',
            default: false,
        },
        is_active: {
            type: 'boolean',
            default: true,
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
        updated_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    // Create indexes
    pgm.createIndex('users', 'email');
    pgm.createIndex('users', 'username');
    pgm.createIndex('users', 'created_at');

    // Create trigger to update updated_at timestamp
    pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

    pgm.sql(`
    CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = (pgm) => {
    pgm.dropTable('users', { cascade: true });
    pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
};
