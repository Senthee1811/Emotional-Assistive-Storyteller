FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
COPY --from=build /app/node_modules/react-scripts/template/public/index.html /usr/share/nginx/html/index.html || true
CMD ["nginx", "-g", "daemon off;"]
