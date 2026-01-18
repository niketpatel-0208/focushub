/* eslint-disable camelcase */

exports.up = (pgm) => {
    // Create task_tags junction table for many-to-many relationship
    pgm.createTable('task_tags', {
        task_id: {
            type: 'uuid',
            notNull: true,
            references: 'tasks(id)',
            onDelete: 'CASCADE',
        },
        tag_id: {
            type: 'uuid',
            notNull: true,
            references: 'tags(id)',
            onDelete: 'CASCADE',
        },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('NOW()'),
        },
    });

    // Create composite primary key
    pgm.addConstraint('task_tags', 'task_tags_pkey', {
        primaryKey: ['task_id', 'tag_id'],
    });

    // Create indexes for junction table
    pgm.createIndex('task_tags', 'task_id');
    pgm.createIndex('task_tags', 'tag_id');
};

exports.down = (pgm) => {
    pgm.dropTable('task_tags', { cascade: true });
};
