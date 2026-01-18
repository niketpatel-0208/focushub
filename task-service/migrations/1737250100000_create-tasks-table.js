/* eslint-disable camelcase */

exports.up = (pgm) => {
    // Create tasks table
    pgm.createTable('tasks', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        user_id: {
            type: 'uuid',
            notNull: true,
        },
        project_id: {
            type: 'uuid',
            references: 'projects(id)',
            onDelete: 'SET NULL',
        },
        title: {
            type: 'varchar(500)',
            notNull: true,
        },
        description: {
            type: 'text',
        },
        status: {
            type: 'varchar(20)',
            notNull: true,
            default: "'todo'",
        },
        priority: {
            type: 'varchar(20)',
            notNull: true,
            default: "'medium'",
        },
        due_date: {
            type: 'timestamp',
        },
        completed_at: {
            type: 'timestamp',
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

    // Create indexes for performance
    pgm.createIndex('tasks', 'user_id');
    pgm.createIndex('tasks', 'project_id');
    pgm.createIndex('tasks', 'status');
    pgm.createIndex('tasks', 'priority');
    pgm.createIndex('tasks', 'due_date');
    pgm.createIndex('tasks', 'created_at');
    pgm.createIndex('tasks', ['user_id', 'status']);
    pgm.createIndex('tasks', ['user_id', 'project_id']);

    // Add constraints for status and priority
    pgm.sql(`
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('todo', 'in_progress', 'completed'));
  `);

    pgm.sql(`
    ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  `);

    // Create trigger for updated_at
    pgm.sql(`
    CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
};

exports.down = (pgm) => {
    pgm.dropTable('tasks', { cascade: true });
};
