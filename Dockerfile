# Production Dockerfile - Packages the pre-built React application
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy local pre-built frontend assets and server file
COPY dist ./dist
COPY server.js ./

# Set standard port for Cloud Run
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
