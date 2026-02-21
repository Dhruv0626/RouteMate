/**
 * Role-Based Access Control (RBAC) Middleware
 * Usage: router.get("/admin-only", authMiddleware, authorizeRoles("admin"), handler)
 *        router.get("/drivers",    authMiddleware, authorizeRoles("admin", "driver"), handler)
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please log in first."
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access denied. Required role(s): ${allowedRoles.join(", ")}`
            });
        }

        next();
    };
};

export default authorizeRoles;
