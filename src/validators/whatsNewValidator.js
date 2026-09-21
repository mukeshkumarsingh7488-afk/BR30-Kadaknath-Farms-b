const allowedRoles = ["all", "admin", "staff", "fm", "security", "customer"];

const allowedMediaTypes = ["none", "image", "video"];

const allowedDisplayModes = ["every_login", "once", "until_explored", "once_per_version"];

const isValidString = (value, maxLength) => {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
};

const validateMedia = (media) => {
  if (media === undefined || media === null) {
    return null;
  }

  if (typeof media !== "object" || Array.isArray(media)) {
    return "Media must be an object";
  }

  if (media.type !== undefined && !allowedMediaTypes.includes(media.type)) {
    return "Invalid media type";
  }

  if (media.url !== undefined && typeof media.url !== "string") {
    return "Media URL must be a string";
  }

  if (media.poster !== undefined && typeof media.poster !== "string") {
    return "Media poster must be a string";
  }

  if (media.autoplay !== undefined && typeof media.autoplay !== "boolean") {
    return "Media autoplay must be boolean";
  }

  if (media.muted !== undefined && typeof media.muted !== "boolean") {
    return "Media muted must be boolean";
  }

  if (media.controls !== undefined && typeof media.controls !== "boolean") {
    return "Media controls must be boolean";
  }

  if (media.loop !== undefined && typeof media.loop !== "boolean") {
    return "Media loop must be boolean";
  }

  if (media.playsInline !== undefined && typeof media.playsInline !== "boolean") {
    return "Media playsInline must be boolean";
  }

  if (media.volume !== undefined && (typeof media.volume !== "number" || media.volume < 0 || media.volume > 1)) {
    return "Media volume must be between 0 and 1";
  }

  return null;
};

const validateWhatsNewBody = (req, res, next) => {
  try {
    const body = req.body || {};

    if (!isValidString(body.title, 150)) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be 150 characters or less",
      });
    }

    if (!isValidString(body.version, 30)) {
      return res.status(400).json({
        success: false,
        message: "Version is required",
      });
    }

    if (body.shortDescription !== undefined && typeof body.shortDescription !== "string") {
      return res.status(400).json({
        success: false,
        message: "Short description must be a string",
      });
    }

    if (body.description !== undefined && typeof body.description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    if (body.targetRoles !== undefined && (!Array.isArray(body.targetRoles) || body.targetRoles.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "targetRoles must be a non-empty array",
      });
    }

    if (Array.isArray(body.targetRoles)) {
      const invalidRole = body.targetRoles.find((role) => !allowedRoles.includes(role));

      if (invalidRole) {
        return res.status(400).json({
          success: false,
          message: `Invalid target role: ${invalidRole}`,
        });
      }
    }

    if (body.displayMode !== undefined && !allowedDisplayModes.includes(body.displayMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid display mode",
      });
    }

    const mediaError = validateMedia(body.media);

    if (mediaError) {
      return res.status(400).json({
        success: false,
        message: mediaError,
      });
    }

    if (body.order !== undefined && (!Number.isInteger(body.order) || body.order < 0)) {
      return res.status(400).json({
        success: false,
        message: "Order must be a positive integer or zero",
      });
    }

    if (body.published !== undefined && typeof body.published !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Published must be boolean",
      });
    }

    if (body.active !== undefined && typeof body.active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Active must be boolean",
      });
    }

    if (body.cta !== undefined) {
      if (typeof body.cta !== "object" || Array.isArray(body.cta)) {
        return res.status(400).json({
          success: false,
          message: "CTA must be an object",
        });
      }

      if (body.cta.enabled !== undefined && typeof body.cta.enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "CTA enabled must be boolean",
        });
      }

      if (body.cta.text !== undefined && typeof body.cta.text !== "string") {
        return res.status(400).json({
          success: false,
          message: "CTA text must be a string",
        });
      }

      if (body.cta.route !== undefined && typeof body.cta.route !== "string") {
        return res.status(400).json({
          success: false,
          message: "CTA route must be a string",
        });
      }
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }
};

export { validateWhatsNewBody, allowedRoles, allowedMediaTypes, allowedDisplayModes };
