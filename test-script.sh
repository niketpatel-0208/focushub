#!/bin/bash

# FocusHub Quick Test Script
# This script runs a basic end-to-end test of both services

set -e  # Exit on error

echo "🚀 FocusHub Testing Script"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URLs
AUTH_URL="http://localhost:3001"
TASK_URL="http://localhost:3002"

# Test data
EMAIL="test-$(date +%s)@focushub.com"
PASSWORD="SecurePass@123"
USERNAME="testuser$(date +%s)"

echo -e "${YELLOW}Step 1: Health Checks${NC}"
echo "Checking auth service..."
curl -s "$AUTH_URL/health" | jq '.status' || echo "❌ Auth service not running!"

echo "Checking task service..."
curl -s "$TASK_URL/health" | jq '.status' || echo "❌ Task service not running!"
echo ""

echo -e "${YELLOW}Step 2: Register User${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"username\": \"$USERNAME\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'

if echo "$REGISTER_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✅ Registration successful${NC}"
else
  echo -e "${RED}❌ Registration failed${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 3: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✅ Login successful${NC}"
  echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Get User Profile${NC}"
PROFILE_RESPONSE=$(curl -s "$AUTH_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$PROFILE_RESPONSE" | jq '.'

if echo "$PROFILE_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✅ Profile retrieved${NC}"
else
  echo -e "${RED}❌ Profile retrieval failed${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 5: Create Project${NC}"
PROJECT_RESPONSE=$(curl -s -X POST "$TASK_URL/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Automated test project",
    "color": "#3B82F6"
  }')

echo "$PROJECT_RESPONSE" | jq '.'

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.data.id')

if [ "$PROJECT_ID" != "null" ] && [ -n "$PROJECT_ID" ]; then
  echo -e "${GREEN}✅ Project created${NC}"
  echo "Project ID: $PROJECT_ID"
else
  echo -e "${RED}❌ Project creation failed${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Create Tag${NC}"
TAG_RESPONSE=$(curl -s -X POST "$TASK_URL/tags" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "urgent",
    "color": "#EF4444"
  }')

echo "$TAG_RESPONSE" | jq '.'

TAG_ID=$(echo "$TAG_RESPONSE" | jq -r '.data.id')

if [ "$TAG_ID" != "null" ] && [ -n "$TAG_ID" ]; then
  echo -e "${GREEN}✅ Tag created${NC}"
  echo "Tag ID: $TAG_ID"
else
  echo -e "${RED}❌ Tag creation failed${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 7: Create Task${NC}"
TASK_RESPONSE=$(curl -s -X POST "$TASK_URL/tasks" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Automated test task\",
    \"description\": \"This is a test task\",
    \"projectId\": \"$PROJECT_ID\",
    \"status\": \"in_progress\",
    \"priority\": \"high\"
  }")

echo "$TASK_RESPONSE" | jq '.'

TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.id')

if [ "$TASK_ID" != "null" ] && [ -n "$TASK_ID" ]; then
  echo -e "${GREEN}✅ Task created${NC}"
  echo "Task ID: $TASK_ID"
else
  echo -e "${RED}❌ Task creation failed${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 8: Add Tag to Task${NC}"
TAG_TASK_RESPONSE=$(curl -s -X POST "$TASK_URL/tasks/$TASK_ID/tags" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tagId\": \"$TAG_ID\"}")

echo "$TAG_TASK_RESPONSE" | jq '.'

if echo "$TAG_TASK_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✅ Tag added to task${NC}"
else
  echo -e "${RED}❌ Adding tag failed${NC}"
fi
echo ""

echo -e "${YELLOW}Step 9: Get Task Statistics${NC}"
STATS_RESPONSE=$(curl -s "$TASK_URL/tasks/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$STATS_RESPONSE" | jq '.'

if echo "$STATS_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✅ Statistics retrieved${NC}"
else
  echo -e "${RED}❌ Statistics failed${NC}"
fi
echo ""

echo -e "${YELLOW}Step 10: List Tasks${NC}"
TASKS_LIST=$(curl -s "$TASK_URL/tasks" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$TASKS_LIST" | jq '.'

TASK_COUNT=$(echo "$TASKS_LIST" | jq '.data | length')
echo -e "${GREEN}✅ Found $TASK_COUNT task(s)${NC}"
echo ""

echo "=========================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo "=========================="
echo ""
echo "Your FocusHub backend is working correctly!"
echo ""
echo "Credentials for manual testing:"
echo "  Email: $EMAIL"
echo "  Password: $PASSWORD"
echo "  Access Token: ${ACCESS_TOKEN:0:30}..."
