import { createOrder } from "./orderService.js";

const result = createOrder({
  client_name: "Олена",
  client_contact: "+380000000000",
  product_name: "Chocolate Cake",
  quantity: 2,
  desired_date: new Date().toISOString(),
  restrictions_or_allergies: "без горіхів",
  urgent: false
});

console.log(JSON.stringify(result, null, 2));
