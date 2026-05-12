# İNFUHUB Backend API Endpoints

## Overview
This document lists all available API endpoints for the İNFUHUB platform.

## Authentication Endpoints
- `POST /api/auth/login` - User login (brand or influencer)

## Brand Endpoints
- `POST /api/brands/register` - Register new brand
- `GET /api/brands` - Get all brands
- `PATCH /api/brands/:id/status` - Update brand status

## Influencer Endpoints
- `POST /api/influencers/register` - Register new influencer (with photo upload)
- `GET /api/influencers` - Get all influencers
- `PATCH /api/influencers/:id/status` - Update influencer status

## Campaign Endpoints
- `POST /api/campaigns/create` - Create new campaign
- `GET /api/campaigns/brand/:brandId` - Get all campaigns for a brand
- `GET /api/campaigns/:id` - Get campaign details
- `GET /api/campaigns/:id/matched-influencers` - Get matched influencers for campaign

## Offer Endpoints
- `POST /api/offers/send` - Send offer to influencer
- `GET /api/offers/influencer/:influencerId` - Get offers for influencer
- `GET /api/offers/brand/:brandId` - Get offers sent by brand
- `PATCH /api/offers/:id/status` - Update offer status (accept/reject)

## Content Endpoints (NEW)
- `POST /api/contents/upload` - Upload content for review
- `GET /api/contents/brand/:brandId` - Get all contents for brand
- `GET /api/contents/:id` - Get content by ID
- `PATCH /api/contents/:id/review` - Review content (approve/request_revision/reject)

## Message Endpoints (NEW)
- `GET /api/messages/conversations/:userId?userType=brand|influencer` - Get conversations for user
- `GET /api/messages/conversation/:conversationId` - Get messages in conversation
- `POST /api/messages/send` - Send message
- `PATCH /api/messages/:id/read` - Mark message as read
- `POST /api/messages/conversation/:conversationId/archive` - Archive conversation

## Notification Endpoints (NEW)
- `GET /api/notifications/:userId` - Get notifications for user
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all/:userId` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

## Analytics Endpoints (NEW)
- `GET /api/analytics/overview/:brandId` - Get analytics overview
- `GET /api/analytics/campaigns/:brandId` - Get campaign performance metrics
- `GET /api/analytics/trends/:brandId?period=monthly` - Get trend data
- `GET /api/analytics/categories/:brandId` - Get category breakdown

## Budget Endpoints (NEW)
- `GET /api/budget/:brandId` - Get budget overview
- `GET /api/budget/breakdown/:brandId` - Get budget breakdown by campaign
- `GET /api/budget/history/:brandId` - Get payment history

## Data Models

### New JSON Files Created:
1. `server/data/contents.json` - Content submissions
2. `server/data/messages.json` - Messages
3. `server/data/conversations.json` - Conversations
4. `server/data/notifications.json` - Notifications

### ID Generation
All entities now use a unique ID generation function that combines timestamp and random string:
- Format: `{timestamp}-{randomString}`
- Example: `1704123456789-abc123xyz`
- Guaranteed uniqueness through property-based testing

## Testing
Property-based tests have been implemented for:
- **Property 1: Unique ID Generation** - Validates that all generated IDs are unique
  - Test file: `server/utils/idGenerator.test.js`
  - Status: ✅ PASSED (100 iterations)
  - Validates: Requirements 1.1
