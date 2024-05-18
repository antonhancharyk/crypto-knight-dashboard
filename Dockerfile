FROM node:21-alpine AS builder

WORKDIR /opt/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

RUN apk update && apk add certbot cron

COPY --from=builder /opt/app/dist/crypto-knight-dashboard/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

COPY crontab.txt /etc/cron.d/certbot-cron

RUN chmod 0644 /etc/cron.d/certbot-cron

RUN mkdir -p /var/www/certbot

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80

EXPOSE 443

CMD ["/entrypoint.sh"]
