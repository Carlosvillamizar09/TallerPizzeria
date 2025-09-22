// src/seed.js
import { connect, close } from "./db.js";
import { ObjectId } from "mongodb";

async function seed() {
  const db = await connect();

  const ingredientesColl = db.collection("ingredientes");
  const pizzasColl = db.collection("pizzas");
  const repartidoresColl = db.collection("repartidores");
  const clientesColl = db.collection("clientes");
  const pedidosColl = db.collection("pedidos");

  // limpiar colecciones (solo en dev)
  await Promise.all([
    ingredientesColl.deleteMany({}),
    pizzasColl.deleteMany({}),
    repartidoresColl.deleteMany({}),
    clientesColl.deleteMany({}),
    pedidosColl.deleteMany({})
  ]);

  // ingredientes
  const ingredientes = await ingredientesColl.insertMany([
    { nombre: "Mozzarella", tipo: "queso", stock: 200 },
    { nombre: "Salsa de Tomate", tipo: "salsa", stock: 200 },
    { nombre: "Pepperoni", tipo: "topping", stock: 150 },
    { nombre: "Champiñones", tipo: "topping", stock: 100 },
    { nombre: "Albahaca", tipo: "topping", stock: 80 }
  ]);

  // pizzas (cada ingrediente referenciado por _id y cantidad por pizza)
  const pizzas = [
    {
      nombre: "Margarita",
      categoria: "tradicional",
      precio: 20000,
      ingredientes: [
        { ingredienteId: ingredientes.insertedIds["0"], cantidad: 2 }, // Mozzarella
        { ingredienteId: ingredientes.insertedIds["1"], cantidad: 1 }, // Salsa
        { ingredienteId: ingredientes.insertedIds["4"], cantidad: 1 }  // Albahaca
      ]
    },
    {
      nombre: "Pepperoni",
      categoria: "especial",
      precio: 26000,
      ingredientes: [
        { ingredienteId: ingredientes.insertedIds["0"], cantidad: 2 }, // Mozzarella
        { ingredienteId: ingredientes.insertedIds["1"], cantidad: 1 }, // Salsa
        { ingredienteId: ingredientes.insertedIds["2"], cantidad: 3 }  // Pepperoni
      ]
    },
    {
      nombre: "Champiñones Deluxe",
      categoria: "especial",
      precio: 25000,
      ingredientes: [
        { ingredienteId: ingredientes.insertedIds["0"], cantidad: 2 },
        { ingredienteId: ingredientes.insertedIds["1"], cantidad: 1 },
        { ingredienteId: ingredientes.insertedIds["3"], cantidad: 2 }
      ]
    }
  ];

  const pizzasRes = await pizzasColl.insertMany(pizzas);

  // repartidores
  await repartidoresColl.insertMany([
    { nombre: "Juan", zona: "Norte", estado: "disponible" },
    { nombre: "Luis", zona: "Centro", estado: "disponible" },
    { nombre: "Ana", zona: "Sur", estado: "disponible" }
  ]);

  // clientes
  const clientes = await clientesColl.insertMany([
    { nombre: "Carlos", telefono: "300111222", direccion: "Calle 1 #2-3" },
    { nombre: "María", telefono: "300333444", direccion: "Calle 2 #4-5" }
  ]);

  console.log("Seed completado:");
  console.log("Ingredientes:", Object.values(ingredientes.insertedIds));
  console.log("Pizzas:", Object.values(pizzasRes.insertedIds));
  console.log("Clientes:", Object.values(clientes.insertedIds));

  await close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
