/**
 * Custom request validation middleware.
 * Provides lightweight schema-based validation for request body, query, and params
 * without external dependency overhead.
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const targets = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    for (const [targetKey, targetSchema] of Object.entries(schema)) {
      const data = targets[targetKey] || {};
      for (const [field, rules] of Object.entries(targetSchema)) {
        const val = data[field];

        // 1. Required check
        if (rules.required && (val === undefined || val === null || val === "")) {
          errors.push({ field, message: `${field} is required` });
          continue;
        }

        if (val !== undefined && val !== null && val !== "") {
          // 2. Type checks
          if (rules.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(val))) {
              errors.push({ field, message: `${field} must be a valid email address` });
            }
          } else if (rules.type === "number") {
            if (isNaN(Number(val))) {
              errors.push({ field, message: `${field} must be a number` });
            }
          } else if (rules.type === "date") {
            if (isNaN(Date.parse(val))) {
              errors.push({ field, message: `${field} must be a valid date` });
            }
          }

          // 3. Min/Max checks
          if (rules.minLength && String(val).length < rules.minLength) {
            errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
          }

          // 4. Enum validation
          if (rules.enum && !rules.enum.includes(val)) {
            errors.push({ field, message: `${field} must be one of: ${rules.enum.join(", ")}` });
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
};

module.exports = { validate };
