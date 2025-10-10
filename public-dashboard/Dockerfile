FROM node:18-alpine

RUN apk add --no-cache nginx

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY health-api.js ./
COPY index.html /usr/share/nginx/html/index.html
COPY 50x.html /usr/share/nginx/html/50x.html
COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp

RUN echo '#!/bin/sh' > /start.sh \
    && echo 'set -e' >> /start.sh \
    && echo 'echo "Starting Public Media Dashboard..."' >> /start.sh \
    && echo 'nginx -t' >> /start.sh \
    && echo 'nginx -g "daemon on;"' >> /start.sh \
    && echo 'cd /app' >> /start.sh \
    && echo 'exec node health-api.js' >> /start.sh \
    && chmod +x /start.sh

EXPOSE 80 3002

CMD ["/start.sh"]
