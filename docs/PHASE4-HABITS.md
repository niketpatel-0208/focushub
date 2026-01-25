# Phase 4: Habit Tracking Service - Complete Documentation

## Overview

The Habit Tracking Service enables users to create and track habits with streak calculations, supporting daily, weekly, and custom interval frequencies.

**Port**: 3004  
**Database**: `focushub_habits`  
**Tests**: 31/31 target ✅  
**Endpoints**: 11

---

## Simple Explanation

**What it does**: Helps you build and maintain habits with streak tracking

**How it works**:
- Create habits (e.g., "Meditate daily", "Gym 3x/week")
- Log completions each day
- Track current streak and longest streak
- Get insights on consistency

Think of it like a habit tracker app that:
- Remembers your goals
- Counts consecutive days
- Shows your progress

---

## Database Schema

```sql
-- Habits table
CREATE TABLE habits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  
  -- Frequency: daily, weekly, custom
  frequency VARCHAR(20) DEFAULT 'daily',
  target_value INTEGER DEFAULT 1,
  unit VARCHAR(50),
  
  -- For weekly habits: [0,1,2,3,4,5,6] = Sun-Sat
  weekly_days INTEGER[],
  
  -- For custom habits: repeat every N days
  custom_interval_days INTEGER,
  
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_time TIME,
  
  is_archived BOOLEAN DEFAULT FALSE
);

-- Completion logs
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY,
  habit_id UUID REFERENCES habits(id),
  user_id UUID NOT NULL,
  completed_date DATE NOT NULL,
  completed_value INTEGER DEFAULT 1,
  notes TEXT,
  UNIQUE(habit_id, completed_date)
);

-- Streak tracking (materialized for performance)
CREATE TABLE habit_streaks (
  habit_id UUID PRIMARY KEY REFERENCES habits(id),
  user_id UUID NOT NULL,
  current_streak INTEGER DEFAULT 0,
  current_streak_start_date DATE,
  longest_streak INTEGER DEFAULT 0,
  longest_streak_start_date DATE,
  longest_streak_end_date DATE,
  last_completed_date DATE,
  total_completions INTEGER DEFAULT 0
);
```

---

## API Endpoints (11 Total)

### 1. POST /habits - Create Habit

**Simple**: Create a new habit to track

**Request**:
```json
{
  "name": "Morning meditation",
  "description": "10 minutes of mindfulness",
  "frequency": "daily",
  "targetValue": 1,
  "icon": "🧘",
  "color": "#4CAF50"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Habit created successfully",
  "data": {
    "id": "habit-uuid",
    "name": "Morning meditation",
    "frequency": "daily",
    "target_value": 1,
    "icon": "🧘",
    "color": "#4CAF50",
    "is_archived": false
  }
}
```

**Postman**:
```
POST {{habit_url}}/habits
Authorization: Bearer {{access_token}}
Body (JSON):
{
  "name": "Daily reading",
  "frequency": "daily",
  "targetValue": 30,
  "unit": "minutes"
}

Test Script:
pm.test("Habit created", () => {
    pm.expect(pm.response.code).to.equal(201);
    pm.environment.set("habit_id", pm.response.json().data.id);
});
```

**Weekly Habit Example**:
```json
{
  "name": "Gym workout",
  "frequency": "weekly",
  "weeklyDays": [1, 3, 5],  // Mon, Wed, Fri
  "targetValue": 1
}
```

**Custom Interval Example**:
```json
{
  "name": "Deep clean house",
  "frequency": "custom",
  "customIntervalDays": 7  // Every 7 days
}
```

---

### 2. GET /habits - List Habits

**Simple**: View all your habits

**Query Parameters**:
- `frequency` - Filter: daily | weekly | custom
- `archived` - Filter: true | false
- `page` - Page number (default 1)
- `limit` - Results per page (default 20, max 100)
- `sortBy` - Sort: name | createdAt | currentStreak
- `sortOrder` - asc | desc

**Postman Examples**:
```
# All active habits
GET {{habit_url}}/habits

# Daily habits only
GET {{habit_url}}/habits?frequency=daily

# Sort by current streak
GET {{habit_url}}/habits?sortBy=currentStreak&sortOrder=desc

# Archived habits
GET {{habit_url}}/habits?archived=true
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Morning meditation",
      "frequency": "daily",
      "current_streak": 7,
      "longest_streak": 14,
      "last_completed_date": "2026-01-25"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 3. GET /habits/:id - Get Habit Details

**Simple**: View specific habit with full streak info

**Postman**:
```
GET {{habit_url}}/habits/{{habit_id}}
Authorization: Bearer {{access_token}}
```

---

### 4. PUT /habits/:id - Update Habit

**Simple**: Edit habit details

**Request**:
```json
{
  "name": "Updated name",
  "targetValue": 2,
  "reminderEnabled": true,
  "reminderTime": "08:00:00"
}
```

**Postman**:
```
PUT {{habit_url}}/habits/{{habit_id}}
Body:
{
  "name": "Evening meditation",
  "targetValue": 15,
  "unit": "minutes"
}
```

---

### 5. DELETE /habits/:id - Delete Habit

**Simple**: Permanently remove habit (also deletes all logs and streaks)

**Postman**:
```
DELETE {{habit_url}}/habits/{{habit_id}}
```

---

### 6. PATCH /habits/:id/archive - Archive Habit

**Simple**: Hide habit without deleting (keeps all history)

**Postman**:
```
PATCH {{habit_url}}/habits/{{habit_id}}/archive
```

---

### 7. POST /habits/:id/complete - Log Completion

**Simple**: Mark habit as done for today (or specific date)

**Request** (log today):
```json
{
  "value": 1,
  "notes": "Felt great!"
}
```

**Request** (log specific date):
```json
{
  "date": "2026-01-24",
  "value": 2,
  "notes": "Did it twice"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Completion logged successfully",
  "data": {
    "id": "log-uuid",
    "habit_id": "habit-uuid",
    "completed_date": "2026-01-25",
    "completed_value": 1,
    "notes": "Felt great!"
  }
}
```

**Postman**:
```
POST {{habit_url}}/habits/{{habit_id}}/complete
Body:
{
  "value": 1,
  "notes": "Great session!"
}

# Upsert behavior: if already logged today, updates the existing log
```

**Streak Behavior**:
- Logging today or yesterday extends streak
- Logging with gaps resets streak to 1
- Auto-calculates current and longest streaks

---

### 8. DELETE /habits/:id/logs/:date - Remove Completion

**Simple**: Delete a completion log (e.g., logged by mistake)

**Postman**:
```
DELETE {{habit_url}}/habits/{{habit_id}}/logs/2026-01-25
```

**Note**: Automatically recalculates streaks after deletion

---

### 9. GET /habits/:id/logs - Get Completion History

**Simple**: View all times you completed this habit

**Query Parameters**:
- `startDate` - Filter: YYYY-MM-DD
- `endDate` - Filter: YYYY-MM-DD

**Postman**:
```
# All logs
GET {{habit_url}}/habits/{{habit_id}}/logs

# Last 30 days
GET {{habit_url}}/habits/{{habit_id}}/logs?startDate=2025-12-26&endDate=2026-01-25
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "completed_date": "2026-01-25",
      "completed_value": 1,
      "notes": "Felt great!",
      "created_at": "2026-01-25T10:30:00Z"
    },
    {
      "id": "log-uuid-2",
      "completed_date": "2026-01-24",
      "completed_value": 1,
      "notes": null
    }
  ]
}
```

---

### 10. GET /habits/:id/streak - Get Streak Info

**Simple**: View current and longest streak details

**Postman**:
```
GET {{habit_url}}/habits/{{habit_id}}/streak
```

**Response**:
```json
{
  "success": true,
  "data": {
    "habit_id": "uuid",
    "current_streak": 7,
    "current_streak_start_date": "2026-01-19",
    "longest_streak": 21,
    "longest_streak_start_date": "2025-12-01",
    "longest_streak_end_date": "2025-12-21",
    "last_completed_date": "2026-01-25",
    "total_completions": 45
  }
}
```

---

### 11. GET /stats - Get Habit Statistics

**Simple**: View overall habit analytics

**Query Parameters**:
- `period` - week | month | quarter | year | all (default: month)
- `startDate` - Custom range start (YYYY-MM-DD)
- `endDate` - Custom range end (YYYY-MM-DD)

**Postman Examples**:
```
# This month
GET {{habit_url}}/stats?period=month

# This week
GET {{habit_url}}/stats?period=week

# Custom range
GET {{habit_url}}/stats?startDate=2026-01-01&endDate=2026-01-31

# All time
GET {{habit_url}}/stats?period=all
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "month",
    "summary": {
      "totalHabits": 5,
      "activeHabits": 4,
      "dailyHabits": 3,
      "weeklyHabits": 1
    },
    "completions": {
      "total": 87
    },
    "topStreaks": [
      {
        "name": "Morning meditation",
        "icon": "🧘",
        "current_streak": 21,
        "longest_streak": 30
      },
      {
        "name": "Daily reading",
        "icon": "📚",
        "current_streak": 14,
        "longest_streak": 14
      }
    ]
  }
}
```

---

## Complete Workflow Examples

### Example 1: Start a New Daily Habit

```bash
# 1. Create habit
POST /habits
{
  "name": "Drink 8 glasses of water",
  "frequency": "daily",
  "targetValue": 8,
  "unit": "glasses",
  "icon": "💧"
}
→ Save habit_id

# 2. Log completion today
POST /habits/{habit_id}/complete
{
  "value": 8,
  "notes": "Stayed hydrated!"
}
→ Streak = 1

# 3. Log completion tomorrow
POST /habits/{habit_id}/complete
{
  "value": 8
}
→ Streak = 2

# 4. Check streak
GET /habits/{habit_id}/streak
→ current_streak: 2, longest_streak: 2
```

### Example 2: Weekly Workout Habit

```bash
# 1. Create weekly habit
POST /habits
{
  "name": "Gym workout",
  "frequency": "weekly",
  "weeklyDays": [1, 3, 5],  // Mon, Wed, Fri
  "icon": "💪"
}

# 2. Log Monday workout
POST /habits/{habit_id}/complete

# 3. Log Wednesday workout
POST /habits/{habit_id}/complete
→ Streak increases only on weekly-specific days

# 4. View all workout logs
GET /habits/{habit_id}/logs
```

### Example 3: Track Past Days (Backfill)

```bash
# Log completion for yesterday
POST /habits/{habit_id}/complete
{
  "date": "2026-01-24",
  "value": 1
}

# Log for 2 days ago
POST /habits/{habit_id}/complete
{
  "date": "2026-01-23",
  "value": 1
}

# Streak auto-calculates based on all logs
```

### Example 4: Fix a Mistake

```bash
# Logged by mistake
POST /habits/{habit_id}/complete

# Delete the log
DELETE /habits/{habit_id}/logs/2026-01-25
→ Streak automatically recalculated
```

---

## Streak Calculation Algorithm

### How Streaks Work

**Daily Habits**:
- Must complete every day
- Missing one day resets streak to 0
- Streak = consecutive days with completions

**Weekly Habits** (e.g., Mon/Wed/Fri):
- Must complete on specified days only
- Missing a specified day resets streak
- Streak = consecutive periods completing all required days

**Custom Interval** (e.g., every 7 days):
- Must complete every N days
- Streak = consecutive intervals

### Examples

**Daily Habit - Meditation**:
```
Jan 20: ✅ (streak = 1)
Jan 21: ✅ (streak = 2)
Jan 22: ✅ (streak = 3)
Jan 23: ❌ (streak = 0)
Jan 24: ✅ (streak = 1)
```

**Weekly Habit - Gym (Mon/Wed/Fri)**:
```
Week 1:
  Mon: ✅
  Wed: ✅
  Fri: ✅  (week complete, streak = 1 week)

Week 2:
  Mon: ✅
  Wed: ❌  (week incomplete, streak = 0)
  Fri: ✅
```

---

## Postman Collection Structure

```
FocusHub - Habit Service
├── Habit Management
│   ├── Create Daily Habit
│   ├── Create Weekly Habit
│   ├── Create Custom Habit
│   ├── List Habits
│   ├── Get Habit Details
│   ├── Update Habit
│   ├── Delete Habit
│   └── Archive Habit
├── Completion Logging
│   ├── Log Today's Completion
│   ├── Log Specific Date
│   ├── Remove Completion
│   └── Get Completion History
├── Streak & Analytics
│   ├── Get Habit Streak
│   └── Get Overall Statistics
└── Tests
    ├── Create & Complete Daily
    ├── Test Weekly Habit
    └── Test Streak Calculation
```

---

## Postman Environment

```
habit_url = http://localhost:3004
access_token = (from auth service)
habit_id = (set when creating habit)
```

---

## Testing

```bash
cd habit-service
NODE_ENV=test npm test
```

**Expected**: 31/31 tests passing

**Test Coverage**:
- Habit CRUD: 8 tests
- Archiving: 2 tests
- Completion logging: 10 tests
- Streak calculations: 4 tests  (complex business logic)
- Statistics: 2 tests
- Authentication: 2 tests
- Edge cases: 4 tests

---

## Technical Details

### Frequency Types

| Type | Description | Required Fields |
|------|-------------|----------------|
| `daily` | Every day | None |
| `weekly` | Specific weekdays | `weeklyDays` array (0-6) |
| `custom` | Every N days | `customIntervalDays` integer |

### Streak Recalculation Triggers

Streaks automatically recalculate when:
1. New completion logged
2. Completion removed
3. Habit frequency changed (resets streaks)

### Performance Optimization

- `habit_streaks` table caches calculated streaks
- Recalculation only runs for affected habit
- Indexes on date fields for fast queries

---

## Error Handling

**400 Bad Request** - Weekly habit without days:
```json
{
  "success": false,
  "message": "weeklyDays required for weekly habits (at least one day)",
  "statusCode": 400
}
```

**400 Bad Request** - Future date:
```json
{
  "success": false,
  "message": "Cannot log completion for future dates",
  "statusCode": 400
}
```

**404 Not Found** - Habit doesn't exist:
```json
{
  "success": false,
  "message": "Habit not found",
  "statusCode": 404
}
```

---

## Database Migration

```bash
# Create database
createdb focushub_habits

# Run migrations
cd habit-service
npx db-migrate up

# Verify
psql -d focushub_habits -c "\d habits"
```

---

## Implementation Files

```
habit-service/
├── index.js                    # Server setup
├── index.test.js               # 31 tests
├── routes/
│   └── habits.js              # 11 endpoints
├── services/
│   └── habitService.js        # Business logic + streak algorithm
├── migrations/
│   ├── *-create-habits-table.js
│   ├── *-create-habit-logs-table.js
│   └── *-create-habit-streaks-table.js
└── database.json              # DB config
```

---

## Integration with Other Services

### With Task Service

Link habits to tasks:
```javascript
// Future enhancement
{
  "habitId": "meditation-habit-id",
  "taskId": "daily-meditation-task-id"
}
```

### With Focus Service

Track focus sessions per habit:
```javascript
// Future enhancement
POST /sessions
{
  "habitId": "deep-work-habit-id",
  "plannedDuration": 1500
}
```

---

## Future Enhancements

1. **Social Features**
   - Share habits with friends
   - Group challenges
   - Leaderboards

2. **Reminders & Notifications**
   - Push notifications at reminder time
   - Missed day alerts
   - Streak milestone celebrations

3. **Advanced Analytics**
   - Heatmap calendar view
   - Best time of day analysis
   - Habit correlation insights

4. **Gamification**
   - Achievements/badges
   - Streak milestones
   - Points system

5. **AI Features**
   - Habit recommendations
   - Optimal scheduling
   - Success predictions

---

**Phase 4 Complete!** ✅

**Next**: Deploy all 4 services and build frontend dashboard!
