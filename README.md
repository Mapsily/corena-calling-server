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
```bash
git clone <repository-url>
cd call-handling-service
```
Replace `<repository-url>` with your actual repo URL.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
nano .env
```

### 4. Set Up the Database
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run the Service
```bash
npm run dev
```

---

## Deployment
### Docker Deployment
```bash
docker build -t call-handling-service .
docker run -d -p 3000:3000 --env-file .env call-handling-service
```

---

## Troubleshooting
- **Database Connection Issues**:
  ```bash
  psql -U youruser -d call_db
  ```

- **Redis Not Running**:
  ```bash
  redis-cli ping
  ```

---

## Limitations
- **Single Instance Only**: No multi-instance scaling.
- **Limited to 10 Users**: MVP does not support high concurrency.

---

## Future Improvements
- **API for manual call initiation**
- **Multi-instance support**
- **Better monitoring and alerting**

---

## License
Proprietary - For internal use only by [Your Team Name].

---

Built with ❤️ by [Your Name] for xAI Hackathon, February 2025.
