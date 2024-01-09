const newman = require('newman');
const program = require('commander');
const colors = require('colors/safe');
const HttpsProxyAgent = require('https-proxy-agent');

const nameProject = "Postman Collection Scanner";

// Configuración centralizada
const config = {
    collectionFile: "",
    environmentPath: "",
    token: "",
    proxyURL: "",
    scanType: "",
    insecureReq: false,
    verbose: false
};

// Configuración del programa y manejo de argumentos
program
    .version('1.0.0')
    .description(nameProject)
    .option('-c, --collection <type>', 'Path to the Postman collection')
    .option('-e, --environment <type>', 'Path to the Postman environment')
    .option('-A, --authorization <type>', 'Token to use for authentication')
    .option('-x, --proxy <type>', 'Proxy to use for requests')
    .option('-s, --scan <type>', 'Scan type, please choice: {run, extract-url, no-auth, cors}')
    .option('-k, --insecure', 'Allow insecure server connections')
    .option('-v, --verbose', 'Verbose output')
    .action((cmdObj) => {
        config.collectionFile = cmdObj.collection;
        config.environmentPath = cmdObj.environment;
        config.token = cmdObj.authorization;
        config.proxyURL = cmdObj.proxy;
        config.scanType = cmdObj.scan;
        config.insecureReq = cmdObj.insecure;
        config.verbose = cmdObj.verbose;
    })
    .parse(process.argv);


const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
        return;
    }
    originalEmitWarning.call(process, warning, ...args)
};

// Proceso de configuración del proxy y el entorno
const proxyAgent = config.proxyURL ? new HttpsProxyAgent(config.proxyURL) : undefined;
const environmentFile = config.environmentPath ? config.environmentPath : undefined;

if (config.insecureReq) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function handleErrorScan() {
    console.log(`${colors.red("[!] Invalid scan type")}, ${colors.yellow("please run command with --help flag to see available options")}`);
}

const handleRun = () => {
    newman.run({
        collection: require(config.collectionFile),
        environment: environmentFile,
        proxy: proxyAgent
    })
        .on('start', (err, args) => {
            if (err) {
                console.error('Error al iniciar: ', err);
                return;
            }
        })
        .on('request', (err, args) => {
            if (err) {
                console.error('Error en la solicitud: ', err);
                return;
            }
            if (!args.response) {
                console.log('No se recibió ninguna respuesta');
                //return;
            }
            console.log(`> ${args.request.method} ${args.request.url} - ${args.response.code} ${args.response.status}`);
        })
}

const handleExtractURL = () => {
    const uniqueUrls = {};
    newman.run({
        collection: require(config.collectionFile),
        environment: environmentFile,
        proxy: proxyAgent
    })
        .on('request', (err, args) => {
            const url = args.request.url.toString();
            uniqueUrls[url] = (uniqueUrls[url] || 0) + 1;
        })
        .once('done', () => {
            const urls = Object.keys(uniqueUrls);
            urls.forEach(url => console.info(`[+] ${url}`));
        });
}

const handleNoAuth = () => {
    newman.run({
        collection: require(config.collectionFile),
        environment: environmentFile,
        proxy: proxyAgent
    })
        .on('start', (err, args) => {
            if (err) {
                console.error(`Error al iniciar: ${err}`);
                return;
            }
        })
        .on('request', (err, args) => {

            if (err) {
                console.error(`Error en la respuesta: ${err}`);
                return;
            }

            args.request.headers = args.request.headers.filter(header => header.key.toLowerCase() !== 'authorization');

            if (!Array.isArray(args.request.headers)) {
                args.request.headers = [];
            }

            if (config.token != "") {
                args.request.headers.push({ key: "Authorization", value: config.token });
            } if (config.token == undefined) {
                args.request.headers = args.request.headers.filter(header => header.key.toLowerCase() !== 'authorization');
            }

            const responseCode = args.response.code;
            const responseStatus = args.response.status;

            if (responseCode < 200 || responseCode > 299) {
                console.log(colors.red(`- ${responseCode} ${responseStatus}`));

                // Busca el header de autorización
                const authHeader = args.request.headers.find(header => header.key.toLowerCase() === 'authorization');

                // Verifica si el header de autorización existe y tiene un valor
                if (authHeader && authHeader.value !== "") {
                    console.log('[*] curl -X %s %s -H "Authorization: %s"', args.request.method, args.request.url.toString(), authHeader.value);
                } else {
                    console.log('[*] curl -X %s %s', args.request.method, args.request.url.toString());
                }
            } else {
                console.log(colors.green(`+ ${responseCode} ${responseStatus}`));
            }
        });
};

const handleCors = () => {
    newman.run({
        collection: require(config.collectionFile),
        environment: environmentFile,
        proxy: proxyAgent
    })
        .on('request', (err, args) => {
            args.request.headers = args.request.headers.map(header => {
                if (header.key.toLowerCase() === 'origin') {
                    return { key: "Origin", value: "https://evil.tld" };
                } else {
                    return header;
                }
            });

            const authHeader = args.request.headers.find(header => header.key.toLowerCase() === 'authorization');

            if (authHeader) {
                args.request.headers = args.request.headers.filter(header => header !== authHeader);
            }

            if (config.token) {
                args.request.headers.push({ key: "Authorization", value: config.token });
            }
            if (!args.response) {
                console.log('[-] No se recibió ninguna respuesta');
                return;
            }
            const corsHeader = args.response.headers.find(header => header.key.toLowerCase() === 'access-control-allow-origin');

            if (corsHeader && corsHeader.value === 'https://evil.tld') {
                console.log(`+ Potencial CORS en el endpoint: ${args.request.url}`);
            } else {
                console.log(`- No se encontró CORS en el endpoint: ${args.request.url}`);
            }
        })
};

function main() {
    // Define un objeto que mapea los tipos de escaneo a sus respectivas funciones de manejo
    const scanHandlers = {
        'extract-urls': handleExtractURL,
        'no-auth': handleNoAuth,
        'cors': handleCors,
        'run': handleRun
    };

    // Ejecuta el escáner de la colección
    console.log(colors.bold("[+] Running " + nameProject + "\n"));

    // Obtiene la función de manejo para el tipo de escaneo proporcionado
    const handleScan = scanHandlers[config.scanType];

    if (handleScan) {
        // Si se encontró una función de manejo, la ejecuta
        console.log(colors.green(`>>> Running collection scanner: ${config.scanType}`));
        handleScan();
    } else {
        // Si no se encontró una función de manejo, maneja el error
        handleErrorScan();
    }
}

main();

