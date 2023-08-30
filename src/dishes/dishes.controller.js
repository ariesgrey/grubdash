const path = require("path");
const dishes = require(path.resolve("src/data/dishes-data"));
const nextId = require("../utils/nextId");

/* --- Validation middleware --- */

// Checks if dish data has 'name'. Returns '400' if not
function bodyDataHasName(req, res, next) {
	const { data: { name } = {} } = req.body;
	if (name) {
		return next();
	}
	next({
		status: 400,
		message: "Dish must include a name",
	});
}

// Checks if dish data has 'description'. Returns '400' if not
function bodyDataHasDescription(req, res, next) {
	const { data: { description } = {} } = req.body;
	if (description) {
		return next();
	}
	next({
		status: 400,
		message: "Dish must include a description",
	});
}

// Checks if dish data has 'price', and if it's a number that's greater than 0. Returns '400' if not
function bodyDataHasPrice(req, res, next) {
	const { data: { price } = {} } = req.body;
	if (typeof price === "number" && price > 0) {
		return next();
	} else if (typeof price !== "number" || price <= 0) {
		return next({
			status: 400,
			message: "Dish must have a price that is an integer greater than 0",
		});
	}
	next({
		status: 400,
		message: "Dish must include a price",
	});
}

// Checks if dish data has 'image_url'. Returns '400' if not
function bodyDataHasImageUrl(req, res, next) {
	const { data: { image_url } = {} } = req.body;
	if (image_url) {
		return next();
	}
	next({
		status: 400,
		message: "Dish must include an image_url",
	});
}

// Checks if dish with given id exists within dishes-data. Returns '404' if not
function dishExists(req, res, next) {
	const { dishId } = req.params;
	const foundDish = dishes.find((dish) => dish.id === dishId);
	if (foundDish) {
		res.locals.dish = foundDish;
		return next();
	}
	next({
		status: 404,
		message: `Dish does not exist: ${dishId}`,
	});
}

// Checks if dish data has 'id', and if it matches 'id' within route. Returns '400' only if it's included but doesn't match
function idMatches(req, res, next) {
	const { data: { id } = {} } = req.body;
	const routeId = res.locals.dish.id;
	if (id && id !== routeId) {
		return next({
			status: 400,
			message: `Dish id does not match route id. Dish: ${id}, Route: ${routeId}`,
		});
	}
	next();
}

/* --- Routes --- */

// GET /dishes
function list(req, res) {
	res.json({ data: dishes });
}

// POST /dishes
function create(req, res) {
	const { data: { name, description, price, image_url } = {} } = req.body;
	const newDish = {
		id: nextId(),
		name,
		description,
		price,
		image_url,
	};
	dishes.push(newDish);
	res.status(201).json({ data: newDish });
}

// GET /dishes/:dishId
function read(req, res) {
	res.json({ data: res.locals.dish });
}

// PUT /dishes/:dishId
function update(req, res, next) {
	const dish = res.locals.dish;
	const { data: { name, description, price, image_url } = {} } = req.body;

	dish.name = name;
	dish.description = description;
	dish.price = price;
	dish.image_url = image_url;

	res.json({ data: dish });
}

module.exports = {
	create: [
		bodyDataHasName,
		bodyDataHasDescription,
		bodyDataHasPrice,
		bodyDataHasImageUrl,
		create,
	],
	read: [dishExists, read],
	update: [
		dishExists,
		bodyDataHasName,
		bodyDataHasDescription,
		bodyDataHasPrice,
		bodyDataHasImageUrl,
		idMatches,
		update,
	],
	list,
};
