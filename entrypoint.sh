#!/bin/sh
cron

if [ ! -f /etc/letsencrypt/live/crypto-knight.online/fullchain.pem ]; then
    certbot certonly --webroot -w /var/www/certbot -d crypto-knight.online -d www.crypto-knight.online --agree-tos --email ant.goncharik.development@gmail.com --no-eff-email
fi

nginx -g "daemon off;"
