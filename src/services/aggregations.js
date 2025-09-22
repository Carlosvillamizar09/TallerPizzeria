// src/services/aggregations.js
import { connect } from "../db.js";
import { ObjectId } from "mongodb";

/**
 * 1) Ingredientes más utilizados en los pedidos del último mes
 */
export async function ingredientesMasUsadosUltimoMes(limit = 10) {
  const db = await connect();
  const pedidos = db.collection("pedidos");

  const now = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(now.getMonth() - 1);

  const pipeline = [
    { $match: { fecha: { $gte: lastMonth, $lte: now } } },
    { $unwind: "$pizzas" },
    { $unwind: "$pizzas.ingredientes" , preserveNullAndEmptyArrays: true }, // si tu snapshot incluye ingredientes; si no, usamos lookup
    // Si en tu snapshot no guardaste los ingredientes por pizza, necesitarías $lookup desde pizzas. Aquí asumimos snapshot con ingredientes no hecho,
    // por eso usaremos $lookup para obtener ingredientes desde pizzas collection.
  ];

  // Alternative: if pizzas snapshot doesn't have ingredients, lookup:
  const pipeline2 = [
    { $match: { fecha: { $gte: lastMonth, $lte: now } } },
    { $unwind: "$pizzas" },
    {
      $lookup: {
        from: "pizzas",
        localField: "pizzas.pizzaId",
        foreignField: "_id",
        as: "pizzaData"
      }
    },
    { $unwind: "$pizzaData" },
    { $unwind: "$pizzaData.ingredientes" },
    {
      $group: {
        _id: "$pizzaData.ingredientes.ingredienteId",
        totalUsado: { $sum: "$pizzaData.ingredientes.cantidad" }
      }
    },
    {
      $lookup: {
        from: "ingredientes",
        localField: "_id",
        foreignField: "_id",
        as: "ingrediente"
      }
    },
    { $unwind: "$ingrediente" },
    { $project: { _id: 0, ingrediente: "$ingrediente.nombre", tipo: "$ingrediente.tipo", totalUsado: 1 } },
    { $sort: { totalUsado: -1 } },
    { $limit: limit }
  ];

  const res = await pedidos.aggregate(pipeline2).toArray();
  return res;
}

/**
 * 2) Promedio de precios por categoría de pizza
 */
export async function promedioPrecioPorCategoria() {
  const db = await connect();
  const pizzas = db.collection("pizzas");

  const pipeline = [
    { $group: { _id: "$categoria", promedioPrecio: { $avg: "$precio" }, count: { $sum: 1 } } },
    { $project: { _id: 0, categoria: "$_id", promedioPrecio: { $round: ["$promedioPrecio", 2] }, count: 1 } },
    { $sort: { promedioPrecio: -1 } }
  ];

  return await pizzas.aggregate(pipeline).toArray();
}

/**
 * 3) Qué categoría de pizzas ha tenido más ventas históricas
 * Usamos pedidos -> unwind pizzas y sumamos qty por categoria (haciendo lookup a pizzas si es necesario)
 */
export async function categoriaMasVendida() {
  const db = await connect();
  const pedidos = db.collection("pedidos");

  const pipeline = [
    { $unwind: "$pizzas" },
    {
      $lookup: {
        from: "pizzas",
        localField: "pizzas.pizzaId",
        foreignField: "_id",
        as: "pizzaData"
      }
    },
    { $unwind: "$pizzaData" },
    {
      $group: {
        _id: "$pizzaData.categoria",
        totalVendidos: { $sum: "$pizzas.qty" }
      }
    },
    { $project: { _id: 0, categoria: "$_id", totalVendidos: 1 } },
    { $sort: { totalVendidos: -1 } },
    { $limit: 1 }
  ];

  const res = await pedidos.aggregate(pipeline).toArray();
  return res[0] || null;
}
