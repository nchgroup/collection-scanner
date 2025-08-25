const colors = require('colors/safe');

/**
 * Utilidades para formato y manipulación de respuestas
 */
class ResponseUtils {
    /**
     * Formatea el cuerpo de respuesta según el límite de caracteres
     * @param {*} responseBody - Cuerpo de la respuesta
     * @param {number|null} limit - Límite de caracteres
     * @returns {string} - Cuerpo formateado
     */
    static formatResponseBody(responseBody, limit) {
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

    /**
     * Muestra el cuerpo de respuesta formateado
     * @param {*} responseBody - Cuerpo de la respuesta
     * @param {number|null} responseLimit - Límite de caracteres
     * @param {string} indent - Indentación
     */
    static displayResponseBody(responseBody, responseLimit, indent = '\t\t') {
        if (responseLimit !== null) {
            const formattedBody = this.formatResponseBody(responseBody, responseLimit);
            if (formattedBody) {
                console.log(colors.cyan(`${indent}Response Body:`));
                console.log(colors.gray(`${indent}${formattedBody.replace(/\n/g, `\n${indent}`)}`));
                console.log(''); // Línea en blanco para separar
            }
        }
    }
}

/**
 * Utilidades para manejo de colecciones
 */
class CollectionUtils {
    /**
     * Extrae requests individuales de una colección
     * @param {Object} collection - Colección de Postman
     * @returns {Array} - Array de requests
     */
    static extractRequestsFromCollection(collection) {
        const requests = [];

        function extractFromItems(items, parentName = '') {
            for (const item of items) {
                if (item.request) {
                    requests.push({
                        name: item.name || 'Unnamed Request',
                        fullName: parentName ? `${parentName} > ${item.name}` : item.name,
                        request: item.request,
                        originalItem: item
                    });
                }
                if (item.item) {
                    const folderName = parentName ? `${parentName} > ${item.name}` : item.name;
                    extractFromItems(item.item, folderName);
                }
            }
        }

        extractFromItems(collection.item || []);
        return requests;
    }

    /**
     * Crea una colección temporal con un solo request
     * @param {Object} originalCollection - Colección original
     * @param {Object} requestItem - Item de request
     * @returns {Object} - Nueva colección
     */
    static createSingleRequestCollection(originalCollection, requestItem) {
        return {
            info: originalCollection.info,
            item: [requestItem.originalItem]
        };
    }
}

/**
 * Utilidades para manejo de concurrencia
 */
class ConcurrencyUtils {
    /**
     * Ejecuta requests en paralelo con control de concurrencia
     * @param {Array} requests - Array de requests
     * @param {Function} handlerFunction - Función para manejar cada request
     * @param {number} maxConcurrency - Máxima concurrencia
     */
    static async executeRequestsWithThreads(requests, handlerFunction, maxConcurrency = 1) {
        if (maxConcurrency <= 1) {
            // Ejecución secuencial
            for (const request of requests) {
                await handlerFunction(request);
            }
            return;
        }

        // Ejecución paralela
        const results = [];
        const executing = [];

        for (const request of requests) {
            const promise = handlerFunction(request).then(() => {
                executing.splice(executing.indexOf(promise), 1);
            });

            results.push(promise);
            executing.push(promise);

            if (executing.length >= maxConcurrency) {
                await Promise.race(executing);
            }
        }

        await Promise.all(results);
    }
}

/**
 * Utilidades para configuración de proxy
 */
class ProxyUtils {
    /**
     * Configura el proxy usando variables de entorno
     * @param {string} proxyURL - URL del proxy
     * @param {boolean} verbose - Modo verbose
     */
    static setupProxy(proxyURL, verbose = false) {
        if (proxyURL) {
            // Configurar variables de entorno para HTTP y HTTPS
            process.env.HTTP_PROXY = proxyURL;
            process.env.HTTPS_PROXY = proxyURL;
            process.env.http_proxy = proxyURL;
            process.env.https_proxy = proxyURL;

            if (verbose) {
                console.log(colors.yellow(`[INFO] Proxy configurado via variables de entorno: ${proxyURL}`));
                console.log(colors.gray(`[DEBUG] HTTP_PROXY=${process.env.HTTP_PROXY}`));
                console.log(colors.gray(`[DEBUG] HTTPS_PROXY=${process.env.HTTPS_PROXY}`));
            }
        }
    }
}

/**
 * Utilidades para manejo de headers
 */
class HeaderUtils {
    /**
     * Filtra headers de autorización
     * @param {Array} headers - Array de headers
     * @returns {Array} - Headers filtrados
     */
    static filterAuthorizationHeaders(headers) {
        return headers.filter(header => header.key.toLowerCase() !== 'authorization');
    }

    /**
     * Agrega header de autorización
     * @param {Array} headers - Array de headers
     * @param {string} token - Token de autorización
     */
    static addAuthorizationHeader(headers, token) {
        if (token && token !== "") {
            headers.push({ key: "Authorization", value: token });
        }
    }

    /**
     * Modifica el header Origin
     * @param {Array} headers - Array de headers
     * @param {string} origin - Nuevo valor del Origin
     * @returns {Array} - Headers modificados
     */
    static modifyOriginHeader(headers, origin = "https://evil.tld") {
        return headers.map(header => {
            if (header.key.toLowerCase() === 'origin') {
                return { key: "Origin", value: origin };
            } else {
                return header;
            }
        });
    }

    /**
     * Encuentra un header específico
     * @param {Array} headers - Array de headers
     * @param {string} headerName - Nombre del header (case insensitive)
     * @returns {Object|undefined} - Header encontrado
     */
    static findHeader(headers, headerName) {
        return headers.find(header => header.key.toLowerCase() === headerName.toLowerCase());
    }
}

module.exports = {
    ResponseUtils,
    CollectionUtils,
    ConcurrencyUtils,
    ProxyUtils,
    HeaderUtils
};