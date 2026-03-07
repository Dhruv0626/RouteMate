/**
 * Validates an email address against a comprehensive regex.
 * This regex is designed to be highly permissive to match various international
 * and modern email formats while ensuring basic structure.
 */
export const validateEmail = (email) => {
    if (!email) return "Email is required";

    // Highly permissive email regex
    const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
        return "email is not validate";
    }
    return null;
};

/**
 * Common validation rules for other fields
 */
export const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain a number";
    return null;
};

export const validatePhone = (phone) => {
    if (!phone) return "Phone number is required";
    if (!/^\d{10}$/.test(phone)) return "Phone number must be 10 digits";
    return null;
};

export const validateName = (name) => {
    if (!name) return "Name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    return null;
};
