FROM mcr.microsoft.com/devcontainers/typescript-node

RUN npm install -g homebridge

USER node
RUN mkdir ~/.homebridge \
 && jq -n '{"bridge":{"port":8581}}' > ~/.homebridge/config.json