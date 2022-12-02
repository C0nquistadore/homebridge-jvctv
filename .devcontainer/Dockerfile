FROM mcr.microsoft.com/devcontainers/typescript-node

RUN curl -sSfL https://repo.homebridge.io/KEY.gpg | sudo gpg --dearmor | sudo tee /usr/share/keyrings/homebridge.gpg  > /dev/null \
 && echo "deb [signed-by=/usr/share/keyrings/homebridge.gpg] https://repo.homebridge.io stable main" | sudo tee /etc/apt/sources.list.d/homebridge.list > /dev/null \
 && apt-get update \
 && apt-get -y install --no-install-recommends homebridge

EXPOSE 8581