# GO Game Development Plan: Agile Roadmap

**Last Updated**: August 2025

## Executive Summary

### 🎯 Project Status: Phase 3 - Backend Integration Active

The Go Game has successfully completed its MVP phase and core multiplayer functionality. The game is fully playable both locally and online with real-time multiplayer support via PartyKit.

### ✅ What's Done (Phases 1-3)
- **Complete Go game engine** with all rules (ko, suicide prevention, captures)
- **Full UI implementation** with 3 themes and responsive design
- **Scoring system** with dead stone marking (Japanese rules)
- **Real-time multiplayer** via PartyKit (WebSocket)
- **Room-based gameplay** with spectator support
- **Backend API** with JWT auth, user management, game endpoints
- **State management** with Zustand (auth/UI) + TanStack Query (server state)
- **ELO rating system** calculation in backend
- **PartyKit-Backend integration** via webhooks

### 🚧 Current Sprint Focus (Phase 4)
1. **AI Opponent** - Single player vs computer
2. **User profiles UI** - Display stats, history, avatars
3. **Leaderboard** - Global rankings display
4. **Game persistence** - Save completed games to MongoDB

### 📅 Timeline Adjustment
- **Original Plan**: 22 weeks total
- **Current Progress**: Phases 1-3 complete (backend integration done)
- **Revised Timeline**: 
  - Phase 4: 2-3 weeks (AI opponent & UI polish)
  - Phase 5: 2-3 weeks (Advanced AI & analysis)
  - Phase 6: 2-3 weeks (Mobile PWA & monetization)

### 🎯 Next Immediate Tasks
1. ✅ Connect PartyKit games to MongoDB via webhook
2. ✅ Implement ELO calculation system
3. ✅ Add state management (Zustand + TanStack Query)
4. 🚧 Build AI opponent (single player mode)
5. 🚧 Create user profile UI components
6. 🚧 Build leaderboard display

### 🧾 PRD Addendum: Nice-to-Have Feature Proposals

These features are non-blocking for the core two-player multiplayer release. They should be considered after the join, invite, rejoin, move validation, and game-completion paths are reliable.

| Feature | User Value | Proposed Scope | Acceptance Signal |
| --- | --- | --- | --- |
| In-game chat | Players can coordinate, clarify scoring, and keep matches social without leaving the game. | Room-scoped text chat for players and spectators, sanitized input, basic rate limiting, and mute/report controls before wider release. | Two active players can exchange messages during a live room; spectators can participate only when room chat is enabled. |
| Multiplayer leaderboard | Players have a reason to return and improve through visible ranking progression. | Global and friends-only leaderboard views using existing ELO/game stats, with filters for board size and recent activity. | Completed multiplayer games update rankings and the leaderboard displays current rank, rating, wins, losses, and games played. |
| Touch-to-speak | Mobile users can communicate quickly without typing during a match. | Optional push-and-hold voice input for short room messages or live voice snippets, gated by microphone permission and a visible privacy state. | A player can hold a touch control, record/send a short voice message, and other room participants can play it back with clear sender attribution. |

**Product guardrails:**
- Keep these features behind feature flags until core multiplayer stability is proven.
- Default private/safety-sensitive communication features to off or explicit opt-in.
- Avoid blocking gameplay if chat, leaderboard, or voice services fail.

## 🏗️ Technical Architecture Foundation

Before diving into the sprints, here's the scalable architecture that will support all future features:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│  React App                                                  │
│  ├── Game Engine (Core Logic) ✅                           │
│  ├── UI Components (Mantine) ✅                            │
│  ├── State Management (Local) ✅                           │
│  └── PartyKit Client ✅                                    │
├─────────────────────────────────────────────────────────────┤
│                    Multiplayer Server                        │
├─────────────────────────────────────────────────────────────┤
│  PartyKit (Edge-deployed) ✅                               │
│  ├── Game Server (WebSocket) ✅                            │
│  ├── Room Management ✅                                    │
│  ├── Game State Validator ✅                               │
│  └── In-memory State ✅                                    │
├─────────────────────────────────────────────────────────────┤
│                      Backend API                             │
├─────────────────────────────────────────────────────────────┤
│  Node.js + Express ✅                                      │
│  ├── REST API ✅                                          │
│  ├── Auth Service (JWT) ✅                                 │
│  ├── User Management ✅                                    │
│  ├── Game Management ✅                                    │
│  └── ELO Rating System ✅                                  │
├─────────────────────────────────────────────────────────────┤
│  MongoDB ✅            │  Future: Redis                     │
│  ├── Users ✅          │  ├── Leaderboard Cache ⏳         │
│  ├── Game History ✅   │  ├── Session Cache ⏳            │
│  └── Rankings ✅       │  └── Matchmaking Queue ⏳         │
└─────────────────────────────────────────────────────────────┘

Legend: ✅ Implemented | ⚠️ Partial | 🚧 In Progress | ⏳ Planned
```

## 📋 Development Phases Overview

**Phase 1: Foundation (MVP)** - Weeks 1-6  
**Phase 2: Multiplayer Core** - Weeks 7-10  
**Phase 3: Polish & Mobile** - Weeks 11-14  
**Phase 4: Advanced Features** - Weeks 15-18  
**Phase 5: Monetization & Scale** - Weeks 19-22

---

## Phase 1: Foundation MVP (Weeks 1-6) ✅ COMPLETED

### Sprint 1: Core Game Engine (Week 1-2) ✅ COMPLETED

**Status: FULLY IMPLEMENTED**

**Completed Deliverables:**
- ✅ GameEngine class with complete Go rules
- ✅ Board state management (9x9, 13x13, 19x19)
- ✅ Move validation with all edge cases
- ✅ Capture detection algorithm
- ✅ Ko rule enforcement
- ✅ Suicide prevention
- ✅ Pass/Resign handling
- ✅ Theme system with 3 themes (Classic, Modern, Zen)

**Implementation Location:**
- `libs/game/src/lib/game-engine.ts`
- `libs/shared/types/src/lib/types.ts`
- `libs/shared/constants/src/lib/constants.ts`

### Sprint 2: UI & Local Play (Week 3-4) ✅ COMPLETED

**Status: FULLY IMPLEMENTED**

**Completed Components:**
- ✅ `<GameBoard />` - SVG-based responsive rendering
- ✅ `<GameInfo />` - Shows captures, turn, game status
- ✅ `<ThemeSelector />` - 3 working themes
- ✅ `<MoveHistory />` - Full move tracking
- ✅ `<GameControls />` - Pass, resign, new game
- ✅ Local hot-seat multiplayer
- ✅ Mobile-responsive design

**Implementation Location:**
- `libs/game/src/lib/components/`
- `apps/go-game/src/app/app.tsx`

### Sprint 3: Game Completion & Scoring (Week 5-6) ✅ COMPLETED

**Status: FULLY IMPLEMENTED**

**Completed Features:**
- ✅ Territory marking interface
- ✅ Scoring algorithm (Japanese rules)
- ✅ Game end detection
- ✅ Manual dead stone marking
- ✅ Auto-score calculation
- ✅ Winner declaration
- ✅ Scoring phase UI with controls

**Implementation Location:**
- `libs/game/src/lib/scoring.ts`
- `libs/game/src/lib/components/ScoringControls.tsx`

---

## Phase 2: Multiplayer Core (Weeks 7-10) ✅ COMPLETED (Modified)

### Sprint 4: Backend Foundation (Week 7-8) ⚠️ PARTIALLY COMPLETED

**Status: MODIFIED IMPLEMENTATION**
- Chose PartyKit over Socket.io for better edge deployment
- Backend API partially implemented for future persistence

**Completed:**
- ✅ JWT authentication system
- ✅ User registration/login endpoints
- ✅ MongoDB schemas (User, Game)
- ✅ Express server setup
- ✅ Error handling middleware
- ✅ Environment configuration

**API Endpoints Implemented:**
```
POST   /api/auth/register    ✅
POST   /api/auth/login       ✅
GET    /api/user/profile     ✅
POST   /api/game/create      🚧 (Schema ready, not integrated)
GET    /api/game/:id         🚧 (Schema ready, not integrated)
POST   /api/game/:id/move    ❌ (Using PartyKit instead)
```

**Implementation Location:**
- `apps/go-game-api/`
- MongoDB integration ready but optional for multiplayer

### Sprint 5: Real-time Multiplayer (Week 9-10) ✅ COMPLETED (PartyKit)

**Status: FULLY IMPLEMENTED WITH PARTYKIT**

**Implemented Architecture Change:**
- ✅ PartyKit instead of Socket.io (better performance, edge deployment)
- ✅ WebSocket protocol with typed messages
- ✅ Server-authoritative game state

**PartyKit Events Implemented:**
```typescript
// Client -> Server
- JOIN_ROOM         ✅
- MAKE_MOVE        ✅
- PASS             ✅
- RESIGN           ✅
- MARK_DEAD        ✅
- FINALIZE_SCORE   ✅

// Server -> Client
- ROOM_STATE       ✅
- GAME_UPDATE      ✅
- PLAYER_JOINED    ✅
- PLAYER_LEFT      ✅
- ERROR            ✅
```

**Features Delivered:**
- ✅ Create/join game rooms
- ✅ Real-time move synchronization
- ✅ Server-side move validation
- ✅ Player role assignment (Black/White/Spectator)
- ✅ Connection status handling
- ✅ URL-based room joining
- ✅ Room ID sharing

**Implementation Location:**
- `apps/go-game-partykit/src/main.ts`
- `libs/game/src/lib/services/partykit-client.ts`
- `libs/shared/partykit-protocol/`

---

## Phase 3: Backend Integration & State Management ✅ COMPLETED

### Sprint 6: Backend Integration (Week 11-12) ✅ COMPLETED

**Status: FULLY IMPLEMENTED**

**Completed Features:**
- ✅ Backend API with Express + MongoDB
- ✅ JWT authentication system
- ✅ User registration/login endpoints
- ✅ Game CRUD operations
- ✅ ELO rating calculation (K-factor: 32)
- ✅ PartyKit webhook integration
- ✅ Zustand for auth/UI state
- ✅ TanStack Query for server state
- ✅ API client service

**Technical Requirements:**
```javascript
// Needs implementation
class RankingSystem {
  calculateELO(winner, loser);
  determineRank(elo); // 30k to 9d
  getMatchmakingRange(playerElo);
}
```

**Prerequisites:**
- Need to complete MongoDB game persistence
- Integrate PartyKit games with backend API
- User session management across multiplayer

### Sprint 8: UI Components & Leaderboard (Week 15) ⏳ NEXT

**Status: NOT STARTED**

**Planned Features:**
- ⏳ PWA manifest and service workers
- ⏳ Offline game storage
- ⏳ Haptic feedback for moves
- ⏳ Push notifications
- ⏳ App store preparation

**Mobile-Specific Features:**
- ⏳ Touch-optimized stone placement
- ⏳ Pinch-to-zoom board
- ⏳ Portrait/landscape support
- ⏳ Native share functionality

**Current Mobile Support:**
- ✅ Responsive design works on mobile browsers
- ✅ Touch events for stone placement
- ⚠️ Not optimized for mobile performance

---

## Phase 4: Advanced Features (Weeks 15-18) ⏳ FUTURE

## Phase 4: AI Opponent & UI Polish 🚧 CURRENT SPRINT

### Sprint 7: AI Opponent Implementation (Week 13-14) 🚧 IN PROGRESS

**Status: PLANNING**

**AI Implementation Strategy:**
```javascript
// Step 1: Basic AI (Week 13)
class BasicGoAI {
  - 🚧 Random legal moves (beginner - 30k)
  - 🚧 Capture-focused play (25k-20k)
  - 🚧 Basic liberty counting (20k-15k)
  - 🚧 Simple territory estimation
}

// Step 2: Intermediate AI (Week 14)
class IntermediateGoAI {
  - ⏳ Pattern matching (common joseki)
  - ⏳ Influence maps
  - ⏳ Life/death detection
  - ⏳ Opening book (15k-10k)
}

// Step 3: Advanced AI (Future)
class AdvancedGoAI {
  - ⏳ Monte Carlo Tree Search (MCTS)
  - ⏳ Neural network evaluation
  - ⏳ KataGo WASM integration (5k-1d)
  - ⏳ Teaching mode with explanations
}
```

**Technical Approach:**
- Web Worker for AI computation (non-blocking)
- Difficulty levels: Beginner (30k), Easy (20k), Medium (10k), Hard (5k)
- Move time limit: 1-3 seconds per move
- Integration with existing game engine

**Technical Considerations:**
- Could use web workers for AI computation
- Consider server-side AI for better performance
- Start with simple heuristics before KataGo

### Sprint 9: Enhanced Game Analysis (Week 17-18) ⏳ PENDING

**Status: NOT STARTED**

**Planned Analysis Features:**
- ⏳ Move strength indicators
- ⏳ Variation exploration
- ⏳ Mistake detection
- ⏳ Teaching mode
- ⏳ SGF import/export
- ⏳ Game review tools
- ⏳ Position evaluation

**Prerequisites:**
- AI engine for move evaluation
- Move tree data structure
- SGF parser implementation

---

## Phase 5: Monetization & Scale (Weeks 19-22) ⏳ FUTURE

### Sprint 10: Monetization Features (Week 19-20) ⏳ PENDING

**Status: NOT STARTED**

**Planned Revenue Model:**
```javascript
// Freemium model
const features = {
  free: {
    boardSizes: [9, 13, 19],      ✅ (Already free)
    themes: ['classic'],          ✅ (All themes free currently)
    aiGames: 5/day,              ⏳
    analysis: 'basic',            ⏳
    multiplayer: 'unlimited'      ✅ (Currently free)
  },
  premium: {
    themes: ['premium themes'],   ⏳
    aiGames: 'unlimited',        ⏳
    analysis: 'advanced',         ⏳
    tournaments: true,            ⏳
    coaching: true,              ⏳
    badges: 'custom',            ⏳
    priority_matchmaking: true    ⏳
  }
};
```

### Sprint 11: Admin & Analytics (Week 21-22) ⏳ PENDING

**Status: NOT STARTED**

**Planned Admin Features:**
- ⏳ User management dashboard
- ⏳ Game monitoring and statistics
- ⏳ Revenue analytics
- ⏳ AI performance tuning
- ⏳ Content management system
- ⏳ Tournament management
- ⏳ Moderation tools

---

## 🔄 Continuous Considerations

### Internationalization Strategy
```javascript
// From the start
import i18n from 'i18next';

const resources = {
  en: { translation: {} },
  zh: { translation: {} },
  'zh-TW': { translation: {} }
};
```

### Testing Strategy
- Unit tests for game logic (Jest)
- E2E tests for critical paths (Cypress)
- Load testing for multiplayer (Artillery)
- Beta testing group from Week 6

### DevOps Pipeline
```yaml
# CI/CD from Week 1
- Automated testing
- Staging environment
- Feature flags for gradual rollout
- Monitoring (Sentry, Analytics)
```

### Success Metrics
**MVP (Week 6):**
- 100 beta testers
- 90% game completion rate
- <2s move response time

**Multiplayer (Week 10):**
- 500 concurrent games
- <100ms move latency
- 95% uptime

**Full Release (Week 22):**
- 10,000 active users
- 5% premium conversion
- 4.5+ app store rating

---

## 🚀 Quick Start Actions

**Week 1 Immediate Tasks:**
1. Set up Git repo with branch protection
2. Initialize React app with TypeScript
3. Create game engine class structure
4. Implement board state representation
5. Set up CI/CD pipeline

**Technical Decisions to Make Now:**
1. Canvas vs SVG for board rendering
2. Zustand vs Redux for state
3. MongoDB vs PostgreSQL
4. Hosting: AWS vs Google Cloud vs Vercel

---

## 📊 Sprint Tracking Template

### Sprint X: [Sprint Name] (Week X-X)

**Sprint Goal:**
- [ ] Primary objective

**User Stories:**
- [ ] As a player, I want to...
- [ ] As a developer, I need to...

**Technical Tasks:**
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Definition of Done:**
- Code reviewed
- Tests written and passing
- Documentation updated
- Deployed to staging

**Sprint Retrospective:**
- What went well:
- What could improve:
- Action items:

---

## 🎯 Risk Mitigation

### Technical Risks
1. **Real-time synchronization issues**
   - Mitigation: Implement optimistic updates with rollback
   - Fallback: Turn-based polling system

2. **Mobile performance on large boards**
   - Mitigation: Canvas rendering with viewport culling
   - Fallback: Simplified graphics mode

3. **AI integration complexity**
   - Mitigation: Start with simple heuristics
   - Fallback: Partner with existing GO AI services

### Business Risks
1. **User acquisition**
   - Mitigation: Beta test with GO communities
   - Strategy: Partner with GO schools/clubs

2. **Monetization resistance**
   - Mitigation: Generous free tier
   - Strategy: Focus on cosmetics first

3. **Competition from established apps**
   - Mitigation: Superior UX and modern design
   - Strategy: Target casual players first

---

## 📚 Technical Stack Details

### Current Technical Stack (Implemented)

#### Frontend ✅
```json
{
  "core": {
    "react": "^18.2.0",
    "typescript": "^5.3.3",
    "rspack": "^1.0.0-beta.4"
  },
  "ui": {
    "@mantine/core": "^7.7.1",
    "@mantine/hooks": "^7.7.1"
  },
  "styling": {
    "scss": "modules",
    "mantine": "components"
  },
  "multiplayer": {
    "partysocket": "^1.0.1"
  },
  "monorepo": {
    "nx": "^19.3.0"
  }
}
```

#### Multiplayer Server (PartyKit) ✅
```json
{
  "runtime": "partykit",
  "deployment": "cloudflare-edge",
  "protocol": "websocket",
  "state": "in-memory"
}
```

#### Backend API ⚠️
```json
{
  "server": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "database": {
    "mongoose": "^8.2.0"
  },
  "auth": {
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  }
}
```

### Planned Additions ⏳
```json
{
  "ai": {
    "katago": "wasm-version",
    "tensorflow.js": "for-basic-ai"
  },
  "mobile": {
    "@capacitor/core": "pwa-support"
  },
  "analytics": {
    "posthog": "user-analytics",
    "sentry": "error-tracking"
  },
  "cache": {
    "redis": "leaderboard-cache"
  }
}
```

---

## 📝 Documentation Requirements

### Code Documentation
- JSDoc for all public methods
- README for each major module
- Architecture decision records (ADRs)

### User Documentation
- In-game tutorial
- Video tutorials for complex features
- FAQ section
- Community wiki

### API Documentation
- OpenAPI/Swagger specification
- Postman collection
- WebSocket event catalog

---

## 🤝 Team Structure Recommendation

### Core Team (MVP)
- 1 Full-stack Developer (You)
- 1 UI/UX Designer (part-time)
- 1 QA Tester (from Week 4)

### Scaling Team (Post-MVP)
- +1 Backend Developer (Week 7)
- +1 Frontend Developer (Week 11)
- +1 DevOps Engineer (Week 15)
- +1 Product Manager (Week 19)

---

## 📅 Milestone Calendar

| Week | Phase | Key Deliverable |
|------|-------|-----------------|
| 1-2  | MVP   | Game engine core |
| 3-4  | MVP   | Playable UI |
| 5-6  | MVP   | Scoring & review |
| 7-8  | Multi | Backend API |
| 9-10 | Multi | Real-time play |
| 11-12| Polish| Rankings & profiles |
| 13-14| Mobile| PWA & native apps |
| 15-16| AI    | Computer opponent |
| 17-18| Analysis| Game analysis tools |
| 19-20| Revenue| Premium features |
| 21-22| Scale | Admin & analytics |

---

## 🎉 Launch Strategy

### Soft Launch (Week 6)
- 100 beta testers from GO communities
- Focus on core gameplay feedback
- Iterate based on user input

### Multiplayer Beta (Week 10)
- 500 users stress test
- Tournament to drive engagement
- Influencer partnerships

### Public Launch (Week 22)
- Product Hunt launch
- Reddit GO community engagement
- Press release to gaming media
- App store optimization

---

## 📈 Post-Launch Roadmap

### Month 6-9
- Tournament system
- Puzzle mode
- Teaching videos integration
- Social features (friends, clubs)

### Month 9-12
- Advanced AI coaching
- Live streaming support
- Cross-platform play
- Seasonal events

### Year 2
- VR/AR board visualization
- Professional tournament hosting
- GO learning curriculum
- API for third-party developers
