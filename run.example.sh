cd src
node cli.js \
    -c ../input/project.postman_collection.json \
    -e ../input/project.postman_environment.json \
    -x http://127.0.0.1:8080 \
    -s no-auth \
    -r 350 \
    -k \
    -v