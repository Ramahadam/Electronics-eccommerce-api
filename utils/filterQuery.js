exports.filterQuery = (reqQuery) => {
  let filter = {};

  // Text search
  if (reqQuery.q) {
    filter.$text = { $search: reqQuery.q };
  }

  // category filter
  if (reqQuery.category) {
    filter.category = reqQuery.category;
  }
  // category filter
  if (reqQuery.brand) {
    filter.brand = reqQuery.brand;
  }

  // min/max price
  if (reqQuery.minPrice || reqQuery.maxPrice) {
    filter.price = {};
    if (reqQuery.minPrice) filter.price.$gte = Number(reqQuery.minPrice);
    if (reqQuery.maxPrice) filter.price.$lte = Number(reqQuery.maxPrice);
  }

  // Sort
  let sort = {};
  if (reqQuery.sort) {
    // comma separated fields, e.g., sort=price,avgRatings
    reqQuery.sort.split(',').forEach((field) => {
      sort[field] = 1; // ascending by default
    });
  }

  return { filter, sort };
};
