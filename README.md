# FocusHub - Backend Distributed System

A production-ready backend microservices architecture for a comprehensive productivity and habit tracking platform.

## 🏗️ Architecture Overview

FocusHub is built as a distributed system using a microservices architecture with the following components:

```
┌──────────────┐
│    NGINX     │  Port 80
│ Reverse Proxy│
└──────┬───────┘
       │
┌──────▼───────────┐
│  Load Balancer   │  Port 8080
│    (Custom)      │
└──────┬───────────┘
       │
┌──────▼───────────┐
│   API Gateway    │  Port 3000
└──────┬───────────┘
       │
       ├─────────────┬─────────────┬─────────────┬─────────────┐
       │             │             │             │             │
┌──────▼──────┐ ┌───▼────┐  ┌─────▼─────┐ ┌─────▼─────┐ ┌────▼────┐
│Auth Service │ │  Task  │  │   Focus   │ │   Habit   │ │  Redis  │
│  Port 3001  │ │  3002  │  │   3003    │ │   3004    │ │  6379   │
└─────────────┘ └────────┘  └───────────┘ └───────────┘ └─────────┘
       │             │             │             │
┌──────▼─────────────▼─────────────▼─────────────▼──────┐
│              PostgreSQL (Local)                        │
│  focushub_auth | focushub_tasks | focushub_focus |    │
│                 focushub_habits                        │
└────────────────────────────────────────────────────────┘
```

## 🚀 Tech Stack

### Core Technologies
- **Runtime**: Node.js 20 (ARM64 compatible)
- **Web Framework**: Fastify (high-performance)
- **Database**: PostgreSQL 14
- **Cache/Rate Limiting**: Redis 7
- **Process Manager**: Nodemon (development)
- **Configuration**: dotenv

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: NGINX
- **Load Balancing**: Custom Node.js Load Balancer
- **Architecture**: Microservices with API Gateway pattern

## 📁 Project Structure

```
focushub/
├── gateway/              # API Gateway - Request routing and aggregation
├── auth-service/         # Authentication and authorization
├── task-service/         # Task management
├── focus-service/        # Focus session tracking
├── habit-service/        # Habit tracking
├── load-balancer/        # Custom load balancer
├── nginx/                # NGINX reverse proxy configuration
├── shared/               # Shared utilities and types
├── docker/               # Docker configurations
│   └── Dockerfile.node   # Node.js services Dockerfile
├── docker-compose.yml    # Multi-container orchestration
├── .env.example          # Environment variable template
├── .env                  # Local environment configuration
├── .gitignore           
└── README.md
```

## 🛠️ Local Development Setup

### Prerequisites

Ensure you have the following installed:
- **macOS**: Apple Silicon (ARM64)
- **Node.js**: v20 or higher
- **PostgreSQL**: v14 or higher
- **Docker Desktop**: For Apple Silicon
- **Git**: Version control

### Installation Steps

1. **Clone the repository** (if applicable):
   ```bash
   cd focushub
   ```

2. **Start PostgreSQL** (if not already running):
   ```bash
   brew services start postgresql@14
   ```

3. **Verify databases exist**:
   ```bash
   psql -d postgres -c "\l" | grep focushub
   ```
   
   You should see:
   - focushub_auth
   - focushub_tasks
   - focushub_focus
   - focushub_habits

4. **Install dependencies for all services**:
   ```bash
   # Gateway
   cd gateway && npm install && cd ..
   
   # Auth Service
   cd auth-service && npm install && cd ..
   
   # Task Service
   cd task-service && npm install && cd ..
   
   # Focus Service
   cd focus-service && npm install && cd ..
   
   # Habit Service
   cd habit-service && npm install && cd ..
   
   # Load Balancer
   cd load-balancer && npm install && cd ..
   ```

5. **Configure environment variables**:
   ```bash
   # Already created, but verify .env exists
   cat .env
   ```

## 🐳 Running with Docker

### Start all services with Docker Compose:

```bash
docker-compose up --build
```

This will start:
- Redis (port 6379)
- Gateway (port 3000)
- Auth Service (port 3001)
- Task Service (port 3002)
- Focus Service (port 3003)
- Habit Service (port 3004)
- Load Balancer (port 8080)
- NGINX (port 80)

### Stop all services:

```bash
docker-compose down
```

### View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
```

## 💻 Running Services Locally (Without Docker)

### Start Redis with Docker:
```bash
docker run -d -p 6379:6379 --name focushub-redis redis:7-alpine
```

### Start individual services:

```bash
# Terminal 1 - Gateway
cd gateway && npm run dev

# Terminal 2 - Auth Service
cd auth-service && npm run dev

# Terminal 3 - Task Service
cd task-service && npm run dev

# Terminal 4 - Focus Service
cd focus-service && npm run dev

# Terminal 5 - Habit Service
cd habit-service && npm run dev

# Terminal 6 - Load Balancer
cd load-balancer && npm run dev
```

## 🔍 Health Checks

Each service exposes a `/health` endpoint:

```bash
# Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# Task Service
curl http://localhost:3002/health

# Focus Service
curl http://localhost:3003/health

# Habit Service
curl http://localhost:3004/health

# Load Balancer
curl http://localhost:8080/health

# Via NGINX
curl http://localhost/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "service-name",
  "database": "connected",
  "timestamp": "2026-01-18T02:50:14.000Z"
}
```

## 🌐 Service Endpoints

| Service | Port | Endpoint |
|---------|------|----------|
| NGINX | 80 | http://localhost |
| Load Balancer | 8080 | http://localhost:8080 |
| Gateway | 3000 | http://localhost:3000 |
| Auth Service | 3001 | http://localhost:3001 |
| Task Service | 3002 | http://localhost:3002 |
| Focus Service | 3003 | http://localhost:3003 |
| Habit Service | 3004 | http://localhost:3004 |
| Redis | 6379 | localhost:6379 |

## 📊 Database Information

Each service has its own PostgreSQL database:

- **focushub_auth**: User authentication and profiles
- **focushub_tasks**: Task and project management
- **focushub_focus**: Focus sessions and time tracking
- **focushub_habits**: Habit tracking and streaks

Connection settings are in `.env` file.

## 🔧 Development Scripts

Each service supports:

```bash
npm start       # Production mode
npm run dev     # Development mode with nodemon (auto-reload)
```

## 🐛 Troubleshooting

### PostgreSQL connection issues:
```bash
# Check if PostgreSQL is running
brew services list | grep postgres

# Start PostgreSQL
brew services start postgresql@14
```

### Docker issues:
```bash
# Ensure Docker Desktop is running
docker info

# Clean up containers
docker-compose down -v
docker system prune
```

### Port conflicts:
```bash
# Check what's using a port
lsof -i :3000

# Kill process on port
kill -9 <PID>
```

## 🚦 Next Steps

1. **Implement service-specific routes** in each microservice
2. **Add authentication middleware** to Gateway
3. **Implement load balancing logic** in Load Balancer
4. **Setup database migrations** for each service
5. **Add API documentation** with Swagger/OpenAPI
6. **Implement monitoring** with Prometheus/Grafana
7. **Add centralized logging** with ELK stack
8. **Setup CI/CD pipeline** with GitHub Actions

## 📝 License

This project is for educational and development purposes.

---

**Built with ❤️ using Node.js, Fastify, PostgreSQL, Redis, and Docker**
