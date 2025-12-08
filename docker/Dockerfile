FROM node:alpine as node

ARG targetEnv

WORKDIR /var/node/docker/

COPY package.json package-lock.json ./
RUN npm cache clean --force
RUN npm install
COPY . .
ADD /startup.sh /startup.sh
RUN chmod +x /startup.sh
ENTRYPOINT ["sh","/startup.sh"]
