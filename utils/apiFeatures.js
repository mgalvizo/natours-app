class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        // Exclude some query params from the string
        const queryObject = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        // delete the property from the query object
        excludedFields.forEach(el => delete queryObject[el]);

        // Convert query to String
        let queryString = JSON.stringify(queryObject);
        // Replace the operator in the string with the corresponding MongoDB operator
        // so it is the same as a filter object
        queryString = queryString.replace(
            /\b(gte|gt|lt|lte)\b/g,
            match => `$${match}`
        );

        // Use the filter object to build the query
        this.query = this.query.find(JSON.parse(queryString));

        return this;
    }

    sort() {
        if (this.queryString.sort) {
            // Separate the string by "," then join it with white space
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            // Default sort string
            this.query = this.query.sort('_id');
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            // Exclude fields
            this.query = this.query.select('-__v');
        }
        return this;
    }

    paginate() {
        const page = Number(this.queryString.page) || 1; // First page
        const limit = Number(this.queryString.limit) || 100; // 100 pages per page
        // number of results to skip, the ones that are before the page we are requesting
        const skip = limit * (page - 1);

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;
