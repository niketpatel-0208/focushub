# Phase 3: Focus Session Tracking - Complete Documentation

## Overview

The Focus Service implements Pomodoro-style focus session tracking with timer controls, analytics, and productivity insights.

**Port**: 3003  
**Database**: `focushub_focus`  
**Tests**: 22/22 passing ✅  
**Endpoints**: 9

---

##  Simple Explanation

**What it does**: Helps you focus using the Pomodoro Technique

**The Pomodoro Technique**:
1. Choose a task
2. Work for 25 minutes (one "Pomodoro")
3. Take a 5-minute break
4. Repeat!

Track your focus time, see productivity patterns, and build better work habits.

---

## Database Schema

```sql
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID,  -- Optional link to task
  
  -- Configuration
  planned_duration INTEGER DEFAULT 1500,  -- 25 min
  break_duration INTEGER DEFAULT 300,      -- 5 min
  
  -- State
  status VARCHAR(20) DEFAULT 'active',  -- active|paused|completed|cancelled
  
  -- Time Tracking
  started_at TIMESTAMP DEFAULT NOW(),
  paused_at TIMESTAMP,
  resumed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Duration (in seconds)
  elapsed_time INTEGER DEFAULT 0,
  pause_duration INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  session_type VARCHAR(20) DEFAULT 'work',  -- work|break
  interruptions INTEGER DEFAULT 0
);
```

---

## API Endpoints (9 Total)

### 1. POST /sessions - Start Focus Session

**Simple**: Begin a 25-minute focus timer

**Request**:
```json
{
  "taskId": "uuid",          // Optional
  "plannedDuration": 1500,   // 25 min (optional)
  "breakDuration": 300,      // 5 min (optional)
  "sessionType": "work"      // work|break
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Focus session started successfully",
  "data": {
    "id": "session-uuid",
    "user_id": "user-uuid",
    "task_id": null,
    "planned_duration": 1500,
    "status": "active",
    "started_at": "2026-01-25T10:00:00Z",
    "elapsed_time": 0,
    "interruptions": 0
  }
}
```

**Postman**:
```
POST {{base_url}}/sessions
Authorization: Bearer {{access_token}}
Body (JSON):
{
  "plannedDuration": 1500
}

Test Script:
pm.test("Session started", () => {
    pm.response.to.have.status(201);
    pm.environment.set("session_id", pm.response.json().data.id);
});
```

---

### 2. GET /sessions - List Sessions

**Simple**: View your focus session history

**Query Parameters**:
- `status` - Filter: active|paused|completed|cancelled
- `taskId` - Filter by linked task
- `startDate` - Sessions after date
- `endDate` - Sessions before date
- `page` - Pagination (default 1)
- `limit` - Results per page (default 20)
- `sortBy` - Sort: startedAt|completedAt|elapsedTime
- `sortOrder` - asc|desc

**Postman Examples**:
```
# All sessions
GET {{base_url}}/sessions
Authorization: Bearer {{access_token}}

# Completed sessions
GET {{base_url}}/sessions?status=completed

# This week's sessions
GET {{base_url}}/sessions?startDate=2026-01-20&endDate=2026-01-27

# Most recent first
GET {{base_url}}/sessions?sortBy=startedAt&sortOrder=desc&limit=10
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "completed",
      "planned_duration": 1500,
      "elapsed_time": 1480,
      "started_at": "2026-01-25T10:00:00Z",
      "completed_at": "2026-01-25T10:25:00Z",
      "interruptions": 1
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 3. GET /sessions/active - Get Active Session

**Simple**: Check if you have a session running

**Postman**:
```
GET {{base_url}}/sessions/active
Authorization: Bearer {{access_token}}
```

**Response** (200 - if active):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "planned_duration": 1500,
    "started_at": "2026-01-25T10:00:00Z",
    "elapsed_time": 847,
    "currentElapsedTime": 847  // Real-time calculation
  }
}
```

**Response** (404 - if none):
```json
{
  "success": false,
  "message": "No active session found",
  "statusCode": 404
}
```

---

### 4. GET /sessions/:id - Get Session Details

**Simple**: View details of a specific session

**Postman**:
```
GET {{base_url}}/sessions/{{session_id}}
Authorization: Bearer {{access_token}}
```

---

### 5. PATCH /sessions/:id/pause - Pause Session

**Simple**: Temporarily stop the timer (e.g., phone call)

**Postman**:
```
PATCH {{base_url}}/sessions/{{session_id}}/pause
Authorization: Bearer {{access_token}}
```

**Response**:
```json
{
  "success": true,
  "message": "Focus session paused",
  "data": {
    "id": "uuid",
    "status": "paused",
    "paused_at": "2026-01-25T10:15:00Z",
    "elapsed_time": 900,  // 15 minutes worked
    "interruptions": 1     // Auto-incremented
  }
}
```

---

### 6. PATCH /sessions/:id/resume - Resume Session

**Simple**: Continue after a pause

**Postman**:
```
PATCH {{base_url}}/sessions/{{session_id}}/resume
Authorization: Bearer {{access_token}}
```

**Response**:
```json
{
  "success": true,
  "message": "Focus session resumed",
  "data": {
    "id": "uuid",
    "status": "active",
    "resumed_at": "2026-01-25T10:18:00Z",
    "pause_duration": 180  // 3 minutes paused
  }
}
```

---

### 7. PATCH /sessions/:id/complete - Complete Session

**Simple**: Successfully finish the session

**Request** (optional):
```json
{
  "notes": "Very productive! Finished 3 features."
}
```

**Postman**:
```
PATCH {{base_url}}/sessions/{{session_id}}/complete
Authorization: Bearer {{access_token}}
Body (JSON):
{
  "notes": "Great focus session!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Focus session completed successfully",
  "data": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "2026-01-25T10:25:00Z",
    "elapsed_time": 1500,
    "notes": "Great focus session!"
  }
}
```

---

### 8. DELETE /sessions/:id - Cancel Session

**Simple**: Stop and discard the session

**Postman**:
```
DELETE {{base_url}}/sessions/{{session_id}}
Authorization: Bearer {{access_token}}
```

**Response**:
```json
{
  "success": true,
  "message": "Focus session cancelled",
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancelled_at": "2026-01-25T10:10:00Z"
  }
}
```

---

### 9. GET /stats - Get Statistics

**Simple**: View your productivity insights

**Query Parameters**:
- `period` - Filter: day|week|month|year|all (default: week)
- `startDate` - Custom range start
- `endDate` - Custom range end

**Postman Examples**:
```
# This week
GET {{base_url}}/stats?period=week

# This month
GET {{base_url}}/stats?period=month

# Custom range
GET {{base_url}}/stats?startDate=2026-01-01&endDate=2026-01-31

# All time
GET {{base_url}}/stats?period=all
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "week",
    "summary": {
      "totalSessions": 24,
      "completedSessions": 20,
      "cancelledSessions": 2,
      "activeSessions": 1,
      "pausedSessions": 1
    },
    "timeTracking": {
      "totalFocusTime": 36000,        // 10 hours (in seconds)
      "averageSessionDuration": 1500,  // 25 minutes
      "longestSession": 3600,          // 1 hour
      "totalBreakTime": 3000           // 50 minutes
    },
    "productivity": {
      "completionRate": 83.3,          // 83.3% completion
      "averageInterruptions": 1.2,     // 1.2 pauses per session
      "mostProductiveHour": 9          // 9 AM most productive
    },
    "taskProgress": {
      "mostFocusedTask": {
        "taskId": "uuid",
        "sessionsCount": 6,
        "totalTime": 9000  // 2.5 hours
      }
    }
  }
}
```

---

## Complete Workflow Examples

### Example 1: Basic Pomodoro Session

```bash
# 1. Start 25-minute session
POST /sessions
{
  "plannedDuration": 1500,
  "sessionType": "work"
}
→ Timer starts...

# 2. Check active session (optional)
GET /sessions/active
→ See current elapsed time

# 3. Complete after 25 minutes
PATCH /sessions/{id}/complete
{
  "notes": "Finished login feature"
}

# 4. Take a 5-minute break
POST /sessions
{
  "plannedDuration": 300,
  "sessionType": "break"
}
```

### Example 2: Handling Interruptions

```bash
# 1. Start session
POST /sessions

# 2. Phone rings after 15 minutes
PATCH /sessions/{id}/pause
→ Timer pauses at 15:00

# 3. Call ends, resume
PATCH /sessions/{id}/resume
→ Timer continues from 15:00

# 4. Complete session
PATCH /sessions/{id}/complete
→ Session complete with 1 interruption logged
```

### Example 3: Link to Task

```bash
# 1. Create task (in task service)
POST http://localhost:3002/tasks
{
  "title": "Build payment integration"
}
→ Get task_id

# 2. Start focus session for that task
POST /sessions
{
  "taskId": "{task_id}",
  "plannedDuration": 1500
}

# 3. Complete session
PATCH /sessions/{id}/complete

# 4. View all sessions for this task
GET /sessions?taskId={task_id}
```

### Example 4: Weekly Review

```bash
# 1. Get this week's stats
GET /stats?period=week

# 2. View completed sessions
GET /sessions?status=completed&startDate=2026-01-20

# 3. Check completion rate
# Based on stats response: 20/24 = 83.3% completion
```

---

## Postman Collection Structure

```
FocusHub - Focus Service
├── Session Management
│   ├── Start Session
│   ├── Get Active Session
│   ├── List Sessions
│   └── Get Session Details
├── Timer Controls
│   ├── Pause Session
│   ├── Resume Session
│   ├── Complete Session
│   └── Cancel Session
└── Analytics
    └── Get Statistics
```

---

## Postman Environment

```
base_url = http://localhost:3003
access_token = (from auth service)
session_id = (set when creating session)
task_id = (optional, from task service)
```

---

## Postman Test Scripts

### Global Test (for all requests)
```javascript
// Add to Collection level
pm.test("Status code is not 500", () => {
    pm.expect(pm.response.code).to.not.equal(500);
});

pm.test("Response has success field", () => {
    pm.expect(pm.response.json()).to.have.property('success');
});
```

### Start Session Test
```javascript
pm.test("Session created successfully", () => {
    pm.response.to.have.status(201);
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.have.property('id');
    pm.expect(json.data.status).to.equal('active');
    
    // Save for later use
    pm.environment.set("session_id", json.data.id);
});
```

### Complete Session Test
```javascript
pm.test("Session completed", () => {
    pm.response.to.have.status(200);
    var json = pm.response.json();
    pm.expect(json.data.status).to.equal('completed');
    pm.expect(json.data).to.have.property('completed_at');
});
```

---

## Technical Details

### Timer Mechanics

**Accurate Time Tracking**:
```javascript
// When paused, server calculates:
now - (resumed_at || started_at) = additional_elapsed
total_elapsed = elapsed_time + additional_elapsed
```

**Status Transitions**:
- `active` → `paused` (via /pause)
- `paused` → `active` (via /resume)
- `active`/`paused` → `completed` (via /complete)
- `active`/`paused` → `cancelled` (via DELETE)

### Business Rules

1. **One Active Session**: Can only have 1 active/paused session at a time
2. **Can't Pause Paused**: Must be `active` to pause
3. **Can't Resume Active**: Must be `paused` to resume
4. **Can't Complete Twice**: Session must be active/paused

### Analytics Calculations

- **Completion Rate**: (completed / total) × 100
- **Average Duration**: total_time / completed_count
- **Most Productive Hour**: Hour with most completed sessions
- **Interruptions**: Count of pause/resume cycles

---

## Testing

```bash
cd focus-service
NODE_ENV=test npm test
```

Expected: **22/22 tests passing**

Test Coverage:
- Session CRUD: 5 tests
- Timer Operations: 5 tests
- Cancellation: 2 tests
- Filtering: 2 tests
- Statistics: 2 tests
- Authentication: 2 tests
- Edge Cases: 2 tests
- Health: 2 tests

---

## Implementation Files

```
focus-service/
├── index.js
├── index.test.js (22 tests)
├── routes/
│   └── focus.js (9 endpoints)
├── services/
│   └── focusService.js (9 functions)
└── migrations/
    └── *-create-focus-sessions-table.js
```

---

## Integration with Other Services

### With Task Service

Link focus sessions to tasks:
```bash
# 1. Create task
POST http://localhost:3002/tasks
→ Get task_id

# 2. Focus on that task
POST http://localhost:3003/sessions
{
  "taskId": "{task_id}"
}

# Future: Auto-update task status when completing session
```

### With Habit Service (Future)

Track daily focus habits:
- "Complete 4 Pomodoros daily"
- "Focus for 2 hours"
- Streaks based on consistent focus

---

## Next Steps

Planned enhancements:
1. **Break Timer**: Auto-start break after work session
2. **Notifications**: Alert when timer ends
3. **Goals**: Daily/weekly focus targets
4. **Team Rooms**: Shared focus sessions
5. **AI Insights**: Productivity pattern analysis

**Phase 3 Complete!** ✅
