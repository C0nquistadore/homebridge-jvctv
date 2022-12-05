FROM mcr.microsoft.com/devcontainers/typescript-node:bullseye

# 'ping' is required for our plugin
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends iputils-ping

RUN npm install -g homebridge

USER node

# Ensure explicit homebridge port that matches the one exposed through docker
RUN mkdir ~/.homebridge \
 && jq -n '{"bridge":{"port":8581}}' > ~/.homebridge/config.json