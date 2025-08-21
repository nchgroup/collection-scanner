# collection-scanner

[WIP] Postman collection scanner for busyman

# Help

```
Usage: cli [options]

Postman Collection Scanner

Options:
  -V, --version               output the version number
  -c, --collection <type>     Path to the Postman collection
  -e, --environment <type>    Path to the Postman environment
  -A, --authorization <type>  Token to use for authentication
  -x, --proxy <type>          Proxy to use for requests
  -s, --scan <type>           Scan type, please choice: {run, extract-url, no-auth, cors}
  -k, --insecure              Allow insecure server connections
  -v, --verbose               Verbose output
  -h, --help                  display help for command
```

# Install

```bash
git clone https://gitlab.com/vay3t/collection-scanner.git
cd collection-scanner/src
npm install .
```
## Build docker

```bash
cd collection-scanner/
bash docker-build.sh
```

# Run

```bash
cd collection-scanner/src
node cli.js -c ../collections/project.postman_collection.json -e ../environments/project.postman_environment.json -x http://127.0.0.1:8080 -s no-auth
```

## Run with Docker

```bash
cd collection-scanner/
docker run -v $(pwd)/input:/app/src/input collection-scanner -c /app/src/input/project.postman_collection.json -s no-auth
```

## Run development with Docker

```bash
cd collection-scanner/
bash docker-build.sh && docker run -v $(pwd)/input:/app/src/input collection-scanner -c /app/src/input/project.postman_collection.json -s no-auth
```