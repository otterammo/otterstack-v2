FROM node:18-alpine

# Install nginx for serving static files
RUN apk add --no-cache nginx

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy application files
COPY health-api.js ./
COPY *.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx directories
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "Starting Media Stack Dashboard..."' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start nginx in background' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'nginx -t && nginx -g "daemon on;"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start health API' >> /start.sh && \
    echo 'echo "Starting health check API..."' >> /start.sh && \
    echo 'cd /app' >> /start.sh && \
    echo 'exec node health-api.js' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80 3002

# Start both nginx and the health API
CMD ["/start.sh"]