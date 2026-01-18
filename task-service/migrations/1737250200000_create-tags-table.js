/* eslint-disable camelcase */

exports.up = (pgm) => {
    // Create tags table
    pgm.createTable('tags', {
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
            type: 'varchar(50)',
            notNull: true,
        },
        color: {
            type: 'varchar(7)',
            default: "'#8B5CF6'",
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    // Create unique constraint on user_id + name combination
    pgm.addConstraint('tags', 'tags_user_id_name_unique', {
        unique: ['user_id', 'name'],
    });

    // Create indexes
    pgm.createIndex('tags', 'user_id');
    pgm.createIndex('tags', 'name');
};

exports.down = (pgm) => {
    pgm.dropTable('tags', { cascade: true });
};
