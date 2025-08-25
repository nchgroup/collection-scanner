cd src
node cli.js \
    -c ../project.postman_collection.json \
    -e ../project.postman_environment.json \
    -x http://127.0.0.1:8080 \
    -s no-auth \
    -r 350 \
    -k \
    -v