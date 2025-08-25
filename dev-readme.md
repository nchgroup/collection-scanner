# Collection Scanner - Versión Modular

## Estructura del Proyecto

La aplicación ha sido refactorizada para seguir principios de diseño modular y SOLID:

```
src/
├── index.js                   # Punto de entrada principal
├── cli.js                     # CLI
├── config/
│   └── config.js              # Gestión centralizada de configuración
├── core/
│   └── BaseScanner.js         # Clase base para todos los scanners
├── scanners/
│   ├── ScannerFactory.js      # Factory pattern para crear scanners
│   ├── RunScanner.js          # Scanner para ejecución normal
│   ├── ExtractUrlScanner.js   # Scanner para extracción de URLs
│   ├── NoAuthScanner.js       # Scanner para pruebas sin auth
│   ├── CorsScanner.js         # Scanner para pruebas CORS
│   └── RateLimitScanner.js    # Scanner para pruebas de rate limit
└── utils/
    └── utils.js               # Utilidades compartidas
```

## Beneficios de la Refactorización

### 1. **Separación de Responsabilidades**
- Cada clase tiene una responsabilidad específica
- Configuración separada de la lógica de negocio
- Utilidades reutilizables centralizadas

### 2. **Extensibilidad**
- Fácil agregar nuevos tipos de scanner
- Sistema de plugins para nuevas funcionalidades
- Factory pattern para gestión de instancias

### 3. **Mantenibilidad**
- Código más legible y organizado
- Fácil testing de componentes individuales
- Reducción de duplicación de código

### 4. **Reutilización**
- Utilidades compartidas entre scanners
- Clase base con funcionalidad común
- Configuración centralizada

## Uso

### CLI Modular (Recomendado)
```bash
node src/cli.js -c collection.json -s run -t 4
```

### Uso Programático
```javascript
const { Config, ScannerFactory } = require('./src/index');

// Crear configuración
const config = new Config();
config.update({
    collectionFile: './collection.json',
    scanType: 'no-auth',
    threads: 4
});

// Crear y ejecutar scanner
const scanner = ScannerFactory.createScanner(config.scanType, config);
await scanner.run();
```

## Componentes Principales

### Config (src/config/config.js)
Gestiona toda la configuración de la aplicación:
- Validación de parámetros
- Configuración de Newman
- Métodos de utilidad

### BaseScanner (src/core/BaseScanner.js)
Clase abstracta que define:
- Interfaz común para todos los scanners
- Funcionalidad compartida (threading, headers)
- Métodos helper reutilizables

### ScannerFactory (src/scanners/ScannerFactory.js)
Implementa el patrón Factory para:
- Crear instancias de scanners
- Validar tipos de scanner
- Gestionar dependencias

### Utils (src/utils/utils.js)
Utilidades compartidas:
- `ResponseUtils`: Formateo de respuestas
- `CollectionUtils`: Manipulación de colecciones
- `ConcurrencyUtils`: Control de concurrencia
- `ProxyUtils`: Configuración de proxy
- `HeaderUtils`: Manipulación de headers

## Agregar un Nuevo Scanner

1. **Crear la clase del scanner:**
```javascript
// src/scanners/MyNewScanner.js
const BaseScanner = require('../core/BaseScanner');

class MyNewScanner extends BaseScanner {
    async run() {
        // Implementar lógica específica
    }
    
    async executeSequential() {
        // Implementar ejecución secuencial
    }
    
    handleRequest(err, args, requestItem) {
        // Manejar cada request
    }
}

module.exports = MyNewScanner;
```

2. **Registrar en el Factory:**
```javascript
// src/scanners/ScannerFactory.js
const MyNewScanner = require('./MyNewScanner');

const scannerMap = {
    // ... otros scanners
    'mynew': MyNewScanner
};
```

3. **Actualizar validación:**
```javascript
// src/config/config.js
const validScanTypes = [..., 'mynew'];
```

## Testing

La estructura modular facilita el testing unitario:

```javascript
const { Config, RunScanner } = require('./src/index');

describe('RunScanner', () => {
    it('should execute requests', async () => {
        const config = new Config();
        config.update({ collectionFile: './test.json' });
        
        const scanner = new RunScanner(config);
        // Test específico del scanner
    });
});
```