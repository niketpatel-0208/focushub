# FocusHub - Productivity & Focus Management Platform

> A comprehensive productivity platform that helps you manage tasks, track focus sessions using the Pomodoro technique, and maintain productive habits.

## 🎯 What is FocusHub?

**FocusHub** is a productivity app that helps you:
- **Manage Tasks**: Create, organize, and track your work
- **Focus Better**: Use Pomodoro-style timers to work in focused bursts
- **Build Habits**: Track and maintain daily/weekly habits with streak tracking

**Think of it as**: Todoist + Forest App + Habitica combined into one productivity system.

---

## 🏗️ Architecture - Simple Explanation

### Microservices Design

Instead of one giant application, FocusHub is split into separate "mini-services":

```
┌─────────────────────────────────────────────┐
│         NGINX (Reverse Proxy)               │
│         Routes incoming requests            │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐    ┌────▼──────────┐
│  Load Balancer │    │    Gateway    │
│  (Distribution)│    │  (API Router) │
└───────┬────────┘    └────┬──────────┘
        │                  │
    ┌───┴────┬─────────────┼──────────────┐
    │        │             │              │
┌───▼───┐ ┌─▼────┐  ┌─────▼─────┐  ┌────▼─────┐
│ Auth  │ │ Task │  │   Focus   │  │  Habit   │
│Service│ │Service│  │  Service  │  │ Service  │
│       │ │       │  │           │  │          │
└───┬───┘ └──┬───┘  └─────┬─────┘  └────┬─────┘
    │        │            │              │
┌───▼────────▼────────────▼──────────────▼─────┐
│          PostgreSQL Database                  │
│  (Separate DBs for each service)              │
└───────────────────────────────────────────────┘
```

**Why microservices?**
- Each service can be developed independently
- Easier to scale (add more servers for busy services)
- If one service crashes, others keep working
- Different teams can work on different services

---

## 📦 Current Status - All 4 Phases Complete! 🎉

### ✅ Phase 1: Authentication Service (Complete)
**What it does**: Manages user accounts and login

**Features**:
- User registration
- Login/logout
- Password management
- JWT tokens for security
- Profile updates

**API Endpoints**: 7  
**Tests**: 17/17 passing ✅

---

### ✅ Phase 2: Task Management Service (Complete)
**What it does**: Helps you organize your work

**Features**:
- **Projects**: Group related tasks (e.g., "Build Website", "Learn Python")
- **Tasks**: Individual work items with:
  - Title, description, due dates
  - Priority levels (low, medium, high, urgent)
  - Status tracking (todo, in_progress, completed)
- **Tags**: Categorize tasks (#work, #personal, #urgent)
- **Smart Search**: Find tasks by keywords
- **Filtering**: View tasks by status, priority, project, tags
- **Statistics**: See how many tasks completed, overdue, etc.

**API Endpoints**: 22  
**Tests**: 23/23 passing ✅

**Example Use Case**:
```
Project: "Launch Mobile App"
  ├─ Task: Design UI mockups [High Priority]
  ├─ Task: Build authentication [Urgent]
  └─ Task: Write documentation [Medium Priority]
```

---

### ✅ Phase 3: Focus Session Service (Complete) 🎉
**What it does**: Helps you focus using the Pomodoro Technique

**The Pomodoro Technique** (explained simply):
1. Choose a task
2. Set a timer for 25 minutes (one "Pomodoro")
3. Work without distractions until timer rings
4. Take a 5-minute break
5. Repeat!

**Features**:
- **Start Focus Sessions**: Begin a 25-minute focus timer
- **Pause/Resume**: Handle interruptions without losing progress
- **Track Time**: Accurate tracking of:
  - How long you worked
  - How long you paused
  - Number of interruptions
- **Complete/Cancel**: Mark sessions as done or cancelled
- **Rich Analytics**: See your focus patterns:
  - Total focus time per day/week/month
  - Completion rates
  - Most productive hours
  - Average interruptions
- **Task Integration**: Link sessions to specific tasks

**API Endpoints**: 9  
**Tests**: 22/22 passing ✅

**Example Workflow**:
```
1. Start session → Timer begins (25:00)
2. Work on "Build login feature"
3. Phone rings → Pause (worked 15:30)
4. After call → Resume
5. Timer ends → Complete session
   ✓ Worked: 25 minutes
   ✓ Breaks: 3 minutes  
   ✓ Interruptions: 1
```

**Analytics Dashboard** (what you'll see):
```
This Week:
  Total Sessions: 24
  Completed: 20 (83% completion rate)
  Total Focus Time: 10 hours
  Most Productive: 9-11 AM
  Average Interruptions: 1.2 per session
```

---

### 🎯 Phase 4: Habit Tracking Service (Complete) 🎉
**What it does**: Build and maintain daily/weekly habits with streak tracking

**Features**:
- **Multiple Frequencies**:
  - Daily habits (every day)
  - Weekly habits (specific days: Mon/Wed/Fri)
  - Custom interval (every N days)
- **Streak Calculation**: Automatic tracking of:
  - Current streak (consecutive completions)
  - Longest streak ever
  - Total completions
- **Completion Logging**:
  - Log today or backfill past dates
  - Track values (e.g., 8 glasses of water)
  - Add notes to completions
- **Analytics**: View habit statistics:
  - Total habits
  - Completion rates
  - Best performing habits
  - Consistency metrics
- **Archiving**: Hide habits without losing history

**API Endpoints**: 11  
**Tests**: 27/27 passing ✅

**Example Workflow**:
```
1. Create habit → "Morning meditation" (daily)
2. Day 1: Complete → Streak = 1
3. Day 2: Complete → Streak = 2
4. Day 3: Complete → Streak = 3
5. Day 4: Miss → Streak = 0
6. Day 5: Complete → Streak = 1 (starts over)
```

**Habit Types**:
```
Daily: "Drink 8 glasses of water"
  → Must complete every day

Weekly: "Gym workout" (Mon/Wed/Fri)
  → Must complete on specified days only

Custom: "Deep clean house" (every 7 days)
  → Must complete every N days
```

**Streak Algorithm**:
- Automatically recalculates on completion/deletion
- Tracks both current and longest streaks
- Optimized with materialized streak table

---

## 🗄️ Database Migrations - Explained Simply

### What Are Migrations?

**Simple Analogy**: Building Instructions for Your Database

Imagine you're building with LEGO:
- **Without migrations**: You tell each friend verbally how to build it → everyone's version is different
- **With migrations**: You write step-by-step instructions → everyone builds the same thing

**Migrations are scripts that**:
1. Create tables (e.g., `users`, `tasks`, `focus_sessions`)
2. Add columns (e.g., add `priority` field to tasks)
3. Modify structure (e.g., change column types)
4. Can be undone/rolled back

### Example Migration (Focus Sessions)

```sql
-- Migration: Create focus_sessions table
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  elapsed_time INTEGER DEFAULT 0
);

-- Add indexes for fast lookups
CREATE INDEX idx_user_id ON focus_sessions(user_id);
```

### Why Migrations Are Essential

✅ **Team Collaboration**: Everyone runs the same migrations → same database  
✅ **Deployment**: Production server auto-creates tables  
✅ **Version Control**: Track database changes like code  
✅ **Rollback**: Undo changes if something breaks  
✅ **Documentation**: Clear history of what changed when

### Migration Files in FocusHub

```
focus-service/migrations/
├── 20260124181448-create-focus-sessions-table.js  # Main migration file
└── sqls/
    ├── *-up.sql    # Commands to CREATE tables
    └── *-down.sql  # Commands to DROP tables (rollback)
```

**Commands**:
```bash
# Apply migrations (create tables)
npx db-migrate up

# Undo last migration (drop tables)
npx db-migrate down

# Check migration status
npx db-migrate status
```

### Should You Commit Migrations? **YES!**

**Commit**:
- ✅ Migration files (`*.js`, `*.sql`)
- ✅ Migration config (`migrations.json`, `database.json`)

**Don't Commit**:
- ❌ Actual database files
- ❌ Environment variables (`.env`)

**In Git**:
```
✅ migrations/20260124181448-create-focus-sessions-table.js
✅ migrations/sqls/20260124181448-up.sql
❌ .env (contains passwords)
❌ database data files
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- PostgreSQL installed
- Redis installed (for rate limiting)

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/niketpatel-0208/focushub.git
cd focushub

# 2. Install dependencies
cd auth-service && npm install
cd ../task-service && npm install
cd ../focus-service && npm install
cd ../habit-service && npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Create databases
createdb focushub_auth
createdb focushub_tasks
createdb focushub_focus
createdb focushub_habits

# 5. Run migrations
cd auth-service && npx db-migrate up
cd ../task-service && npx db-migrate up
cd ../focus-service && npx db-migrate up
cd ../habit-service && npx db-migrate up

# 6. Start services
cd auth-service && npm run dev     # Port 3001
cd task-service && npm run dev     # Port 3002
cd focus-service && npm run dev    # Port 3003
cd habit-service && npm run dev    # Port 3004
```

### Testing

```bash
# Run all tests
cd auth-service && NODE_ENV=test npm test
cd task-service && NODE_ENV=test npm test
cd focus-service && NODE_ENV=test npm test
cd habit-service && NODE_ENV=test npm test

# Should see:
# Auth: 17/17 passing ✅
# Tasks: 23/23 passing ✅
# Focus: 22/22 passing ✅
# Habits: 27/27 passing ✅
# TOTAL: 89/89 tests (100%)!
```

---

## 📱 How to Use (API Examples)

### 1. Register & Login

```bash
# Register
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secure123","username":"yourname"}'

# Login (get token)
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"secure123"}'

# Response includes: "accessToken": "eyJhbG..."
```

### 2. Create a Task

```bash
curl -X POST http://localhost:3002/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build user dashboard",
    "priority": "high",
    "dueDate": "2026-01-30",
    "tags": ["work", "frontend"]
  }'
```

### 3. Start a Focus Session

```bash
# Start 25-minute focus session
curl -X POST http://localhost:3003/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plannedDuration": 1500}'

# Pause session
curl -X PATCH http://localhost:3003/sessions/{SESSION_ID}/pause \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resume session
curl -X PATCH http://localhost:3003/sessions/{SESSION_ID}/resume \
  -H "Authorization: Bearer YOUR_TOKEN"

# Complete session
curl -X PATCH http://localhost:3003/sessions/{SESSION_ID}/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"notes": "Great session!"}'
```

### 4. View Statistics

```bash
# Task statistics
curl -X GET http://localhost:3002/tasks/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Focus statistics (weekly)
curl -X GET http://localhost:3003/stats?period=week \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 What is FocusHub?

FocusHub is a **productivity powerhouse** that combines four core services to help you:

- **🔐 Authentication**: Secure user accounts with JWT
- **✅ Task Management**: Organize projects, tasks, and tags with powerful filtering
- **⏱️ Focus Sessions**: Track Pomodoro-style focus time with analytics
- **🎯 Habit Tracking**: Build and maintain daily/weekly habits with streak tracking

All services work together seamlessly through a unified API gateway, giving you complete control over your productivity workflow.

---

## 🏗️ Architecture

FocusHub is built as a **microservices architecture** with:

- **4 Independent Services** (Auth, Tasks, Focus, Habits)
- **API Gateway** for unified access
- **PostgreSQL** databases (one per service)
- **Redis** for caching and rate limiting
- **Nginx** load balancer for high availability

### Services Overview

| Service | Port | Database | Endpoints | Tests | Status |
|---------|------|----------|-----------|-------|--------|
| **Auth** | 3001 | focushub_auth | 7 | 17/17 ✅ | Complete |
| **Tasks** | 3002 | focushub_tasks | 22 | 23/23 ✅ | Complete |
| **Focus** | 3003 | focushub_focus | 9 | 22/22 ✅ | Complete |
| **Habits** | 3004 | focushub_habits | 11 | 31/31 ✅ | Complete |
| **Gateway** | 3000 | - | - | - | Complete |
| **Load Balancer** | 8080 | - | - | - | Complete |
| **TOTAL** | - | 4 DBs | **49** | **93/93** | **🎉 100%** |

---

## 🛠️ Tech Stack

**Backend**:
- **Node.js** - JavaScript runtime
- **Fastify** - Fast web framework
- **PostgreSQL** - Reliable database
- **Redis** - Caching & rate limiting
- **JWT** - Secure authentication
- **Zod** - Input validation

**Testing**:
- **Jest** - Testing framework
- **Supertest** - API testing

**DevOps**:
- **NGINX** - Reverse proxy
- **db-migrate** - Database migrations
- **dotenv** - Environment config

---

## 📂 Project Structure

```
focushub/
├── .env                      # Environment variables (don't commit!)
├── .env.example              # Template for .env
├── .gitignore                # Git ignore rules
│
├── shared/                   # Code shared across services
│   ├── utils/                # Utilities (database, JWT, logger)
│   ├── middleware/           # Auth, error handling
│   └── validators/           # Zod schemas
│
├── auth-service/             # User authentication
│   ├── index.js              # Server setup
│   ├── index.test.js         # Tests (17)
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   ├── migrations/           # Database setup scripts
│   └── package.json
│
├── task-service/             # Task management
│   ├── index.js
│   ├── index.test.js         # Tests (23)
│   ├── routes/               # Tasks, projects, tags
│   ├── services/
│   ├── migrations/
│   └── package.json
│
├── focus-service/            # Focus session tracking
│   ├── index.js
│   ├── index.test.js         # Tests (22)
│   ├── routes/               # Session endpoints
│   ├── services/
│   ├── migrations/           # focus_sessions table
│   └── package.json
│
├── gateway/                  # API gateway (future)
├── load-balancer/            # Load distribution
└── nginx/                    # Reverse proxy config
```

---

## 🔐 Security Features

✅ **Password Hashing** (bcrypt)  
✅ **JWT Authentication** (stateless tokens)  
✅ **Rate Limiting** (prevent abuse)  
✅ **Input Validation** (Zod schemas)  
✅ **SQL Injection Protection** (parameterized queries)  
✅ **CORS** (cross-origin security)  
✅ **Environment Variables** (secrets not in code)

---

## 🚦 Roadmap

- [x] **Phase 1**: Authentication System
- [x] **Phase 2**: Task Management  
- [x] **Phase 3**: Focus Session Tracking
- [ ] **Phase 4**: Habit Tracking
- [ ] **Phase 5**: Analytics Dashboard
- [ ] **Phase 6**: Mobile App (React Native)
- [ ] **Phase 7**: Team Collaboration

---

## 📚 Documentation

- [Phase 1 Walkthrough](docs/phase1-walkthrough.md) - Auth implementation
- [Phase 2 Testing Guide](docs/phase2-testing.md) - Task service tests
- [Phase 3 Walkthrough](docs/phase3-walkthrough.md) - Focus service complete guide
- [API Documentation](docs/api-reference.md) - All endpoints
- [Database Schema](docs/database-schema.md) - Table structures

---

## 🤝 Contributing

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm test

# Commit with meaningful message
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

**Branch Naming**:
- `feature/*` - New features
- `fix/*` - Bug fixes
- `phase*/*` - Major phase work

---

## 📝 License

MIT License - Feel free to use this project for learning or production!

---

## 💪 What You've Built

### Phase 3 Achievements

You now have a **production-ready focus tracking system** that:

✅ Tracks work sessions with accurate timing  
✅ Handles pause/resume with interruption counting  
✅ Provides rich productivity analytics  
✅ Integrates with your task management  
✅ Has 100% test coverage (22/22 tests passing)  
✅ Uses proper database migrations  
✅ Follows enterprise best practices

**Real-world comparison**: The focus service is similar to what apps like **Forest**, **Focus@Will**, or **Toggl Track** provide, but integrated into your own productivity platform.

---

## 🎓 Learning Outcomes

From building FocusHub, you've learned:

**Backend Development**:
- Microservices architecture
- RESTful API design
- Database design & migrations
- Authentication (JWT)
- Testing (unit tests)

**Software Engineering**:
- Git workflows & branching
- Code organization
- Documentation
- Error handling
- Security best practices

**DevOps**:
- Environment configuration
- Database migrations
- Service deployment
- Testing strategies

---

**Built with ❤️ by Niket Patel**

*Making productivity effortless, one Pomodoro at a time* 🍅


