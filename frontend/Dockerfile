# ============================================
# Development Dockerfile for Next.js
# This uses bind mounts from docker-compose
# ============================================
FROM node:20-alpine

WORKDIR /app

# Install dependencies for development
RUN for i in 1 2 3 4 5; do apk add --no-cache libc6-compat && break || sleep 2; done

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for hot reload)
RUN npm ci

# Expose port
EXPOSE 3000

# Development server with hot reload
CMD ["npm", "run", "dev"]
