const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

/* --- Validation middleware --- */

// Checks if order data has 'deliverTo'. Returns '400' if not
function bodyDataHasDeliverTo(req, res, next) {
	const { data: { deliverTo } = {} } = req.body;
	if (deliverTo) {
		return next();
	}
	next({
		status: 400,
		message: "Order must include a deliverTo",
	});
}

// Checks if order data has 'mobileNumber'. Returns '400' if not
function bodyDataHasMobileNumber(req, res, next) {
	const { data: { mobileNumber } = {} } = req.body;
	if (mobileNumber) {
		return next();
	}
	next({
		status: 400,
		message: "Order must include a mobileNumber",
	});
}

// Checks if order data has 'dishes', and if it's an array containing at least 1 dish. Returns '400' if not
function bodyDataHasDishes(req, res, next) {
	const { data: { dishes } = {} } = req.body;
	if (!dishes) {
		return next({
			status: 400,
			message: "Order must include a dish",
		});
	} else if (!Array.isArray(dishes) || dishes.length < 1) {
		return next({
			status: 400,
			message: "Order must include at least 1 dish",
		});
	}
	res.locals.dishes = dishes; // Save for dishesHaveQuantity()
	return next();
}

// Checks if each dish within order has 'quantity', and if it's a number that's greater than 0. Returns '400' if not
function dishesHaveQuantity(req, res, next) {
	res.locals.dishes.forEach((dish, index) => {
		const quantity = dish.quantity;
		if (!quantity || typeof quantity !== "number" || quantity < 1) {
			return next({
				status: 400,
				message: `Dish ${index} must have a quantity that is an integer greater than 0`,
			});
		}
	});
	next();
}

// Checks if order with given id exists within orders-data. Returns '404' if not
function orderExists(req, res, next) {
	const { orderId } = req.params;
	const foundOrder = orders.find((order) => order.id === orderId);
	if (foundOrder) {
		res.locals.order = foundOrder;
		return next();
	}
	next({
		status: 404,
		message: `Order does not exist: ${orderId}`,
	});
}

// Checks if order data has 'id', and if it matches 'id' within route. Returns '400' only if it's included but doesn't match
function idMatches(req, res, next) {
	const { data: { id } = {} } = req.body;
	const routeId = res.locals.order.id;
	if (id && id !== routeId) {
		return next({
			status: 400,
			message: `Order id does not match route id. Order: ${id}, Route: ${routeId}`,
		});
	}
	next();
}

// Checks if order data has valid 'status' for updating. Returns '400' if not
function bodyDataHasStatus(req, res, next) {
	const { data: { status } = {} } = req.body;
	if (
		status === "pending" ||
		status === "preparing" ||
		status === "out-for-delivery"
	) {
		return next();
	} else if (status === "delivered") {
		return next({
			status: 400,
			message: "A delivered order cannot be changed",
		});
	}
	next({
		status: 400,
		message:
			"Order must have a status of pending, preparing, out-for-delivery, delivered",
	});
}

// Checks if order data has 'status' of "pending" to be valid for deletion. Returns '400' if not
function statusIsPending(req, res, next) {
	const status = res.locals.order.status;
	if (status === "pending") {
		return next();
	}
	next({
		status: 400,
		message: "An order cannot be deleted unless it is pending",
	});
}

/* --- Routes --- */

// GET /orders
function list(req, res) {
	res.json({ data: orders });
}

// POST /orders
function create(req, res) {
	const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
	const newOrder = {
		id: nextId(),
		deliverTo,
		mobileNumber,
		status,
		dishes,
	};
	orders.push(newOrder);
	res.status(201).json({ data: newOrder });
}

// GET /orders/:orderId
function read(req, res) {
	res.json({ data: res.locals.order });
}

// PUT /orders/:orderId
function update(req, res) {
	const order = res.locals.order;
	const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

	order.deliverTo = deliverTo;
	order.mobileNumber = mobileNumber;
	order.status = status;
	order.dishes = dishes;

	res.json({ data: order });
}

// DELETE /orders/:orderId
function destroy(req, res) {
	const index = orders.findIndex((order) => order.id === res.locals.order.id);
	const deletedOrders = orders.splice(index, 1);
	res.sendStatus(204);
}

module.exports = {
	create: [
		bodyDataHasDeliverTo,
		bodyDataHasMobileNumber,
		bodyDataHasDishes,
		dishesHaveQuantity,
		create,
	],
	read: [orderExists, read],
	update: [
		orderExists,
		bodyDataHasDeliverTo,
		bodyDataHasMobileNumber,
		bodyDataHasDishes,
		bodyDataHasStatus,
		dishesHaveQuantity,
		idMatches,
		update,
	],
	delete: [orderExists, statusIsPending, destroy],
	list,
};
