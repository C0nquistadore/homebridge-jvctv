FROM mcr.microsoft.com/devcontainers/typescript-node:bullseye

RUN npm install -g homebridge

USER node
RUN mkdir ~/.homebridge \
 && jq -n '{"bridge":{"port":8581}}' > ~/.homebridge/config.json