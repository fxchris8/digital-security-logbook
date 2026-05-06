# =========================
# Build stage
# =========================
FROM golang:1.24.0-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev

# Dependencies
COPY go.mod go.sum ./
RUN go mod download

# Source
COPY . .

# Build API binary. The logbook schema is bootstrapped by the API on startup.
RUN CGO_ENABLED=0 GOOS=linux go build -o api ./cmd/api


# =========================
# Runtime stage
# =========================
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates curl netcat-openbsd tzdata

# Copy binaries from builder
COPY --from=builder /app/api .

# Copy entrypoint script
COPY entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh
# RUN chmod +x entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

# Use entrypoint script instead of direct command
ENTRYPOINT ["./entrypoint.sh"]
