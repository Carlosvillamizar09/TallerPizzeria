// src/services/ordering.js
import { ObjectId } from "mongodb";
import { connect, getClient } from "../db.js";

/**
 * realizarPedido(clienteId, pizzaIdsAndQty)
 * pizzaIdsAndQty: [{ pizzaId: "60...", qty: 2 }, ...]
 */
export async function realizarPedido(clienteId, pizzaItems) {
  const db = await connect();
  const client = getClient();
  const session = client.startSession();

  // opciones recomendadas para transacciones
  const txOptions = {
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary"
  };

  try {
    const result = await session.withTransaction(async () => {
      const pizzasColl = db.collection("pizzas");
      const ingredientesColl = db.collection("ingredientes");
      const pedidosColl = db.collection("pedidos");
      const repartidoresColl = db.collection("repartidores");
      const clientesColl = db.collection("clientes");

      // 1) validar cliente
      const cliente = await clientesColl.findOne({ _id: new ObjectId(clienteId) }, { session });
      if (!cliente) throw new Error("Cliente no existe");

      // 2) traer detalles de las pizzas solicitadas
      const pizzaIds = pizzaItems.map(p => new ObjectId(p.pizzaId));
      const pizzas = await pizzasColl.find({ _id: { $in: pizzaIds } }).toArray();

      if (pizzas.length !== pizzaItems.length) {
        throw new Error("Alguna pizza no existe");
      }

      // construir mapa de cantidad pedida por pizzaId
      const qtyById = {};
      pizzaItems.forEach(pi => qtyById[pi.pizzaId] = (qtyById[pi.pizzaId] || 0) + pi.qty);

      // 3) calcular ingredientes totales requeridos (sumando por pizza multiplicado por qty)
      const reqIngredients = new Map(); // key: ingredienteId.toHexString(), value: totalCantidad
      const pedidoPizzasEmbedded = []; // para guardar en pedido (snapshots)
      let total = 0;

      for (const pizza of pizzas) {
        const qty = qtyById[pizza._id.toHexString()] || 1;
        total += (pizza.precio || 0) * qty;

        // embed pizza snapshot con qty
        pedidoPizzasEmbedded.push({
          pizzaId: pizza._id,
          nombre: pizza.nombre,
          categoria: pizza.categoria,
          precio: pizza.precio,
          qty
        });

        // sumar ingredientes
        for (const ing of pizza.ingredientes) {
          const idStr = ing.ingredienteId.toHexString();
          const totalNeeded = (reqIngredients.get(idStr) || 0) + (ing.cantidad * qty);
          reqIngredients.set(idStr, totalNeeded);
        }
      }

      // 4) comprobar stock de cada ingrediente
      const ingredientIds = Array.from(reqIngredients.keys()).map(id => new ObjectId(id));
      const ingredientsInDb = await ingredientesColl.find({ _id: { $in: ingredientIds } }, { session }).toArray();

      // chequear existencia y stock
      for (const dbIng of ingredientsInDb) {
        const needed = reqIngredients.get(dbIng._id.toHexString()) || 0;
        if (dbIng.stock < needed) {
          throw new Error(`Ingrediente "${dbIng.nombre}" con stock insuficiente. Necesita ${needed}, hay ${dbIng.stock}`);
        }
      }
      // también chequear si falta algún ingrediente (no existe)
      if (ingredientsInDb.length !== ingredientIds.length) {
        throw new Error("Algún ingrediente requerido no existe en la base de datos");
      }

      // 5) disminuir stock (bulk updates) - todo dentro de la transacción
      const bulkOps = [];
      for (const [idStr, needed] of reqIngredients.entries()) {
        bulkOps.push({
          updateOne: {
            filter: { _id: new ObjectId(idStr) },
            update: { $inc: { stock: -needed } }
          }
        });
      }
      if (bulkOps.length) await ingredientesColl.bulkWrite(bulkOps, { session });

      // 6) asignar repartidor disponible
      const repartidor = await repartidoresColl.findOneAndUpdate(
        { estado: "disponible" },
        { $set: { estado: "ocupado" } },
        { session, returnDocument: "after" }
      );
      if (!repartidor.value) {
        throw new Error("No hay repartidores disponibles, el pedido no pudo completarse");
      }

      // 7) insertar pedido (con snapshot de pizzas y repartidor)
      const pedidoDoc = {
        clienteId: cliente._id,
        clienteNombre: cliente.nombre,
        pizzas: pedidoPizzasEmbedded,
        total,
        fecha: new Date(),
        repartidorAsignado: {
          _id: repartidor.value._id,
          nombre: repartidor.value.nombre,
          zona: repartidor.value.zona
        },
        estado: "en_preparacion"
      };

      const insertRes = await pedidosColl.insertOne(pedidoDoc, { session });

      return {
        success: true,
        pedidoId: insertRes.insertedId,
        repartidor: repartidor.value,
        total
      };

    }, txOptions);

    return result;
  } catch (err) {
    // el withTransaction hará rollback automáticamente si lanza error
    console.error("Transaction error:", err.message);
    return { success: false, message: err.message };
  } finally {
    await session.endSession();
  }
}
