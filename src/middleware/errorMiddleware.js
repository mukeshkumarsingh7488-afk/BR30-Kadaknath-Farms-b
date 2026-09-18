const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : err.message || "Something went wrong",
  });
};

export default errorMiddleware;
