/* eslint-disable camelcase */

exports.up = (pgm) => {
    // Create projects table
    pgm.createTable('projects', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
        },
        name: {
            type: 'varchar(200)',
            notNull: true,
        },
        description: {
            type: 'text',
        },
        color: {
            type: 'varchar(7)',
            default: "'#3B82F6'",
        },
        is_archived: {
            type: 'boolean',
            default: false,
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
    pgm.createIndex('projects', 'user_id');
    pgm.createIndex('projects', 'created_at');
    pgm.createIndex('projects', ['user_id', 'is_archived']);

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
    CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = (pgm) => {
    pgm.dropTable('projects', { cascade: true });
    pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
};
