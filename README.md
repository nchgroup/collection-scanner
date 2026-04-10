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
  -x, --proxy <type>          Proxy to use for requests (format: http://proxy:port or http://user:pass@proxy:port)
  -s, --scan <type>           Scan type, please choice: {run, extract-urls, no-auth, cors, ratelimit}
  -r, --response <type>       Show response body with character limit (0 = no limit)
  -t, --threads <type>        Number of concurrent threads (default: 1)
  --repeat <type>             Number of times to repeat each request (for ratelimit scan, default: 1)
  -k, --insecure              Allow insecure server connections
  -v, --verbose               Verbose output
  -j, --json                  Output results as structured JSON (suppresses colored output)
  -h, --help                  display help for command
```

# Install

```bash
git clone https://gitlab.com/nchgroup/collection-scanner.git
cd collection-scanner/src
npm install .
```

# Run

```bash
cd src
node cli.js \
    -c ../project.postman_collection.json \
    -e ../project.postman_environment.json \
    -x http://127.0.0.1:8080 \
    -s no-auth \
    -r 350 \
    -k \
    -v
```
