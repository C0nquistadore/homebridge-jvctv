#!/bin/sh

git config --global --add safe.directory $1
cd $1
npm install
npm link
echo "$(jq '. += {"platforms":[{"platform":"JVCTV"}]}' ~/.homebridge/config.json)" > ~/.homebridge/config.json