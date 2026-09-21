const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!["admin", "staff", "fm", "security"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin panel access required",
    });
  }

  next();
};

export default adminMiddleware;
