import { getRows } from "../data/rowRepository.js";
import { healthCheckWorkspace } from "../setup/healthCheck.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function getDashboardSummary() {
  const orders = getRows("Orders");
  const products = getRows("Products");
  const components = getRows("Components");
  const stock = getRows("Stock");
  const purchases = getRows("PurchaseRequests");
  const tasks = getRows("Tasks");
  const clients = getRows("Clients");
  const health = await healthCheckWorkspace();

  const activeOrders = orders.filter(order => !["Cancelled", "Delivered", "PickedUp"].includes(order.status));
  const revenue = orders.reduce((sum, order) => sum + asNumber(order.final_price), 0);
  const lowStock = stock.filter(row => asNumber(row.current_qty) - asNumber(row.reserved_qty) <= asNumber(row.min_qty));
  const openTasks = tasks.filter(task => !["Done", "Closed", "Cancelled"].includes(task.status));
  const openPurchases = purchases.filter(request => !["Received", "Cancelled", "Closed"].includes(request.status));
  const componentById = new Map(components.map(component => [component.component_id, component]));

  return {
    health,
    metrics: {
      orders_total: orders.length,
      active_orders: activeOrders.length,
      clients_total: clients.length,
      revenue_total: revenue,
      low_stock: lowStock.length,
      open_purchases: openPurchases.length,
      open_tasks: openTasks.length
    },
    products: products.slice(0, 12),
    stock: stock.slice(0, 12).map(row => ({
      ...row,
      component_name: componentById.get(row.component_id)?.name || row.component_id
    })),
    recent_orders: orders.slice(-8).reverse(),
    low_stock: lowStock.slice(0, 8),
    open_tasks: openTasks.slice(0, 8)
  };
}
