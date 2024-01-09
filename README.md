# collection-scanner

[WIP] Postman collection scanner for busyman

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