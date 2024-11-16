#!/bin/sh

trap 'exit 0' TERM

while :; do
  cert_path="/etc/letsencrypt/live/crypto-knight.online/fullchain.pem"

  if [ ! -f $cert_path ]; then
      echo "Certificate not found. Requesting new certificate."
      certbot certonly --webroot --webroot-path=/var/www/certbot --email ant.goncharik.development@gmail.com --agree-tos --no-eff-email -d crypto-knight.online
      if [ $? -eq 0 ]; then
          echo "Certificate issued successfully. Reloading nginx."
          nginx -s reload
      else
          echo "Failed to issue certificate."
      fi
  else
      echo "Certificate found. Checking expiry date."
      expiry_date=$(openssl x509 -enddate -noout -in $cert_path | cut -d= -f2)
      expiry_seconds=$(date -d "$expiry_date" +%s)
      current_seconds=$(date +%s)
      diff_seconds=$((expiry_seconds - current_seconds))

      # If certificate expires in less than 30 days (2592000 seconds), renew it
      if [ $diff_seconds -le 2592000 ]; then
          echo "Certificate is expiring in less than 30 days. Renewing."
          certbot renew --deploy-hook "nginx -s reload"
          if [ $? -eq 0 ]; then
              echo "Certificate renewed successfully and nginx reloaded."
          else
              echo "Failed to renew certificate."
          fi
      else
          echo "Certificate is valid for more than 30 days. No renewal needed."
      fi
  fi

  sleep 24h & wait $!
done
