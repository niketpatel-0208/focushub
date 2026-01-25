# Phase 2: Task Management Service - Complete Documentation

## Overview

The Task Management Service handles projects, tasks, and tags with advanced filtering, search, and organization capabilities.

**Port**: 3002  
**Database**: `focushub_tasks`  
**Tests**: 23/23 passing ✅  
**Endpoints**: 22

---

## Simple Explanation

**What it does**: Helps you organize and track your work

Think of it like a digital to-do list on steroids:
- **Projects**: Folders for grouping related work
- **Tasks**: Individual items to complete
- **Tags**: Labels to categorize (#urgent, #work, #personal)

---

## Database Schema

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  archived BOOLEAN DEFAULT FALSE
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMP,
  completed_at TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
 name VARCHAR(50) NOT NULL
);

-- Task-Tags junction
CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id),
  tag_id UUID REFERENCES tags(id)
);
```

---

## API Endpoints

### Projects (5 endpoints)

#### 1. POST /projects - Create Project

**Simple**: Make a new folder for tasks

**Request**:
```json
{
  "name": "Mobile App Launch",
  "description": "Everything for the v1.0 release",
  "color": "#3B82F6"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mobile App Launch",
    "description": "Everything for the v1.0 release",
    "color": "#3B82F6",
    "archived": false
  }
}
```

**Postman**:
```
POST {{base_url}}/projects
Authorization: Bearer {{access_token}}
Body (JSON):
{
  "name": "My Project",
  "color": "#3B82F6"
}

Test Script:
pm.test("Project created", () => {
    pm.response.to.have.status(201);
    pm.environment.set("project_id", pm.response.json().data.id);
});
```

#### 2. GET /project - List Projects

**Postman**:
```
GET {{base_url}}/projects
Authorization: Bearer {{access_token}}
```

#### 3. GET /projects/:id - Get Project

#### 4. PUT /projects/:id - Update Project

#### 5. PATCH /projects/:id/archive - Archive Project

---

### Tasks (14 endpoints)

#### 1. POST /tasks - Create Task

**Simple**: Add a new item to your to-do list

**Request**:
```json
{
  "title": "Design login screen",
  "description": "Create mockups for mobile login",
  "projectId": "uuid",
  "priority": "high",
  "dueDate": "2026-01-30T23:59:59Z",
  "tags": ["design", "urgent"]
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Design login screen",
    "status": "todo",
    "priority": "high",
    "dueDate": "2026-01-30T23:59:59Z",
    "tags": ["design", "urgent"]
  }
}
```

**Postman**:
```
POST {{base_url}}/tasks
Authorization: Bearer {{access_token}}
Body (JSON):
{
  "title": "My Task",
  "priority": "high",
  "tags": ["work"]
}

Test Script:
pm.test("Task created", () => {
    pm.response.to.have.status(201);
    pm.environment.set("task_id", pm.response.json().data.id);
});
```

#### 2. GET /tasks - List Tasks with Filtering

**Query Parameters**:
- `status` - Filter by: todo | in_progress | completed | cancelled
- `priority` - Filter by: low | medium | high | urgent
- `projectId` - Filter by project
- `tags` - Comma-separated tag names
- `search` - Search in title/description
- `dueBefore` - Tasks due before date
- `dueAfter` - Tasks due after date
- `page` - Pagination (default 1)
- `limit` - Results per page (default 20)

**Postman Examples**:
```
# All tasks
GET {{base_url}}/tasks

# High priority tasks
GET {{base_url}}/tasks?priority=high

# Tasks tagged "urgent"
GET {{base_url}}/tasks?tags=urgent

# Search for "login"
GET {{base_url}}/tasks?search=login

# Completed tasks in project
GET {{base_url}}/tasks?status=completed&projectId={{project_id}}

# Tasks due this week
GET {{base_url}}/tasks?dueAfter=2026-01-24&dueBefore=2026-01-31
```

#### 3. GET /tasks/:id - Get Task Details

#### 4. PUT /tasks/:id - Update Task

**Postman**:
```
PUT {{base_url}}/tasks/{{task_id}}
Body:
{
  "title": "Updated Title",
  "status": "in_progress",
  "priority": "urgent"
}
```

#### 5. DELETE /tasks/:id - Delete Task

#### 6. PATCH /tasks/:id/status - Update Status

**Simple**: Mark task as todo/in_progress/completed

**Postman**:
```
PATCH {{base_url}}/tasks/{{task_id}}/status
Body:
{
  "status": "completed"
}
```

#### 7. PATCH /tasks/:id/complete - Mark Complete

**Shortcut to mark as completed**

#### 8. POST /tasks/:id/tags - Add Tags to Task

**Postman**:
```
POST {{base_url}}/tasks/{{task_id}}/tags
Body:
{
  "tags": ["urgent", "frontend"]
}
```

#### 9. DELETE /tasks/:id/tags/:tagId - Remove Tag

#### 10. GET /tasks/overdue - Get Overdue Tasks

#### 11. GET /tasks/upcoming - Get Upcoming Tasks

#### 12. GET /tasks/completed - Get Completed Tasks

#### 13. GET /tasks/search - Advanced Search

#### 14. GET /tasks/stats - Get Statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "todo": 20,
      "in_progress": 10,
      "completed": 15
    },
    "byPriority": {
      "low": 10,
      "medium": 20,
      "high": 10,
      "urgent": 5
    },
    "overdue": 3,
    "dueToday": 5,
    "dueThisWeek": 12
  }
}
```

---

### Tags (3 endpoints)

#### 1. POST /tags - Create Tag

**Postman**:
```
POST {{base_url}}/tags
Body:
{
  "name": "urgent",
  "color": "#EF4444"
}
```

#### 2. GET /tags - List All Tags

#### 3. DELETE /tags/:id - Delete Tag

---

## Complete Workflow Examples

### Example 1: Start a New Project

```bash
# 1. Create project
POST /projects
{
  "name": "Website Redesign",
  "color": "#10B981"
}

# 2. Create tasks
POST /tasks
{
  "title": "Design homepage",
  "projectId": "{project_id}",
  "priority": "high",
  "tags": ["design"]
}

POST /tasks
{
  "title": "Build contact form",
  "projectId": "{project_id}",
  "priority": "medium",
  "tags": ["development"]
}

# 3. View all project tasks
GET /tasks?projectId={project_id}
```

### Example 2: Daily Task Management

```bash
# Morning: Check today's tasks
GET /tasks?dueAfter=2026-01-25T00:00:00Z&dueBefore=2026-01-25T23:59:59Z

# Start working on a task
PATCH /tasks/{id}/status
{"status": "in_progress"}

# Complete a task
PATCH /tasks/{id}/complete

# Check overdue tasks
GET /tasks/overdue

# View statistics
GET /tasks/stats
```

### Example 3: Search and Filter

```bash
# Find all urgent Design tasks
GET /tasks?tags=design&priority=urgent

# Search for "login" in completed tasks
GET /tasks?search=login&status=completed

# Get high priority tasks due this week
GET /tasks?priority=high&dueAfter=2026-01-24&dueBefore=2026-01-31
```

---

## Postman Collection Structure

```
FocusHub - Task Service
├── Projects
│   ├── Create Project
│   ├── List Projects
│   ├── Get Project
│   ├── Update Project
│   └── Archive Project
├── Tasks - CRUD
│   ├── Create Task
│   ├── List Tasks
│   ├── Get Task
│   ├── Update Task
│   └── Delete Task
├── Tasks - Status
│   ├── Update Status
│   └── Mark Complete
├── Tasks - Tags
│   ├── Add Tags
│   └── Remove Tag
├── Tasks - Views
│   ├── Overdue Tasks
│   ├── Upcoming Tasks
│   ├── Completed Tasks
│   └── Statistics
└── Tags
    ├── Create Tag
    ├── List Tags
    └── Delete Tag
```

---

## Postman Environment

```
base_url = http://localhost:3002
access_token = (from auth service)
project_id = (set when creating project)
task_id = (set when creating task)
tag_id = (set when creating tag)
```

---

## Technical Details

### Priority Levels
- `low` - Can wait
- `medium` - Normal priority (default)
- `high` - Important
- `urgent` - Do ASAP

### Status Values
- `todo` - Not started (default)
- `in_progress` - Currently working
- `completed` - Finished
- `cancelled` - No longer needed

### Pagination
- Default: 20 items per page
- Max: 100 items per page
- Returns total count and page info

### Search
- Searches in: title, description
- Case-insensitive
- Partial matches

---

## Testing

```bash
cd task-service
NODE_ENV=test npm test
```

Expected: **23/23 tests passing**

---

## Implementation Files

```
task-service/
├── index.js
├── index.test.js (23 tests)
├── routes/
│   ├── tasks.js (14 endpoints)
│   ├── projects.js (5 endpoints)
│   └── tags.js (3 endpoints)
├── services/
│   ├── taskService.js
│   ├── projectService.js
│   └── tagService.js
└── migrations/
    ├── *-create-projects-table.js
    ├── *-create-tasks-table.js
    ├── *-create-tags-table.js
    └── *-create-task-tags-table.js
```

**Phase 2 Complete!** ✅
