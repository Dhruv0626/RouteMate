/**
 * Role-Based Access Control (RBAC) Middleware
 * Usage: router.get("/admin-only", authMiddleware, authorizeRoles("admin"), handler)
 */
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Please log in first."
            });
        }

        // Automatically allow superadmin if admin role is required
        const roles = [...allowedRoles];
        if (roles.includes("admin") && !roles.includes("superadmin")) {
            roles.push("superadmin");
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access denied.`
            });
        }

        next();
    };
};

/**
 * Middlewares for SuperAdmin and Admin separation
 */
export const isAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    
    if (req.user.role === "admin" || req.user.role === "superadmin") {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required."
    });
};

export const isSuperAdmin = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    
    if (req.user.role === "superadmin") {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        message: "Forbidden: SuperAdmin access required."
    });
};

export default authorizeRoles;
