#!/bin/bash

# login
token_var=$(curl -s --location 'https://example.tld/v1.0/authentication' \
    --header 'Content-Type: application/json' \
    --data-raw '{"username": "admin","password": "admin123"}' \
    | jq ".data.token" | sed 's/"//g')

echo "[+] $token_var"
cd src
node cli.js \
    -c ../input/project.postman_collection.json \
    -e ../input/project.postman_environment.json \
    -x http://127.0.0.1:8080 \
    -s no-auth
exit
