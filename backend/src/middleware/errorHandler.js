import logger from './logger.js';

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    if (err.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        message = 'A record with this information already exists.';
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        statusCode = 400;
        message = 'Referenced record does not exist.';
    }

    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token.';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token has expired.';
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File size exceeds the maximum allowed size.';
    }

    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

const notFound = (req, res, next) => {
    const err = new Error(`Route not found: ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
};

export { errorHandler, notFound };