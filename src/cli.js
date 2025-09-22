// src/cli.js
import inquirer from "inquirer";
import { connect, close } from "./db.js";
import { realizarPedido } from "./services/ordering.js";
import { ingredientesMasUsadosUltimoMes, promedioPrecioPorCategoria, categoriaMasVendida } from "./services/aggregations.js";
import { ObjectId } from "mongodb";

async function main() {
  await connect();
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "op",
      message: "¿Qué quieres hacer?",
      choices: [
        { name: "Realizar pedido (demo)", value: "pedido" },
        { name: "Reporte: ingredientes más usados (último mes)", value: "ingr" },
        { name: "Reporte: promedio precio por categoría", value: "prom" },
        { name: "Reporte: categoría más vendida (histórico)", value: "cat" },
        { name: "Salir", value: "exit" }
      ]
    }
  ]);

  if (answer.op === "pedido") {
    // pedir clienteId y pizzas (en demo tomamos IDs de seed)
    const a2 = await inquirer.prompt([
      { name: "clienteId", message: "clienteId (ej: copia un _id de clientes):" },
      { name: "pizzaId", message: "pizzaId a pedir (prueba con una pizza)" },
      { name: "qty", message: "cantidad", default: 1 }
    ]);
    const result = await realizarPedido(a2.clienteId, [{ pizzaId: a2.pizzaId, qty: Number(a2.qty) }]);
    console.log("Resultado:", result);
  } else if (answer.op === "ingr") {
    const res = await ingredientesMasUsadosUltimoMes(5);
    console.table(res);
  } else if (answer.op === "prom") {
    const res = await promedioPrecioPorCategoria();
    console.table(res);
  } else if (answer.op === "cat") {
    const res = await categoriaMasVendida();
    console.log(res ? res : "No hay ventas registradas todavía");
  } else {
    console.log("Bye!");
    await close();
    process.exit(0);
  }

  await close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
