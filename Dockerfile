FROM node:21-alpine as build-step

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build-step /app/dist/crypto-knight-dashboard /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]