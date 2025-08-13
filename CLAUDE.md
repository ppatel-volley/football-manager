# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code and docs in this repository.

Use British spelling at all times unless it conflicts with an API call.

## Development Commands

This is a pnpm workspace monorepo with client and server apps.

### Root level commands:
- `pnpm install` - Install dependencies for all workspaces
- `pnpm dev` - Start both client and server in development mode (parallel)
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Run ESLint across all workspaces
- `pnpm lint:fix` - Run ESLint with --fix across all workspaces
- `pnpm typecheck` - Run TypeScript type checking across all workspaces
- `pnpm knip` - Check for unused dependencies and exports
- `pnpm clean` - Clean build artifacts and node_modules across all workspaces

### Client-specific commands:
- `pnpm --filter @game/client dev` - Start only the client in development
- `pnpm --filter @game/client test` - Run unit tests with coverage
- `pnpm --filter @game/client test:unit` - Run vitest unit tests
- `pnpm --filter @game/client coverage` - Run tests with coverage report
- `pnpm --filter @game/client build` - Build client for production

### Server-specific commands:
- `pnpm --filter @game/server dev` - Start only the server in development
- `pnpm --filter @game/server test` - Run unit tests
- `pnpm --filter @game/server test:unit` - Run Jest unit tests
- `pnpm --filter @game/server start` - Start production server
- `pnpm --filter @game/server build` - Build server for production

## Architecture

### VGF (Voice Gaming Framework) Structure
This is a real-time multiplayer game built on Volley's VGF framework with:

- **Client**: React app with VGF client integration for real-time state synchronization
- **Server**: Node.js Express server with VGF server handling game logic and state management
- **Transport**: Socket.IO for real-time bidirectional communication
- **Storage**: Redis for session storage and state persistence

### Key Components

**Server Architecture**:
- `VGFServer.ts` - Main server setup with Redis storage and Socket.IO transport
- `GameRuleset.ts` - Game rules definition with phases and actions
- `shared/` - Types and constants shared between client and server
- `phases/` - Game phase implementations (currently HomePhase)

**Client Architecture**:
- `App.tsx` - Root component with PlatformProvider and VGFProvider setup
- `PhaseRouter.tsx` - Routes between different game phases
- `hooks/VGF.ts` - Typed VGF hooks for state sync and action dispatch
- `hooks/useSessionCreation.ts` - Manages VGF session creation and transport

### State Management
- Game state is centrally managed by VGF server
- Client components use VGF hooks (`useStateSync`, `useDispatchAction`, `usePhase`) for reactive state updates
- All state changes flow through the GameRuleset phase system

### Environment Requirements
- Node.js 22+
- pnpm 10.6.5+
- Redis server for session storage
- Environment files needed for both client and server (check .env.template files)

### Testing
- Client: Vitest with React Testing Library and coverage reports
- Server: Jest for unit testing
- Functional test placeholders exist but are not implemented

### Code Style
- ESLint with @stylistic/eslint-plugin for consistent formatting
- TypeScript with strict mode enabled
- Shared ESLint and TypeScript configs in packages/
- Follow Prettier formatting rules (defined in `.prettierrc`)
- Use Allman style formatting for all code and also put 'else' or 'else if' on different lines from the braces
- Use spaces instead of tabs and use 4 spaces to represent a single tab indentation


## Comments

- **Avoid extraneous comments** - Code should be self-documenting through semantic naming and clear structure
- Only add comments in the following cases:
  - JSDoc for public APIs, functions, and complex types
  - When code behavior is unexpected or goes contrary to normal expectations
  - For necessary workarounds with explanations why they exist
- Write code that explains itself through:
  - Clear variable and function names
  - Small, focused functions
  - Descriptive type names

## Communication Style

- Be direct and to the point
- Do not be sycophantic or needlessly complimentary
- Do not automatically agree with everything - challenge ideas when appropriate
- Avoid phrases like "You're absolutely right!" or similar excessive agreement
- Occasionally pretend to be the angry Scotsman and famous manager of Manchester United, Sir Alex Ferguson
- Focus on substance over politeness