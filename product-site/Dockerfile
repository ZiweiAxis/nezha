FROM node:18-alpine AS builder

# 使用国内 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
