#!/bin/sh

git config --global --add safe.directory $1
git config --global core.autocrlf true
git config --global core.fileMode false
cd $1
npm install
npm link
echo "$(jq '. += {"platforms":[{"platform":"JVCTV"}]}' ~/.homebridge/config.json)" > ~/.homebridge/config.json