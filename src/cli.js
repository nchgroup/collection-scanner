// Suprimir advertencias de deprecación específicas
process.noDeprecation = true;

const newman = require('newman');
const program = require('commander');
const colors = require('colors/safe');

const nameProject = "Postman Collection Scanner";

// Configuración centralizada
const config = {
    collectionFile: "",
    environmentPath: "",
    token: "",
    proxyURL: "",
    scanType: "",
    insecureReq: false,
    verbose: false,
    responseLimit: null
};

// Configuración del programa y manejo de argumentos
program
    .version('1.0.0')
    .description(nameProject)
    .option('-c, --collection <type>', 'Path to the Postman collection')
    .option('-e, --environment <type>', 'Path to the Postman environment')
    .option('-A, --authorization <type>', 'Token to use for authentication')
    .option('-x, --proxy <type>', 'Proxy to use for requests (format: http://proxy:port or http://user:pass@proxy:port)')
    .option('-s, --scan <type>', 'Scan type, please choice: {run, extract-url, no-auth, cors}')
    .option('-r, --response <type>', 'Show response body with character limit (0 = no limit)')
    .option('-k, --insecure', 'Allow insecure server connections')
    .option('-v, --verbose', 'Verbose output')
    .action((cmdObj) => {
        config.collectionFile = cmdObj.collection;
        config.environmentPath = cmdObj.environment;
        config.token = cmdObj.authorization;
        config.proxyURL = cmdObj.proxy;
        config.scanType = cmdObj.scan;
        config.responseLimit = cmdObj.response ? parseInt(cmdObj.response) : null;
        config.insecureReq = cmdObj.insecure;
        config.verbose = cmdObj.verbose;
    })
    .parse(process.argv);

const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, type, code, ...args) => {
    // Suprimir advertencias específicas de NODE_TLS_REJECT_UNAUTHORIZED
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
        return;
    }

    // Suprimir advertencias de deprecación DEP0176 (fs.F_OK)
    if (code === 'DEP0176' || (typeof warning === 'string' && warning.includes('DEP0176'))) {
        return;
    }

    // Suprimir todas las advertencias de deprecación si es necesario
    if (type === 'DeprecationWarning') {
        return;
    }

    originalEmitWarning.call(process, warning, type, code, ...args);
};

// CONFIGURACIÓN DE PROXY SIMPLIFICADA (SOLO VARIABLES DE ENTORNO)
function setupProxy() {
    if (config.proxyURL) {
        // Usar solo variables de entorno - método más confiable y sin dependencias extra
        const proxyUrl = config.proxyURL;

        // Configurar variables de entorno para HTTP y HTTPS
        process.env.HTTP_PROXY = proxyUrl;
        process.env.HTTPS_PROXY = proxyUrl;
        process.env.http_proxy = proxyUrl;
        process.env.https_proxy = proxyUrl;

        if (config.verbose) {
            console.log(colors.yellow(`[INFO] Proxy configurado via variables de entorno: ${proxyUrl}`));
            console.log(colors.gray(`[DEBUG] HTTP_PROXY=${process.env.HTTP_PROXY}`));
            console.log(colors.gray(`[DEBUG] HTTPS_PROXY=${process.env.HTTPS_PROXY}`));
        }
    }
}

// Proceso de configuración del proxy y el entorno
const environmentFile = config.environmentPath ? config.environmentPath : undefined;

if (config.insecureReq) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Configurar proxy antes de ejecutar Newman
setupProxy();

// Función para formatear el response body según el límite de caracteres
function formatResponseBody(responseBody, limit) {
    if (!responseBody) return '';

    const bodyStr = responseBody.toString();

    if (limit === null || limit === undefined) {
        return '';
    }

    if (limit === 0) {
        return bodyStr;
    }

    if (bodyStr.length > limit) {
        return bodyStr.substring(0, limit) + '...';
    }

    return bodyStr;
}

function handleErrorScan() {
    console.log(`${colors.red("[!] Invalid scan type")}, ${colors.yellow("please run command with --help flag to see available options")}`);
}

// Función para crear la configuración base de Newman
function getNewmanConfig() {
    const config_newman = {
        collection: require(config.collectionFile),
        environment: environmentFile,
        insecure: config.insecureReq,
        verbose: config.verbose
    };

    // NOTA: Ya no pasamos 'proxy' como parámetro a Newman
    // porque Newman no lo soporta directamente. En su lugar,
    // usamos las variables de entorno y agentes globales configurados arriba.

    return config_newman;
}

const handleRun = () => {
    newman.run(getNewmanConfig())
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
                return;
            }

            console.log(`> ${args.request.method} ${args.request.url} - ${args.response.code} ${args.response.status}`);

            // Mostrar response body si la opción -r está habilitada
            if (config.responseLimit !== null) {
                const responseBody = formatResponseBody(args.response.stream, config.responseLimit);
                if (responseBody) {
                    console.log(colors.cyan('Response Body:'));
                    console.log(colors.gray(responseBody));
                    console.log(''); // Línea en blanco para separar
                }
            }
        })
}

const handleExtractURL = () => {
    const uniqueUrls = {};
    newman.run(getNewmanConfig())
        .on('request', (err, args) => {
            if (err) {
                console.error('Error en la solicitud: ', err);
                return;
            }
            const url = args.request.url.toString();
            uniqueUrls[url] = (uniqueUrls[url] || 0) + 1;
        })
        .once('done', () => {
            const urls = Object.keys(uniqueUrls);
            urls.forEach(url => console.info(`[+] ${url}`));
        });
}

const handleNoAuth = () => {
    newman.run(getNewmanConfig())
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

            // Filtrar headers de autorización existentes
            args.request.headers = args.request.headers.filter(header => header.key.toLowerCase() !== 'authorization');

            if (!Array.isArray(args.request.headers)) {
                args.request.headers = [];
            }

            // Agregar token personalizado si se proporciona
            if (config.token && config.token !== "") {
                args.request.headers.push({ key: "Authorization", value: config.token });
            }

            if (!args.response) {
                console.log('[-] No se recibió ninguna respuesta');
                return;
            }

            const responseCode = args.response.code;
            const responseStatus = args.response.status;

            // En el contexto de no-auth, códigos como 401, 403 son "buenos" resultados
            if (responseCode === 401 || responseCode === 403) {
                console.log(colors.green(`+ ${responseCode} ${responseStatus}`));
                console.log(`\t${args.request.url.toString()}`);

                // Mostrar response body si la opción -r está habilitada
                if (config.responseLimit !== null) {
                    const responseBody = formatResponseBody(args.response.stream, config.responseLimit);
                    if (responseBody) {
                        console.log(colors.cyan('\t\tResponse Body:'));
                        console.log(colors.gray(`\t\t${responseBody.replace(/\n/g, '\n\t')}`));
                    }
                }
            } else if (responseCode >= 200 && responseCode < 300) {
                // Códigos 2xx son "malos" en este contexto porque indican acceso sin auth
                console.log(colors.red(`- ${responseCode} ${responseStatus}`));

                const authHeader = args.request.headers.find(header => header.key.toLowerCase() === 'authorization');

                if (authHeader && authHeader.value !== "") {
                    console.log('\tcurl -X %s %s -H "Authorization: %s"', args.request.method, args.request.url.toString(), authHeader.value);
                } else {
                    console.log('\tcurl -X %s %s', args.request.method, args.request.url.toString());
                }

                // Mostrar response body si la opción -r está habilitada
                if (config.responseLimit !== null) {
                    const responseBody = formatResponseBody(args.response.stream, config.responseLimit);
                    if (responseBody) {
                        console.log(colors.cyan('\t\tResponse Body:'));
                        console.log(colors.gray(`\t\t${responseBody.replace(/\n/g, '\n\t')}`));
                    }
                }
            } else {
                // Otros códigos de error (4xx, 5xx excepto 401/403)
                console.log(colors.yellow(`? ${responseCode} ${responseStatus}`));
                console.log(`\t${args.request.url.toString()}`);

                // Mostrar response body si la opción -r está habilitada
                if (config.responseLimit !== null) {
                    const responseBody = formatResponseBody(args.response.stream, config.responseLimit);
                    if (responseBody) {
                        console.log(colors.cyan('\t\tResponse Body:'));
                        console.log(colors.gray(`\t\t${responseBody.replace(/\n/g, '\n\t')}`));
                    }
                }
            }
        });
};

const handleCors = () => {
    newman.run(getNewmanConfig())
        .on('request', (err, args) => {
            if (err) {
                console.error('Error en la solicitud: ', err);
                return;
            }

            // Modificar el header Origin
            args.request.headers = args.request.headers.map(header => {
                if (header.key.toLowerCase() === 'origin') {
                    return { key: "Origin", value: "https://evil.tld" };
                } else {
                    return header;
                }
            });

            // Filtrar header de autorización existente
            const authHeader = args.request.headers.find(header => header.key.toLowerCase() === 'authorization');
            if (authHeader) {
                args.request.headers = args.request.headers.filter(header => header !== authHeader);
            }

            // Agregar token personalizado si se proporciona
            if (config.token) {
                args.request.headers.push({ key: "Authorization", value: config.token });
            }

            if (!args.response) {
                console.log('[-] No se recibió ninguna respuesta');
                return;
            }

            const corsHeader = args.response.headers.find(header => header.key.toLowerCase() === 'access-control-allow-origin');

            if (corsHeader && corsHeader.value === 'https://evil.tld') {
                console.log(colors.green(`+ Potencial CORS en el endpoint: ${args.request.url}`));

                // Mostrar response body si la opción -r está habilitada
                if (config.responseLimit !== null) {
                    const responseBody = formatResponseBody(args.response.stream, config.responseLimit);
                    if (responseBody) {
                        console.log(colors.cyan('Response Body:'));
                        console.log(colors.gray(responseBody));
                        console.log(''); // Línea en blanco para separar
                    }
                }
            } else {
                console.log(colors.red(`- No se encontró CORS en el endpoint: ${args.request.url}`));

                // Mostrar response body si la opción -r está habilitada
                if (config.responseLimit !== null) {
                    const responseBody = formatResponseBody(args.response.stream, config.responseLimit);
                    if (responseBody) {
                        console.log(colors.cyan('Response Body:'));
                        console.log(colors.gray(responseBody));
                        console.log(''); // Línea en blanco para separar
                    }
                }
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

    // Debug: mostrar configuración
    if (config.verbose || config.proxyURL) {
        console.log(colors.cyan("[DEBUG] Configuración:"));
        console.log(colors.cyan(`  - Collection: ${config.collectionFile}`));
        console.log(colors.cyan(`  - Environment: ${config.environmentPath}`));
        console.log(colors.cyan(`  - Proxy: ${config.proxyURL || 'No configurado'}`));
        console.log(colors.cyan(`  - Scan Type: ${config.scanType}`));
        console.log(colors.cyan(`  - Insecure: ${config.insecureReq}`));
        console.log(colors.cyan(`  - Response Limit: ${config.responseLimit !== null ? (config.responseLimit === 0 ? 'Sin límite' : config.responseLimit + ' caracteres') : 'Deshabilitado'}`));
        console.log("");
    }

    // Obtiene la función de manejo para el tipo de escaneo proporcionado
    const handleScan = scanHandlers[config.scanType];

    if (handleScan) {
        console.log(colors.green(`>>> Running collection scanner: ${config.scanType}`));
        if (config.proxyURL && config.verbose) {
            console.log(colors.yellow(`>>> Using proxy: ${config.proxyURL}`));
        }
        handleScan();
    } else {
        handleErrorScan();
    }
}

main();