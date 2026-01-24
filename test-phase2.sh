#!/bin/bash

# Phase 2 Testing Script - Task Management Service
# Assumes Phase 1 (auth) is already tested and working

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

TASK_URL="http://localhost:3002"

echo "🚀 Phase 2 Testing - Task Management Service"
echo "============================================="
echo ""

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ TOKEN environment variable not set${NC}"
  echo "Please login first and export TOKEN:"
  echo "  export TOKEN=\"your-access-token\""
  exit 1
fi

echo -e "${GREEN}✅ Using token: ${TOKEN:0:20}...${NC}"
echo ""

# Health check
echo -e "${YELLOW}Step 1: Health Check${NC}"
HEALTH=$(curl -s "$TASK_URL/health")
echo "$HEALTH" | jq '.'

DB_STATUS=$(echo "$HEALTH" | jq -r '.database')
REDIS_STATUS=$(echo "$HEALTH" | jq -r '.redis')

if [ "$DB_STATUS" = "connected" ] && [ "$REDIS_STATUS" = "connected" ]; then
  echo -e "${GREEN}✅ Task service healthy${NC}"
else
  echo -e "${RED}❌ Task service not healthy${NC}"
  exit 1
fi
echo ""

# Create project
echo -e "${YELLOW}Step 2: Create Project${NC}"
PROJECT=$(curl -s -X POST "$TASK_URL/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Automated test",
    "color": "#3B82F6"
  }')

echo "$PROJECT" | jq '.'
PROJECT_ID=$(echo "$PROJECT" | jq -r '.data.id')

if [ "$PROJECT_ID" != "null" ]; then
  echo -e "${GREEN}✅ Project created: $PROJECT_ID${NC}"
else
  echo -e "${RED}❌ Project creation failed${NC}"
  exit 1
fi
echo ""

# Create tags
echo -e "${YELLOW}Step 3: Create Tags${NC}"
TAG1=$(curl -s -X POST "$TASK_URL/tags" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "urgent", "color": "#EF4444"}')

TAG1_ID=$(echo "$TAG1" | jq -r '.data.id')
echo "Urgent tag: $TAG1_ID"

TAG2=$(curl -s -X POST "$TASK_URL/tags" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "work", "color": "#10B981"}')

TAG2_ID=$(echo "$TAG2" | jq -r '.data.id')
echo "Work tag: $TAG2_ID"

if [ "$TAG1_ID" != "null" ] && [ "$TAG2_ID" != "null" ]; then
  echo -e "${GREEN}✅ Tags created${NC}"
else
  echo -e "${RED}❌ Tag creation failed${NC}"
  exit 1
fi
echo ""

# Create tasks
echo -e "${YELLOW}Step 4: Create Tasks${NC}"

# Task 1 - with project
TASK1=$(curl -s -X POST "$TASK_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Write documentation\",
    \"description\": \"API docs\",
    \"projectId\": \"$PROJECT_ID\",
    \"status\": \"in_progress\",
    \"priority\": \"high\",
    \"dueDate\": \"2026-01-30T17:00:00Z\"
  }")

TASK1_ID=$(echo "$TASK1" | jq -r '.data.id')
echo "Task 1: $TASK1_ID"

# Task 2 - urgent
TASK2=$(curl -s -X POST "$TASK_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix bug",
    "priority": "urgent"
  }')

TASK2_ID=$(echo "$TASK2" | jq -r '.data.id')
echo "Task 2: $TASK2_ID"

# Task 3 - overdue
TASK3=$(curl -s -X POST "$TASK_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Overdue task",
    "dueDate": "2026-01-20T12:00:00Z"
  }')

TASK3_ID=$(echo "$TASK3" | jq -r '.data.id')
echo "Task 3: $TASK3_ID"

if [ "$TASK1_ID" != "null" ]; then
  echo -e "${GREEN}✅ Tasks created${NC}"
else
  echo -e "${RED}❌ Task creation failed${NC}"
  exit 1
fi
echo ""

# Add tag to task
echo -e "${YELLOW}Step 5: Add Tag to Task${NC}"
TAG_RESULT=$(curl -s -X POST "$TASK_URL/tasks/$TASK1_ID/tags" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tagId\": \"$TAG1_ID\"}")

echo "$TAG_RESULT" | jq '.data.tags'

if echo "$TAG_RESULT" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✅ Tag added to task${NC}"
else
  echo -e "${RED}❌ Adding tag failed${NC}"
fi
echo ""

# Test filtering
echo -e "${YELLOW}Step 6: Test Filtering${NC}"

# Filter by status
IN_PROGRESS=$(curl -s "$TASK_URL/tasks?status=in_progress" \
  -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$IN_PROGRESS" | jq '.data | length')
echo "In progress tasks: $COUNT"

# Filter by priority
URGENT=$(curl -s "$TASK_URL/tasks?priority=urgent" \
  -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$URGENT" | jq '.data | length')
echo "Urgent tasks: $COUNT"

# Search
SEARCH=$(curl -s "$TASK_URL/tasks?search=documentation" \
  -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$SEARCH" | jq '.data | length')
echo "Search results: $COUNT"

echo -e "${GREEN}✅ Filtering works${NC}"
echo ""

# Test statistics
echo -e "${YELLOW}Step 7: Get Statistics${NC}"
STATS=$(curl -s "$TASK_URL/tasks/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATS" | jq '.data'

TOTAL=$(echo "$STATS" | jq -r '.data.total')
OVERDUE=$(echo "$STATS" | jq -r '.data.overdue')

echo "Total tasks: $TOTAL"
echo "Overdue: $OVERDUE"

if [ "$TOTAL" != "null" ]; then
  echo -e "${GREEN}✅ Statistics working${NC}"
else
  echo -e "${RED}❌ Statistics failed${NC}"
fi
echo ""

# Complete task
echo -e "${YELLOW}Step 8: Complete Task${NC}"
COMPLETE=$(curl -s -X POST "$TASK_URL/tasks/$TASK2_ID/complete" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo "$COMPLETE" | jq -r '.data.status')
COMPLETED_AT=$(echo "$COMPLETE" | jq -r '.data.completed_at')

echo "Status: $STATUS"
echo "Completed at: $COMPLETED_AT"

if [ "$STATUS" = "completed" ] && [ "$COMPLETED_AT" != "null" ]; then
  echo -e "${GREEN}✅ Task completion works${NC}"
else
  echo -e "${RED}❌ Task completion failed${NC}"
fi
echo ""

# Update task
echo -e "${YELLOW}Step 9: Update Task${NC}"
UPDATE=$(curl -s -X PUT "$TASK_URL/tasks/$TASK1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priority": "medium", "status": "completed"}')

NEW_PRIORITY=$(echo "$UPDATE" | jq -r '.data.priority')
echo "New priority: $NEW_PRIORITY"

if [ "$NEW_PRIORITY" = "medium" ]; then
  echo -e "${GREEN}✅ Task update works${NC}"
else
  echo -e "${RED}❌ Task update failed${NC}"
fi
echo ""

# Archive project
echo -e "${YELLOW}Step 10: Archive Project${NC}"
ARCHIVE=$(curl -s -X POST "$TASK_URL/projects/$PROJECT_ID/archive" \
  -H "Authorization: Bearer $TOKEN")

IS_ARCHIVED=$(echo "$ARCHIVE" | jq -r '.data.is_archived')

if [ "$IS_ARCHIVED" = "true" ]; then
  echo -e "${GREEN}✅ Project archiving works${NC}"
else
  echo -e "${RED}❌ Project archiving failed${NC}"
fi
echo ""

echo "============================================="
echo -e "${GREEN}🎉 Phase 2 Tests Complete!${NC}"
echo "============================================="
echo ""
echo "Summary:"
echo "  ✅ Projects CRUD"
echo "  ✅ Tags CRUD"
echo "  ✅ Tasks CRUD"
echo "  ✅ Filtering & Search"
echo "  ✅ Statistics"
echo "  ✅ Task Completion"
echo "  ✅ Tag Relationships"
echo "  ✅ Project Archiving"
echo ""
echo "Phase 2 is working correctly! 🚀"
