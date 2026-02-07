# Changelog

Implementation history and milestone progress for Krawall.

---

## Phase 1: Foundation

- Next.js 16.1.6 with TypeScript & Tailwind CSS
- Prisma schema with PostgreSQL
- Redis & BullMQ configuration
- BaseConnector abstract class + HTTPConnector
- Docker Compose stack, Taskfile, API health check
- Mock chatbot server + unit tests

## Phase 2: Core Features

- Target CRUD API and UI
- Scenario management system + flow builder
- Session executor worker
- Fire-and-forget execution + file-based logging (JSONL)

## Phase 3: Additional Connectors

- WebSocket connector (bidirectional, auto-reconnect)
- gRPC connector (proto loading, TLS support)
- SSE connector (streaming support)
- Connector registry with auto-registration

## Phase 4: Metrics & Visualization

- MetricsCollector with Levenshtein distance algorithm
- Metrics aggregation worker (P50, P95, P99)
- Chart.js visualizations (Line, Bar, Doughnut) + CSV/JSON export

## Phase 5: Advanced Features

- SSE endpoint for live log streaming + LogViewer
- 8 pre-built scenario templates + cron-based scheduling
- ActiveJobs monitoring + session detail pages

## Phase 6: DevOps & Documentation

- GitLab CI/CD pipeline + production Docker Compose
- Nginx reverse proxy config
- Complete API documentation + AGENTS.md

## Phase 7: Build Fixes & Stability

- Next.js 16 async params migration
- Prisma type alignment, gRPC interface compliance
- 70+ tests passing with deterministic mocks

## Phase 8: Session Engine & Context

- Enhanced flow engine (all step types, Handlebars templating)
- Connector lifecycle with auto-reconnect (exponential backoff)
- Concurrency via semaphore-based limiting
- ConversationContext class with message history and windowing

## Phase 9: Target Testing & Dashboard

- Target connection test endpoint (dry run)
- Dashboard stats API + live dashboard with auto-refreshing widgets
- Quick Execute widget + scenario flow builder (drag-and-drop)

## Phase 10: Comparison & Quality

- A/B testing API + side-by-side comparison UI
- Response quality scoring (relevance, coherence, completeness)
- YAML import/export + rate limit simulation (token bucket)

## Phase 11: Webhooks & Notifications

- Webhook model with HMAC-SHA256 signing
- BullMQ delivery worker with exponential backoff
- Event emission (session.completed, session.failed)

## Phase 12: Batch Execution & Replay

- Multi-target batch execution API + progress tracking UI
- Session replay with playback controls, timeline, anomaly highlighting
- 48 API route integration tests

---

## Sprint 1: Design System & UI Components

- 19 reusable UI components (Button, Card, Badge, Input, Modal, Tabs, Dropdown, Breadcrumb, DataTable, etc.)
- Collapsible sidebar navigation
- Command palette (Cmd+K) with keyboard shortcuts
- Toast notification system

## Sprint 2: Chat Backend Templating & Plugin System

- Backend templating engine with plugin architecture
- Chat-based interaction patterns

## Sprint 3: Major Feature & Polish Sprint

- Comprehensive feature polish and UX improvements
- Performance optimizations across the platform

## Sprint 4: Guided Setup Wizard

- 8-step interactive wizard at `/guide`
- Provider presets for OpenAI, Anthropic, Gemini, Azure, Ollama + custom endpoints
- 12 scenario templates across 7 categories
- Inline connection testing with live results
- Live session monitoring during wizard execution

## Sprint 5: Worker Lifecycle & Diagnostics

- Auto-start workers via `instrumentation.ts` (Next.js hook)
- Queue status API (`GET /api/queue/status`)
- Session diagnostics and worker health monitoring

---

## Recent Milestones

### W3: Configurable Error Handling Per Scenario

- Per-scenario error handling policies
- Retry configuration, timeout handling, error injection

### W4: Session Actions (Restart / Delete / Cancel)

- Restart completed or failed sessions
- Cancel running sessions mid-execution
- Delete sessions with full cleanup
