FROM node:alpine as node

ARG targetEnv

WORKDIR /var/node/docker/

# Install the ca-certificate package
# Copy the CA certificate from the context to the build container
# ADD /docker/certs/root_ca.crt /usr/local/share/ca-certificates/
# # Update the CA certificates in the container

# RUN cat /usr/local/share/ca-certificates/root_ca.crt >> /etc/ssl/certs/ca-certificates.crt && \
#     apk --no-cache add \
#         curl

# RUN apk update && \
#     apk add ca-certificates && \
#     update-ca-certificates -v && \
#     rm -rf /var/cache/apk/*
COPY package.json package-lock.json ./
RUN npm cache clean --force
RUN npm install
COPY . .
ADD /startup.sh /startup.sh
RUN chmod +x /startup.sh
ENTRYPOINT ["sh","/startup.sh"]
