# 🍕 Pizza y Punto – Sistema de Pedidos por Consola

Aplicación de línea de comandos desarrollada en **Node.js** con **MongoDB Atlas** para la gestión de pedidos, inventario e informes de ventas de la cadena de pizzerías **Pizza y Punto**.  
Incluye **transacciones** para pedidos seguros y consultas con **Aggregation Framework** para reportes avanzados.

---

## 🚀 Características principales

- Registro de pedidos con control de inventario en tiempo real.
- Asignación automática de repartidores disponibles.
- Reportes de ventas e ingredientes usando *MongoDB Aggregation*.
- Estructura modular en Node.js (sin Mongoose).
- CLI interactiva con [inquirer](https://www.npmjs.com/package/inquirer).

---

## 📂 Estructura del proyecto (resumen)

```
src/
  ├─ cli.js             # Menú principal por consola
  ├─ db/connection.js   # Conexión única a Mongo Atlas
  ├─ services/
  │    ├─ ordering.js   # Función realizarPedido() con transacciones
  │    ├─ reports.js    # Consultas de Aggregation
  │    └─ seed.js       # Carga de datos de ejemplo
  └─ ...
```

---

## 🛠️ Requisitos

- Node.js 18+  
- Cuenta y cluster en **MongoDB Atlas** (o Replica Set local)  
- Variables de entorno:  
  - `MONGODB_URI` → cadena de conexión de Atlas  
  - `DB_NAME` → nombre de la base (por defecto `pizza_y_punto`)

Crea un archivo `.env` en la raíz:

```
MONGODB_URI="tu_cadena_de_conexion"
DB_NAME="pizza_y_punto"
```

---

## ▶️ Ejecución

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Sembrar datos de prueba (ingredientes, pizzas, clientes, repartidores)**
   ```bash
   npm run seed
   ```

3. **Iniciar la aplicación por consola**
   ```bash
   node src/cli.js
   ```

---

## 💻 Comandos/Flujo en la CLI

- **Realizar pedido**: pide `clienteId` y pizzas; ejecuta la transacción.
- **Ver reportes de ventas**:
  - Ingredientes más utilizados en el último mes.
  - Promedio de precios por categoría de pizza.
  - Categoría de pizzas con más ventas históricas.

---

## 🔒 Estructura de la Transacción

La función `realizarPedido(clienteId, pizzaItems)` ejecuta los siguientes pasos **dentro de una sola sesión** usando `session.withTransaction()`:

1. **Verificar stock**: comprueba que cada ingrediente requerido tenga cantidad suficiente.
2. **Actualizar inventario**: descuenta el stock con operaciones `$inc` negativas.
3. **Insertar pedido**: crea el documento de pedido con cliente, pizzas y total.
4. **Asignar repartidor**: busca el primero `disponible` y lo marca como `ocupado`.

Si cualquiera de estos pasos falla, MongoDB **revierte automáticamente** todos los cambios.

---

## 📊 Ejemplos de Aggregation

En `services/reports.js` encontrarás consultas como:

### 1️⃣ Ingredientes más utilizados (último mes)
```js
db.pedidos.aggregate([
  { $match: { fecha: { $gte: ISODate("2025-08-01") } } },
  { $unwind: "$pizzas" },
  { $unwind: "$pizzas.ingredientes" },
  { $group: { _id: "$pizzas.ingredientes.nombre", totalUsado: { $sum: 1 } } },
  { $sort: { totalUsado: -1 } }
]);
```

### 2️⃣ Promedio de precios por categoría
```js
db.pizzas.aggregate([
  { $group: { _id: "$categoria", promedio: { $avg: "$precio" } } },
  { $sort: { promedio: -1 } }
]);
```

### 3️⃣ Categoría con más ventas históricas
```js
db.pedidos.aggregate([
  { $unwind: "$pizzas" },
  { $group: { _id: "$pizzas.categoria", ventas: { $sum: 1 } } },
  { $sort: { ventas: -1 } }
]);
```

Estos resultados se muestran en consola con la opción **Reportes** del menú.

---

## 🧑‍💻 Autores

Carlos Villamizar  
Fabian Pertuz
