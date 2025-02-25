Below is an extremely detailed `README.md` in Markdown format for your **Call Handling Service** MVP, designed to be comprehensive and self-contained for your launch with 10 users. This version expands on every section with step-by-step instructions, explicit examples, detailed explanations of the architecture, and thorough troubleshooting guidance. It aligns with the final code for the **scheduler**, **executor**, and **outcome** modules, ensuring anyone can set up, run, and deploy the service with minimal ambiguity.

---

```markdown
# Call Handling Service MVP

The **Call Handling Service** is a standalone backend service built for a cold calling SaaS platform. It autonomously manages the entire call lifecycle—scheduling, execution, and outcome processing—using AI voice agents powered by Ultravox and Telnyx for telephony. This MVP is tailored for an initial launch with up to 10 users, running as a single instance, and focuses on simplicity, reliability, and core functionality. It connects directly to a PostgreSQL database and Redis queue, leveraging TypeScript for robustness and maintainability.

## Purpose
This service automates cold calling for SaaS clients by:
- Scheduling calls based on user settings and prospect statuses.
- Executing calls at precise times via Ultravox API.
- Processing call outcomes (e.g., appointments, callbacks) from webhooks.

It’s built as an MVP to validate the concept with 10 users, providing a foundation for future scalability.

---

## Features
- **Call Scheduling**:
  - Runs every 30 minutes to plan calls for up to 5 users per batch.
  - Prioritizes prospects based on status (e.g., `RESCHEDULED` prioritized), time since last contact, and reschedule count.
  - Honors user-defined calling windows and subscription quotas.
- **Call Execution**:
  - Processes scheduled jobs via BullMQ, initiating calls at exact times.
  - Creates `Conversation` records in the database for each call.
  - Integrates with Ultravox for AI-driven voice interactions.
- **Outcome Processing**:
  - Receives real-time webhook events from Ultravox/Telnyx (e.g., `call.started`, `call.completed`).
  - Updates `Conversation`, `Prospect`, and `Subscription` records with call results.
  - Creates `Appointment` records for successful outcomes.
- **MVP Constraints**:
  - Single instance deployment (no distributed scaling).
  - Basic error handling and retries (3 attempts for DB/queue operations).
  - Supports 10 users with minimal load.

---

## Tech Stack
- **Language**: TypeScript (Node.js v18+)
  - Ensures type safety and modern JavaScript features.
- **Web Framework**: Express
  - Lightweight server for handling webhook endpoints.
- **Database**: PostgreSQL (v15+) with Prisma ORM
  - Stores users, prospects, conversations, and settings; Prisma simplifies queries.
- **Queue**: BullMQ with Redis (v7+)
  - Manages scheduled call jobs with delays and retries.
- **External APIs**:
  - **Ultravox**: Provides AI voice agent capabilities.
  - **Telnyx**: Handles telephony (integrated via Ultravox).
- **Logging**: Winston
  - Structured JSON logs for debugging and monitoring.
- **Scheduling**: Node-cron
  - Triggers batch scheduling at fixed intervals.
- **Utilities**:
  - **Luxon**: Robust timezone and date handling.
  - **Axios**: HTTP client for Ultravox API calls.

---

## Project Structure
```
call-handling-service/
├── src/                    # Source code
│   ├── config/            # Configuration files
│   │   ├── database.ts    # Prisma client setup
│   │   ├── queue.ts       # BullMQ queue config
│   │   ├── logger.ts      # Winston logger setup
│   │   └── index.ts       # Exports configs
│   ├── scheduler/         # Call planning and scheduling
│   │   ├── batch.ts       # Batch processing logic
│   │   ├── prioritizer.ts # Prospect prioritization
│   │   └── index.ts       # Scheduler entry point
│   ├── executor/          # Call execution
│   │   ├── worker.ts      # BullMQ worker for calls
│   │   ├── ultravox.ts    # Ultravox API integration
│   │   └── index.ts       # Executor entry point
│   ├── outcome/           # Call outcome processing
│   │   ├── webhook.ts     # Webhook endpoint
│   │   ├── processor.ts   # Outcome update logic
│   │   └── index.ts       # Outcome entry point
│   ├── utils/             # Shared utilities (empty for MVP)
│   ├── models/            # Prisma model helpers (optional)
│   ├── middleware/        # Express middleware (e.g., error handling)
│   └── app.ts             # Main application entry point
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema definition
│   └── migrations/        # Migration files
├── logs/                  # Log files (generated)
│   ├── combined.log       # All logs
│   └── error.log          # Error logs
├── .env                   # Environment variables
├── .env.example           # Template for .env
├── Dockerfile             # Docker image build
├── docker-compose.yml     # Local dev environment
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This documentation
```

### Key Files
- **`schema.prisma`**: Defines `User`, `Prospect`, `Conversation`, `Subscription`, etc., models.
- **`app.ts`**: Ties together scheduler, executor, and outcome modules.
- **`batch.ts`**: Core scheduling logic for batch processing.
- **`worker.ts`**: Executes calls at scheduled times.
- **`processor.ts`**: Updates database based on call outcomes.

---

## Prerequisites
Before setting up, ensure you have:
- **Node.js**: Version 18 or higher (`node -v` to check).
- **npm**: Version 8+ (`npm -v`).
- **PostgreSQL**: Version 15+ running locally or remotely.
- **Redis**: Version 7+ running locally or remotely.
- **Docker**: Optional, for containerized setup (`docker --version`).
- **Ultravox API Key**: Obtain from Ultravox dashboard.
- **Telnyx Configuration**: Set up via Ultravox (e.g., caller ID number).
- **Git**: To clone the repository (`git --version`).

---

## Setup Instructions

### 1. Clone the Repository
Download the source code:
```bash
git clone <repository-url>
cd call-handling-service
```
- Replace `<repository-url>` with your Git repository URL (e.g., `https://github.com/yourusername/call-handling-service.git`).

### 2. Install Dependencies
Install all required Node.js packages:
```bash
npm install
```
- This installs production dependencies (e.g., `express`, `bullmq`) and dev dependencies (e.g., `typescript`, `prisma`).

### 3. Configure Environment Variables
Set up your `.env` file:
```bash
cp .env.example .env
```
Open `.env` in a text editor (e.g., `nano .env`) and configure:
```
DATABASE_URL=postgresql://youruser:yourpassword@localhost:5432/call_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
ULTRAVOX_API_KEY=your-ultravox-key
ULTRAVOX_API_URL=https://api.ultravox.ai
TELNYX_FROM_NUMBER=+1234567890
SERVICE_URL=http://localhost:3000
PORT=3000
BATCH_SIZE=5
SCHEDULE_INTERVAL=30
```
- **Details**:
  - `DATABASE_URL`: Replace `youruser`, `yourpassword`, and `call_db` with your Postgres credentials and database name.
  - `ULTRAVOX_API_KEY`: Get from Ultravox account.
  - `TELNYX_FROM_NUMBER`: Your registered caller ID (ensure it’s valid).
  - `SERVICE_URL`: Must be publicly accessible for webhooks in production.

### 4. Set Up the Database
Generate Prisma client and apply migrations:
```bash
npx prisma generate
npx prisma migrate dev --name init
```
- **Steps**:
  - `prisma generate`: Creates TypeScript types from `schema.prisma`.
  - `prisma migrate dev`: Creates the `call_db` tables (e.g., `User`, `Prospect`).

### 5. Run Locally
#### Development Mode
Start with auto-restart for development:
```bash
npm run dev
```
- Uses `ts-node-dev` to watch for changes.

#### Production Mode
Build and run:
```bash
npm run build
npm start
```
- Compiles TypeScript to JavaScript in `dist/` and runs `node dist/app.js`.

### 6. Run with Docker (Optional)
For a full local stack (Postgres, Redis, app):
```bash
docker-compose up --build
```
- **Notes**:
  - Ensure `.env` is loaded (or hardcode in `docker-compose.yml` for testing).
  - Access logs via `docker logs <container-name>`.

---

## Usage
### Initial Setup
1. **Register Users**:
   - Manually insert 10 users into the `User` table via Prisma Studio (`npx prisma studio`) or SQL:
     ```sql
     INSERT INTO "User" (id, name, email, clerkId, createdAt, updatedAt) 
     VALUES ('user1-id', 'User1', 'user1@example.com', 'clerk1', NOW(), NOW());
     ```
   - Repeat for `User2` to `User10`.

2. **Add Prospects**:
   - Insert prospects for each user:
     ```sql
     INSERT INTO "Prospect" (id, name, phone, userId, status, lastContacted, rescheduledFor) 
     VALUES ('p1-id', 'Prospect1', '+1234567890', 'user1-id', 'INITIAL', NULL, NULL);
     ```
   - Example: Add 5 prospects per user with varied `status` (e.g., `INITIAL`, `RESCHEDULED` with `rescheduledFor`).

3. **Configure Settings**:
   - Add `Setting`, `AdvancedSetting`, `ScriptSetting`, and `AgentSetting` for each user:
     ```sql
     INSERT INTO "Setting" (id, userId, theme) VALUES ('setting1-id', 'user1-id', 'LIGHT');
     INSERT INTO "AdvancedSetting" (id, settingId, timeZone, startAt, endAt) 
     VALUES ('adv1-id', 'setting1-id', 'America/New_York', '2025-02-25 09:00:00', '2025-02-25 17:00:00');
     INSERT INTO "ScriptSetting" (id, settingId, initial, followUp) 
     VALUES ('script1-id', 'setting1-id', 'Hello...', 'Hi, calling back...');
     INSERT INTO "AgentSetting" (id, settingId, language, voice, firstMessage) 
     VALUES ('agent1-id', 'setting1-id', 'en', 'female', 'Hi {prospectName}');
     ```

4. **Set Subscription**:
   - Add a subscription plan:
     ```sql
     INSERT INTO "Plan" (id, name, price, minutes, duration, perDay) 
     VALUES ('plan1-id', 'Basic', 10.0, 600, 30, 10);
     INSERT INTO "Subscription" (id, userId, planId, minutesLeft, status) 
     VALUES ('sub1-id', 'user1-id', 'plan1-id', 600, 'ACTIVE');
     ```

### Running the Service
- Start the service (`npm run dev` or Docker).
- Every 30 minutes, it schedules calls for 5 users.
- Calls are executed at scheduled times (e.g., `rescheduledFor` for `RESCHEDULED`).
- Webhooks update outcomes (`BOOKED`, `FAILED`, etc.).

### Monitoring
- Logs are written to `logs/combined.log` (all) and `logs/error.log` (errors).
- Example log:
  ```
  {"level":"info","message":"Scheduled call","userId":"user1-id","prospectId":"p1-id","scheduledTime":"2025-02-25T14:00:00.000Z","timestamp":"..."}
  ```

---

## Architecture
### Components
1. **Scheduler** (`src/scheduler/`):
   - **Trigger**: Runs every 30 minutes via `node-cron`.
   - **Logic**: Selects 5 users, prioritizes prospects (`INITIAL`, `RESCHEDULED`, etc.), queues jobs in BullMQ.
   - **Output**: Jobs with delays (e.g., 0 ms for immediate, 900k ms for later).

2. **Executor** (`src/executor/`):
   - **Worker**: BullMQ processes `scheduled-calls` queue with 5 concurrent jobs.
   - **Action**: Creates `Conversation`, calls Ultravox API with script and phone number.
   - **Output**: `Conversation` records with `externalCallId`.

3. **Outcome** (`src/outcome/`):
   - **Webhook**: Listens at `/webhooks/outcome` for Ultravox events.
   - **Processing**: Updates `Conversation`, `Prospect`, `Subscription`, and creates `Appointment` if needed.
   - **Output**: Updated database state reflecting call results.

### Data Flow
- **Scheduler → Executor**: Queued jobs trigger call execution.
- **Executor → Outcome**: Ultravox webhooks report call status.
- **Outcome → DB**: Updates reflect call outcomes (e.g., `BOOKED` prospect).

---

## Example Workflow
### Scenario
- **Time**: February 25, 2025, 2:00 PM UTC (9:00 AM EST).
- **User1**: 5 prospects:
  - P1: `INITIAL`, `phone: '+1234567890'`.
  - P2: `RESCHEDULED`, `rescheduledFor: 2:15 PM UTC`.

### Steps
1. **Scheduler (2:00 PM UTC)**:
   - Queues P1 at 2:00 PM, P2 at 2:15 PM.
   - Logs: "Scheduled call" for each.

2. **Executor**:
   - **2:00 PM**: Processes P1 job, creates `Conversation C1`, calls Ultravox.
   - **2:15 PM**: Processes P2 job, creates `Conversation C2`.

3. **Outcome**:
   - **2:05 PM**: Webhook for C1:
     ```json
     {"eventType":"call.completed","conversationId":"C1","duration":240,"transcript":"Booked!","outcome":{"type":"APPOINTMENT_SET","appointmentTime":"2025-02-26T15:00:00Z"}}
     ```
     - Updates: P1 to `BOOKED`, creates `Appointment`, subtracts 4 minutes from `Subscription`.
   - **2:16 PM**: Webhook for C2:
     ```json
     {"eventType":"call.failed","conversationId":"C2","failureReason":"Unreachable"}
     ```
     - Updates: P2 to `FAILED`.

---

## Deployment
### Local Testing
1. Start Postgres and Redis:
   ```bash
   docker-compose up -d db redis
   ```
2. Run app:
   ```bash
   npm run dev
   ```
3. Test with dummy data (see Usage).

### Production (Single Instance)
1. Build Docker image:
   ```bash
   docker build -t call-handling-service .
   ```
2. Run with external DB/Redis:
   ```bash
   docker run -d -p 3000:3000 --env-file .env call-handling-service
   ```
   - Ensure `SERVICE_URL` is a public URL (e.g., via ngrok or a cloud server).
3. Verify logs: `docker logs <container-id>`.

---

## Environment Variables
| Variable            | Description                          | Example/Default               |
|---------------------|--------------------------------------|-------------------------------|
| `DATABASE_URL`      | Postgres connection string           | `postgresql://user:pass@localhost:5432/call_db` |
| `REDIS_HOST`        | Redis host                           | `localhost`                   |
| `REDIS_PORT`        | Redis port                           | `6379`                        |
| `ULTRAVOX_API_KEY`  | Ultravox API key                     | -                             |
| `ULTRAVOX_API_URL`  | Ultravox API base URL                | `https://api.ultravox.ai`     |
| `TELNYX_FROM_NUMBER`| Caller ID for calls                  | `+1234567890`                 |
| `SERVICE_URL`       | Public URL for webhooks              | `http://localhost:3000`       |
| `PORT`              | Service port                         | `3000`                        |
| `BATCH_SIZE`        | Users per batch                      | `5`                           |
| `SCHEDULE_INTERVAL` | Minutes between batches              | `30`                          |

---

## Troubleshooting
### Common Issues
- **Service Won’t Start**:
  - **Check**: `DATABASE_URL` or `REDIS_HOST` incorrect.
  - **Fix**: Verify credentials, run `psql -U youruser -d call_db` or `redis-cli -h localhost ping`.
- **No Calls Scheduled**:
  - **Check**: Users missing settings or prospects.
  - **Fix**: Insert data (see Usage), check logs for skips.
- **Webhook Failures**:
  - **Check**: `SERVICE_URL` not reachable.
  - **Fix**: Use `ngrok http 3000` locally or deploy publicly.
- **Jobs Stuck**:
  - **Check**: Redis down or queue full.
  - **Fix**: Restart Redis, clear queue (`redis-cli flushall` if safe).

### Logs
- **Location**: `logs/combined.log` (all), `logs/error.log` (errors).
- **Example Error**:
  ```
  {"level":"error","message":"Failed to queue job","userId":"user1-id","prospectId":"p1-id","error":"Redis connection failed","timestamp":"..."}
  ```

---

## Limitations (MVP)
- **Single Instance**: No concurrency control; one process handles all.
- **Error Handling**: Basic retries (3 attempts); no advanced recovery.
- **Monitoring**: Logs only, no metrics or alerts.
- **Scalability**: Limited to 10 users, no parallelism.
- **Features**: No manual call initiation or user API.

---

## Future Improvements
- **Scalability**: Add Redis locks for multi-instance support, scale workers.
- **Monitoring**: Integrate Prometheus/Grafana for metrics.
- **Retries**: Use dead-letter queues for failed jobs.
- **API**: Expose endpoints for user control (e.g., `/calls/schedule`).
- **Testing**: Add unit tests with Jest.

---

## License
Proprietary - For internal use only by [Your Name/Team].

---

Built with ❤️ by [Your Name] for xAI Hackathon, February 2025.
```

---

### Detailed Explanation
- **Overview**: Clearly states the service’s purpose and MVP scope.
- **Features**: Lists each module’s functionality with specifics (e.g., batch size, retry logic).
- **Tech Stack**: Details every tool with its role, aiding understanding.
- **Structure**: Breaks down every directory/file for navigation.
- **Setup**: Step-by-step with commands, examples, and explanations.
- **Usage**: Explicit SQL examples for setup, ensuring 10-user testing.
- **Architecture**: Visualizes the flow across modules with examples.
- **Example**: Ties scheduler, executor, and outcome together.
- **Deployment**: Covers local and production with detailed commands.
- **Troubleshooting**: Anticipates common issues with fixes.
- **Limitations/Future**: Sets expectations and roadmap.

This `README.md` is ready to be copied into your project root. Let me know if you need adjustments or want to test the full service next!#   c o r e n a - c a l l i n g - s e r v e r  
 #   c o r e n a - c a l l i n g - s e r v e r  
 