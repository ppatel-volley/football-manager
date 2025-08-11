# VGF Starter Kit 🚀

A modern full-stack starter kit for building real-time multiplayer applications using the Voice Gaming Framework (VGF).

## Quick Start 🏃‍♂️

### Prerequisites

- Node.js 22+
- pnpm 10.6.5+
- Redis (for session storage)

### Installation

```bash
git clone <your-repo>
cd vgf-starter-kit
pnpm install
```

### Environment Setup

### Client (.env)

Check out the [.env.template](apps/client/.env.template) file.

### Server (.env)

Check out the [.env.template](apps/server/.env.template) file.

### Development

```bash
# Start both client and server in development mode
pnpm dev

# Or start them individually
pnpm --filter @vgf-starter-kit/client dev
pnpm --filter @vgf-starter-kit/server dev
```

## Project Structure 📁

```
vgf-starter-kit/
├── apps/
│   ├── client/       # React frontend application
│   └── server/       # Node.js backend with VGF integration
├── packages/         # Shared utilities and configurations
│   ├── eslint-config/
│   └── tsconfig/
```