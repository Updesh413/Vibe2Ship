# Stage 1: Build the Vite frontend React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors first to cache npm dependencies
COPY package*.json ./
RUN npm ci

# Copy the entire project
COPY . .

# Build-time environment variables for Vite to inject
ARG VITE_FIREBASE_API_KEY="AIzaSyDQyx2HdTIdJLCZVmYwEL_m5jnS3l2VoyA"
ARG VITE_FIREBASE_AUTH_DOMAIN="vibe2ship-8914a.firebaseapp.com"
ARG VITE_FIREBASE_PROJECT_ID="vibe2ship-8914a"
ARG VITE_FIREBASE_STORAGE_BUCKET="vibe2ship-8914a.firebasestorage.app"
ARG VITE_FIREBASE_MESSAGING_SENDER_ID="1038395846432"
ARG VITE_FIREBASE_APP_ID="1:1038395846432:web:b41cc891379fd23db33145"

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Run Vite build to compile assets into the /app/dist directory
RUN npm run build

# Stage 2: Set up the lightweight production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy package description files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the compiled static assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy the Express proxy server file
COPY server.js ./

# Set the port environment variable (Cloud Run injects PORT)
ENV PORT=8080
EXPOSE 8080

# Run the Express server in production mode
CMD ["npm", "start"]
