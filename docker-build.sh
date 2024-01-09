#!/bin/bash
docker rmi collection-scanner &>/dev/null
docker build -t collection-scanner .